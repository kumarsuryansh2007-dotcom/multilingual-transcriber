export type ConversationLanguage = "auto" | "en" | "hi" | "kn";
export type SummaryLanguage = "en" | "hi" | "kn" | "same";

export interface TranscriptSegment {
  id: string;
  speaker: string;
  language: string;
  start: number;
  end: number;
  text: string;
}

export interface SummaryResult {
  title: string;
  overview: string;
  key_takeaways: string[];
  action_items: string[];
  speaker_highlights: string[];
}

export interface JobStatusResponse {
  job_id: string;
  status: "queued" | "normalizing" | "diarizing" | "transcribing" | "summarizing" | "completed" | "failed";
  progress: number;
  error?: string | null;
  segments: TranscriptSegment[];
  summary?: SummaryResult | null;
}