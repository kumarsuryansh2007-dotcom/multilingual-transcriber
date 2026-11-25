from typing import List, Optional
from pydantic import BaseModel


class TranscriptSegment(BaseModel):
    id: str
    speaker: str
    language: str
    start: float
    end: float
    text: str


class SummaryResult(BaseModel):
    title: str
    overview: str
    key_takeaways: List[str]
    action_items: List[str]
    speaker_highlights: List[str]


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    error: Optional[str] = None
    segments: List[TranscriptSegment] = []
    summary: Optional[SummaryResult] = None