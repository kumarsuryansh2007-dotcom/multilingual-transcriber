"use client";

import type { TranscriptSegment } from "@/types/transcript";

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
}

const SPEAKER_STYLES = [
  "bg-emerald-100 text-emerald-900",
  "bg-sky-100 text-sky-900",
  "bg-amber-100 text-amber-900",
  "bg-violet-100 text-violet-900",
  "bg-rose-100 text-rose-900",
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function TranscriptViewer({ segments }: TranscriptViewerProps) {
  const uniqueSpeakers = Array.from(new Set(segments.map((s) => s.speaker)));
  const uniqueLanguages = Array.from(new Set(segments.map((s) => s.language)));

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4 mb-4">
        <h2 className="text-xl font-semibold text-neutral-900">Speaker Transcript</h2>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">
            {uniqueSpeakers.length} {uniqueSpeakers.length === 1 ? "Speaker" : "Speakers"}
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">
            Languages: {uniqueLanguages.join(", ")}
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">
            {segments.length} Segments
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {segments.map((seg) => {
          const speakerIdx = uniqueSpeakers.indexOf(seg.speaker);
          const badgeClass = SPEAKER_STYLES[speakerIdx % SPEAKER_STYLES.length];

          return (
            <div
              key={seg.id}
              className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                  {seg.speaker}
                </span>
                <span className="rounded-md bg-white border border-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {seg.language}
                </span>
                <span className="ml-auto text-xs font-mono text-neutral-500">
                  {formatTime(seg.start)} - {formatTime(seg.end)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-neutral-800">{seg.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}