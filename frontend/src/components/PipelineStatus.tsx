"use client";

import React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { JobStatus } from "@/types/transcript";

const STEPS: { key: JobStatus; label: string }[] = [
  { key: "normalizing", label: "Normalizing Audio (16kHz WAV)" },
  { key: "diarizing", label: "Speaker Diarization" },
  { key: "transcribing", label: "Multilingual Transcription" },
];

export function PipelineStatus({ status }: { status: JobStatus }) {
  if (status === "idle" || status === "completed" || status === "failed") {
    return null;
  }

  const activeIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-4">
        {STEPS.map((step, idx) => {
          const isDone = activeIdx > idx;
          const isCurrent = activeIdx === idx || (status === "queued" && idx === 0);
          return (
            <div key={step.key} className="flex items-center gap-2 text-xs font-medium">
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-[#10594A]" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-[#10594A] animate-spin" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-slate-300 inline-block" />
              )}
              <span className={isCurrent || isDone ? "text-slate-900" : "text-slate-400"}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
