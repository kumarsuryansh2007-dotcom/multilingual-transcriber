from threading import Lock
from typing import Dict, List, Optional

from app.models.schemas import JobStatusResponse, SummaryResult, TranscriptSegment


class JobStore:
    def __init__(self) -> None:
        self._jobs: Dict[str, JobStatusResponse] = {}
        self._lock = Lock()

    def create_job(self, job_id: str) -> None:
        with self._lock:
            self._jobs[job_id] = JobStatusResponse(
                job_id=job_id,
                status="queued",
                progress=0,
            )

    def update_status(
        self,
        job_id: str,
        status: str,
        error: Optional[str] = None,
        progress: Optional[int] = None,
    ) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.status = status
            if error is not None:
                job.error = error
            if progress is not None:
                job.progress = progress

    def set_result(
        self,
        job_id: str,
        segments: List[TranscriptSegment],
        summary: Optional[SummaryResult] = None,
    ) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.segments = segments
            job.summary = summary
            job.status = "completed"
            job.progress = 100

    def get_job(self, job_id: str) -> Optional[JobStatusResponse]:
        with self._lock:
            return self._jobs.get(job_id)


job_store = JobStore()