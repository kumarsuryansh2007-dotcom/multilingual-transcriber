from pathlib import Path
import ffmpeg
from fastapi import HTTPException

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac"}


def validate_audio_file(filename: str, content_type: str = "") -> str:
    ext = Path(filename).suffix.lower()

    if content_type.startswith("video/"):
        raise HTTPException(
            status_code=400,
            detail="Video files are not supported. Please upload an audio-only file (.mp3, .wav, .m4a, .ogg, .flac).",
        )

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext or 'unknown'}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
        )

    return ext


def normalize_to_wav_16k(input_path: Path, output_path: Path) -> Path:
    try:
        (
            ffmpeg.input(str(input_path))
            .output(str(output_path), ar=16000, ac=1, acodec="pcm_s16le")
            .overwrite_output()
            .run(quiet=True)
        )
    except ffmpeg.Error as exc:
        raise RuntimeError(f"FFmpeg audio normalization failed: {exc}") from exc

    return output_path