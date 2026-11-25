"use client";

import React from "react";
import { Play, Pause, Download, Users, Globe, CheckCircle2 } from "lucide-react";
import { TranscriptSegment } from "@/types/transcript";

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  activeSegmentId: string | null;
  isPlaying: boolean;
  filename: string;
  onSelectSegment: (segment: TranscriptSegment) => void;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function TranscriptViewer({
  segments,
  activeSegmentId,
  isPlaying,
  filename,
  onSelectSegment,
}: TranscriptViewerProps) {
  if (!segments.length) return null;

  const uniqueSpeakers = new Set(segments.map((s) => s.speaker)).size;
  const uniqueLanguages = Array.from(new Set(segments.map((s) => s.language)));

  const exportTranscript = (format: "json" | "txt") => {
    const content =
      format === "json"
        ? JSON.stringify({ file: filename, segments }, null, 2)
        : segments
            .map(
              (s) =>
                `[${formatTimestamp(s.start)} - ${formatTimestamp(s.end)}] ${s.speaker} (${s.language}): ${s.text}`
            )
            .join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename.replace(/\.[^/.]+$/, "") || "transcript"}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-[#10594A]" />
            <span className="font-semibold">{uniqueSpeakers}</span>
            <span className="text-slate-500">Speakers Detected</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-[#10594A]" />
            <span className="font-semibold">{uniqueLanguages.join(", ")}</span>
            <span className="text-slate-500">Languages</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTranscript("txt")}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export .TXT
          </button>
          <button
            onClick={() => exportTranscript("json")}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export .JSON
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {segments.map((seg) => {
          const isActive = activeSegmentId === seg.id;
          return (
            <div
              key={seg.id}
              onClick={() => onSelectSegment(seg)}
              className={`p-4 rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? "border-[#10594A] bg-emerald-50/40"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-slate-800 text-white">
                    {seg.speaker}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-[#10594A]">
                    {seg.language}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500">
                  {isActive && isPlaying ? (
                    <Pause className="w-3 h-3 text-[#10594A]" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  {formatTimestamp(seg.start)} – {formatTimestamp(seg.end)}
                </span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed">{seg.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
