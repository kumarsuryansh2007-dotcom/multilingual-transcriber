from typing import Dict, Optional
from app.models.schemas import JobStatusResponse, JobStatusType, TranscriptSegment


class InMemoryJobStore:
    def __init__(self) -> None:
        self._jobs: Dict[str, JobStatusResponse] = {}

    def create(self, job_id: str, filename: str) -> JobStatusResponse:
        job = JobStatusResponse(
            job_id=job_id,
            status="queued",
            filename=filename,
            segments=[],
        )
        self._jobs[job_id] = job
        return job

    def update_status(self, job_id: str, status: JobStatusType, error: Optional[str] = None) -> None:
        if job_id in self._jobs:
            self._jobs[job_id].status = status
            if error:
                self._jobs[job_id].error = error

    def set_result(self, job_id: str, segments: list[TranscriptSegment]) -> None:
        if job_id in self._jobs:
            self._jobs[job_id].segments = segments
            self._jobs[job_id].status = "completed"

    def get(self, job_id: str) -> Optional[JobStatusResponse]:
        return self._jobs.get(job_id)


job_store = InMemoryJobStore()
