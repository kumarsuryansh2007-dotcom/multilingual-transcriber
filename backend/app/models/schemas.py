from typing import List, Optional, Literal
from pydantic import BaseModel

JobStatusType = Literal[
    "queued", "normalizing", "diarizing", "transcribing", "completed", "failed"
]


class TranscriptSegment(BaseModel):
    id: str
    speaker: str
    language: str
    start: float
    end: float
    text: str


class TranscribeCreateResponse(BaseModel):
    job_id: str
    status: JobStatusType


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatusType
    filename: str
    error: Optional[str] = None
    segments: List[TranscriptSegment] = []
