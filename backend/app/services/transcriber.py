import gc
import json
from pathlib import Path
from typing import List, Optional

import torch

from app.core.config import settings
from app.models.schemas import TranscriptSegment
from app.services.audio_processor import normalize_to_wav_16k
from app.services.job_store import job_store
from app.services.summarizer import summarize_transcript

SAMPLE_RATE = 16000
SUPPORTED_SINGLE_LANGS = {"en", "hi", "kn"}

_whisper_model = None
_diarize_model = None


def _clear_gpu_cache() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisperx

        _whisper_model = whisperx.load_model(
            settings.WHISPER_MODEL,
            device=settings.DEVICE,
            compute_type=settings.COMPUTE_TYPE,
            asr_options={"beam_size": 1},
        )
    return _whisper_model


def _get_diarize_model():
    global _diarize_model
    if _diarize_model is None:
        from whisperx.diarize import DiarizationPipeline

        _diarize_model = DiarizationPipeline(
            token=settings.HF_TOKEN,
            device=settings.DEVICE,
        )
    return _diarize_model


def _merge_speaker_turns(diarize_df, max_gap: float = 1.5) -> list[dict]:
    """Merge consecutive pyannote segments from the same speaker."""
    merged: list[dict] = []
    for _, row in diarize_df.sort_values("start").iterrows():
        speaker = str(row["speaker"])
        start = float(row["start"])
        end = float(row["end"])

        if merged and merged[-1]["speaker"] == speaker and (start - merged[-1]["end"]) <= max_gap:
            merged[-1]["end"] = max(merged[-1]["end"], end)
        else:
            merged.append({"speaker": speaker, "start": start, "end": end})
    return merged


def run_transcription_pipeline(
    job_id: str,
    raw_audio_path: Path,
    language_hint: str = "auto",
    summary_language: str = "en",
) -> None:
    wav_path = settings.UPLOAD_DIR / f"{job_id}_16k.wav"

    try:
        # Stage 1: Normalize Audio (16kHz Mono WAV)
        job_store.update_status(job_id, "normalizing", progress=5)
        normalize_to_wav_16k(raw_audio_path, wav_path)

        import whisperx

        audio = whisperx.load_audio(str(wav_path))
        segments: List[TranscriptSegment] = []

        forced_lang: Optional[str] = (
            language_hint.lower() if language_hint.lower() in SUPPORTED_SINGLE_LANGS else None
        )
        batch_size = 16 if settings.DEVICE == "cuda" else 4
        has_hf_token = bool(settings.HF_TOKEN and settings.HF_TOKEN != "your_huggingface_token_here")

        if has_hf_token:
            # Stage 2: Speaker Diarization FIRST
            job_store.update_status(job_id, "diarizing", progress=15)
            diarize_model = _get_diarize_model()
            diarize_df = diarize_model(audio)
            turns = _merge_speaker_turns(diarize_df)
            _clear_gpu_cache()

            # Stage 3: Transcribe each speaker turn
            job_store.update_status(job_id, "transcribing", progress=30)
            model = _get_whisper_model()
            total_turns = max(len(turns), 1)

            for idx, turn in enumerate(turns):
                start_sample = max(0, int(turn["start"] * SAMPLE_RATE))
                end_sample = min(len(audio), int(turn["end"] * SAMPLE_RATE))

                # Skip ultra-short noise bursts (under 0.4s)
                if (end_sample - start_sample) < int(0.4 * SAMPLE_RATE):
                    continue

                turn_audio = audio[start_sample:end_sample]
                turn_result = model.transcribe(
                    turn_audio,
                    batch_size=batch_size,
                    chunk_size=30,
                    language=forced_lang,
                )

                turn_lang = (forced_lang or turn_result.get("language") or "UN").upper()

                for sub_seg in turn_result.get("segments", []):
                    text = str(sub_seg.get("text", "")).strip()
                    if not text:
                        continue
                    seg_start = round(turn["start"] + float(sub_seg.get("start", 0.0)), 2)
                    seg_end = round(min(turn["end"], turn["start"] + float(sub_seg.get("end", 0.0))), 2)
                    segments.append(
                        TranscriptSegment(
                            id=f"seg-{len(segments) + 1}",
                            speaker=turn["speaker"],
                            language=turn_lang,
                            start=seg_start,
                            end=max(seg_start, seg_end),
                            text=text,
                        )
                    )

                pct = 30 + int(((idx + 1) / total_turns) * 55)
                job_store.update_status(job_id, "transcribing", progress=pct)
                if (idx + 1) % 25 == 0:
                    _clear_gpu_cache()
        else:
            job_store.update_status(job_id, "transcribing", progress=30)
            model = _get_whisper_model()
            result = model.transcribe(
                audio,
                batch_size=batch_size,
                chunk_size=30,
                language=forced_lang,
            )
            detected_lang = (forced_lang or result.get("language") or "UN").upper()

            for idx, seg in enumerate(result.get("segments", []), start=1):
                text = str(seg.get("text", "")).strip()
                if not text:
                    continue
                segments.append(
                    TranscriptSegment(
                        id=f"seg-{idx}",
                        speaker="SPEAKER_00",
                        language=detected_lang,
                        start=round(float(seg.get("start", 0.0)), 2),
                        end=round(float(seg.get("end", 0.0)), 2),
                        text=text,
                    )
                )

        _clear_gpu_cache()

        # Stage 4: Local LLM Summary via Ollama
        job_store.update_status(job_id, "summarizing", progress=90)
        summary = None
        try:
            summary = summarize_transcript(segments, summary_language=summary_language)
        except Exception as sum_err:
            print(f"[WARN] Summarization failed (transcript still saved): {sum_err}")

        out_json = settings.OUTPUT_DIR / f"{job_id}.json"
        out_json.write_text(
            json.dumps(
                {
                    "segments": [s.model_dump() for s in segments],
                    "summary": summary.model_dump() if summary else None,
                },
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        job_store.set_result(job_id, segments, summary=summary)

    except Exception as exc:
        job_store.update_status(job_id, "failed", error=str(exc))
    finally:
        # Clean up large temporary audio files to preserve Kaggle disk space
        wav_path.unlink(missing_ok=True)
        raw_audio_path.unlink(missing_ok=True)
        _clear_gpu_cache()