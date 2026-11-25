import json
from pathlib import Path
from typing import List, Optional

from app.core.config import settings
from app.models.schemas import TranscriptSegment
from app.services.audio_processor import normalize_to_wav_16k
from app.services.job_store import job_store

SAMPLE_RATE = 16000

# Cached model instances (loaded once, reused across uploads)
_whisper_model = None
_diarize_model = None


def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisperx

        _whisper_model = whisperx.load_model(
            settings.WHISPER_MODEL,
            device=settings.DEVICE,
            compute_type=settings.COMPUTE_TYPE,
            asr_options={"beam_size": 1},  # Greedy decoding: ~2-3x faster on CPU
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


def run_transcription_pipeline(job_id: str, raw_audio_path: Path, language_hint: str = "auto") -> None:
    try:
        # Stage 1: Normalize Audio
        job_store.update_status(job_id, "normalizing")
        wav_path = settings.UPLOAD_DIR / f"{job_id}_16k.wav"
        normalize_to_wav_16k(raw_audio_path, wav_path)

        import whisperx

        audio = whisperx.load_audio(str(wav_path))
        segments: List[TranscriptSegment] = []

        has_hf_token = bool(settings.HF_TOKEN and settings.HF_TOKEN != "your_huggingface_token_here")

        if has_hf_token:
            # Stage 2: Speaker Diarization FIRST (cached)
            job_store.update_status(job_id, "diarizing")
            diarize_model = _get_diarize_model()
            diarize_df = diarize_model(audio)
            turns = _merge_speaker_turns(diarize_df)

            # Stage 3: Transcribe each speaker turn (cached)
            job_store.update_status(job_id, "transcribing")
            model = _get_whisper_model()

            for turn in turns:
                start_sample = max(0, int(turn["start"] * SAMPLE_RATE))
                end_sample = min(len(audio), int(turn["end"] * SAMPLE_RATE))

                if (end_sample - start_sample) < int(0.4 * SAMPLE_RATE):
                    continue

                turn_audio = audio[start_sample:end_sample]
                turn_result = model.transcribe(turn_audio, batch_size=4)
                turn_text = " ".join(
                    str(s.get("text", "")).strip() for s in turn_result.get("segments", [])
                ).strip()

                if not turn_text:
                    continue

                turn_lang = (turn_result.get("language") or "UN").upper()
                segments.append(
                    TranscriptSegment(
                        id=f"seg-{len(segments) + 1}",
                        speaker=turn["speaker"],
                        language=turn_lang,
                        start=round(turn["start"], 2),
                        end=round(turn["end"], 2),
                        text=turn_text,
                    )
                )
        else:
            job_store.update_status(job_id, "transcribing")
            model = _get_whisper_model()
            result = model.transcribe(audio, batch_size=8)
            detected_lang = (result.get("language") or "UN").upper()

            for idx, seg in enumerate(result.get("segments", []), start=1):
                segments.append(
                    TranscriptSegment(
                        id=f"seg-{idx}",
                        speaker="SPEAKER_00",
                        language=detected_lang,
                        start=round(float(seg.get("start", 0.0)), 2),
                        end=round(float(seg.get("end", 0.0)), 2),
                        text=str(seg.get("text", "")).strip(),
                    )
                )

        out_json = settings.OUTPUT_DIR / f"{job_id}.json"
        out_json.write_text(
            json.dumps([s.model_dump() for s in segments], indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        job_store.set_result(job_id, segments)

    except Exception as exc:
        job_store.update_status(job_id, "failed", error=str(exc))