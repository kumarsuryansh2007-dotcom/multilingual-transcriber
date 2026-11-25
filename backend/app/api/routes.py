import uuid
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.models.schemas import JobStatusResponse
from app.services.audio_processor import validate_audio_file
from app.services.job_store import job_store
from app.services.transcriber import run_transcription_pipeline

router = APIRouter(prefix="/api", tags=["transcription"])


@router.post("/transcribe")
async def create_transcription_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = Form("auto"),
    summary_language: str = Form("en"),
):
    ext = validate_audio_file(file.filename or "", file.content_type or "")
    job_id = str(uuid.uuid4())
    raw_path = settings.UPLOAD_DIR / f"{job_id}{ext}"

    # Stream upload to disk in 1 MB chunks for long recordings
    with raw_path.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    job_store.create_job(job_id)
    background_tasks.add_task(
        run_transcription_pipeline,
        job_id,
        raw_path,
        language,
        summary_language,
    )
    return {"job_id": job_id, "status": "queued"}


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job