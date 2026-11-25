"use client";

import React, { useState, useRef } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AudioUploader } from "@/components/AudioUploader";
import { AudioPlayer } from "@/components/AudioPlayer";
import { PipelineStatus } from "@/components/PipelineStatus";
import { TranscriptViewer } from "@/components/TranscriptViewer";
import { fetchJobStatus, uploadAudioForTranscription } from "@/lib/api";
import { JobStatus, TranscriptSegment } from "@/types/transcript";

export default function MultilingualTranscriptionDashboard() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [languageHint, setLanguageHint] = useState<string>("auto");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setSegments([]);
    setStatus("idle");
  };

  const handleFileClear = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setSegments([]);
    setStatus("idle");
    setErrorMsg(null);
  };

  const handleStartTranscription = async () => {
    if (!audioFile) return;
    setErrorMsg(null);
    setStatus("queued");

    try {
      const { job_id } = await uploadAudioForTranscription(audioFile, languageHint);

      const poll = async () => {
        const data = await fetchJobStatus(job_id);
        setStatus(data.status);

        if (data.status === "completed") {
          setSegments(data.segments);
          return;
        }
        if (data.status === "failed") {
          setErrorMsg(data.error || "Transcription failed on the server.");
          return;
        }
        setTimeout(poll, 2000);
      };

      await poll();
    } catch (err) {
      setStatus("failed");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Could not reach backend API. Make sure FastAPI is running on port 8000."
      );
    }
  };

  const handleSelectSegment = (segment: TranscriptSegment) => {
    setActiveSegmentId(segment.id);
    if (audioRef.current) {
      audioRef.current.currentTime = segment.start;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const isBusy =
    status === "queued" ||
    status === "normalizing" ||
    status === "diarizing" ||
    status === "transcribing";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#262626] p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#10594A]">
              Multilingual Conversation Transcriber
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Upload an audio recording to detect speakers, identify languages per turn, and generate timestamped transcripts.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-[#10594A] border border-emerald-200 self-start">
            Audio-Only Mode (.mp3, .wav, .m4a, .ogg, .flac)
          </span>
        </header>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <AudioUploader
            audioFile={audioFile}
            onFileSelect={handleFileSelect}
            onFileClear={handleFileClear}
            onValidationError={(msg) => setErrorMsg(msg)}
          />

          {audioFile && (
            <div className="space-y-4">
              <AudioPlayer
                audioUrl={audioUrl}
                audioRef={audioRef}
                onPlayStateChange={setIsPlaying}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    Conversation Mode:
                  </label>
                  <select
                    value={languageHint}
                    onChange={(e) => setLanguageHint(e.target.value)}
                    disabled={isBusy}
                    className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#10594A]"
                  >
                    <option value="auto">Auto-Detect Per Turn (Multilingual)</option>
                    <option value="en-hi">Bilingual: English + Hindi (Hinglish)</option>
                    <option value="en-kn">Bilingual: English + Kannada</option>
                    <option value="en-es">Bilingual: English + Spanish</option>
                  </select>
                </div>

                <button
                  onClick={handleStartTranscription}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center gap-2 bg-[#10594A] hover:bg-[#065C43] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Transcribe Conversation"
                  )}
                </button>
              </div>
            </div>
          )}

          <PipelineStatus status={status} />

          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </section>

        <TranscriptViewer
          segments={segments}
          activeSegmentId={activeSegmentId}
          isPlaying={isPlaying}
          filename={audioFile?.name || "transcript"}
          onSelectSegment={handleSelectSegment}
        />
      </div>
    </div>
  );
}
