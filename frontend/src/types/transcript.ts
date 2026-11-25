export type JobStatus =
  | "idle"
  | "queued"
  | "normalizing"
  | "diarizing"
  | "transcribing"
  | "completed"
  | "failed";

export interface TranscriptSegment {
  id: string;
  speaker: string;
  language: string;
  start: number;
  end: number;
  text: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  filename: string;
  error?: string | null;
  segments: TranscriptSegment[];
}
