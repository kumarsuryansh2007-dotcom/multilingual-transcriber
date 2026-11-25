"use client";

import { useEffect, useRef, useState } from "react";
import SummaryCard from "@/components/SummaryCard";
import TranscriptViewer from "@/components/TranscriptViewer";
import type {
  ConversationLanguage,
  JobStatusResponse,
  SummaryLanguage,
} from "@/types/transcript";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg", ".flac"];

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued for processing...",
  normalizing: "Normalizing audio to 16 kHz mono WAV...",
  diarizing: "Detecting speakers (PyAnnote)...",
  transcribing: "Transcribing speech segments (WhisperX)...",
  summarizing: "Generating structured summary (Local Ollama)...",
  completed: "Completed",
  failed: "Failed",
};

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<ConversationLanguage>("auto");
  const [summaryLanguage, setSummaryLanguage] = useState<SummaryLanguage>("en");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

    if (file.type.startsWith("video/") || !isValidExt) {
      setSelectedFile(null);
      setErrorMsg("Only audio files (.mp3, .wav, .m4a, .ogg, .flac) are supported. Video files are not allowed.");
      return;
    }

    setSelectedFile(file);
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error(`Status check failed (${res.status})`);
      }

      const data: JobStatusResponse = await res.json();
      setJob(data);

      if (data.status === "completed") {
        setIsSubmitting(false);
        return;
      }

      if (data.status === "failed") {
        setIsSubmitting(false);
        setErrorMsg(data.error || "Transcription pipeline failed.");
        return;
      }

      pollTimerRef.current = setTimeout(() => pollJobStatus(jobId), 3000);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : "Lost connection to backend.");
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;

    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setErrorMsg(null);
    setJob(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("language", language);
      formData.append("summary_language", summaryLanguage);

      const res = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.detail || `Upload failed (${res.status})`);
      }

      const { job_id } = await res.json();
      setJob({ job_id, status: "queued", progress: 0, segments: [] });
      pollJobStatus(job_id);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : "Failed to start transcription.");
    }
  };

  const isProcessing =
    isSubmitting || (job !== null && job.status !== "completed" && job.status !== "failed");

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#10594A]">
            Multilingual Lecture & Meeting Summarizer
          </h1>
          <p className="text-sm text-neutral-600">
            Upload audio-only recordings for speaker diarization, multilingual transcription, and local AI summaries.
          </p>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-2">
              Audio File (.mp3, .wav, .m4a, .ogg, .flac)
            </label>
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.flac,audio/*"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="block w-full rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#10594A] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#065C43] disabled:opacity-50"
            />
            {selectedFile && (
              <p className="mt-2 text-xs text-neutral-500">
                Selected: <span className="font-medium text-neutral-800">{selectedFile.name}</span>{" "}
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1">
                Conversation Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as ConversationLanguage)}
                disabled={isProcessing}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-800 focus:border-[#10594A] focus:outline-none"
              >
                <option value="auto">Auto-Detect (Multilingual)</option>
                <option value="en">Single Language — English</option>
                <option value="hi">Single Language — Hindi (हिन्दी)</option>
                <option value="kn">Single Language — Kannada (ಕನ್ನಡ)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1">
                Summary Output Language
              </label>
              <select
                value={summaryLanguage}
                onChange={(e) => setSummaryLanguage(e.target.value as SummaryLanguage)}
                disabled={isProcessing}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-800 focus:border-[#10594A] focus:outline-none"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="same">Same as Conversation</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTranscribe}
            disabled={!selectedFile || isProcessing}
            className="w-full rounded-xl bg-[#10594A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#065C43] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "Processing Audio..." : "Transcribe & Summarize"}
          </button>

          {job && isProcessing && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-700">
                <span>{STATUS_LABELS[job.status] || job.status}</span>
                <span>{job.progress}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-[#10594A] transition-all duration-300"
                  style={{ width: `${Math.max(job.progress, 5)}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </section>

        {job?.status === "completed" && job.summary && <SummaryCard summary={job.summary} />}

        {job?.status === "completed" && job.segments.length > 0 && (
          <TranscriptViewer segments={job.segments} />
        )}
      </div>
    </main>
  );
}