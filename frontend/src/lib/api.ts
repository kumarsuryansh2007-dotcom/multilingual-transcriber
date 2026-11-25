import { JobStatusResponse } from "@/types/transcript";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadAudioForTranscription(
  file: File,
  languageHint: string
): Promise<{ job_id: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language_hint", languageHint);

  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Failed to upload audio file");
  }

  return res.json();
}

export async function fetchJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch job status");
  }

  return res.json();
}
