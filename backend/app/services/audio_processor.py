from pathlib import Path
import ffmpeg
from fastapi import HTTPException, UploadFile

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac"}


def validate_audio_file(file: UploadFile) -> str:
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    content_type = (file.content_type or "").lower()

    if content_type.startswith("video/") or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only audio files (.mp3, .wav, .m4a, .ogg, .flac) are supported. Video files are not allowed.",
        )
    return ext


def normalize_to_wav_16k(input_path: Path, output_path: Path) -> Path:
    """Convert any supported audio format to 16kHz, 16-bit mono WAV."""
    (
        ffmpeg.input(str(input_path))
        .output(str(output_path), acodec="pcm_s16le", ac=1, ar="16000")
        .overwrite_output()
        .run(quiet=True)
    )
    return output_path
