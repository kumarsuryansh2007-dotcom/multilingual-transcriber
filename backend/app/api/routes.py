import uuid
import shutil
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.models.schemas import JobStatusResponse, TranscribeCreateResponse
from app.services.audio_processor import validate_audio_file
from app.services.job_store import job_store
from app.services.transcriber import run_transcription_pipeline

router = APIRouter(prefix="/api", tags=["transcription"])


@router.post("/transcribe", response_model=TranscribeCreateResponse)
async def create_transcription_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language_hint: str = Form("auto"),
):
    ext = validate_audio_file(file)
    job_id = str(uuid.uuid4())
    saved_path = settings.UPLOAD_DIR / f"{job_id}{ext}"

    with saved_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    job_store.create(job_id=job_id, filename=file.filename or f"audio{ext}")
    background_tasks.add_task(run_transcription_pipeline, job_id, saved_path, language_hint)

    return TranscribeCreateResponse(job_id=job_id, status="queued")


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_transcription_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
