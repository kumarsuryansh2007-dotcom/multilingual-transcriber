"use client";

import type { SummaryResult } from "@/types/transcript";

interface SummaryCardProps {
    summary: SummaryResult;
}

export default function SummaryCard({ summary }: SummaryCardProps) {
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5">
            <div className="border-b border-neutral-100 pb-4">
                <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 mb-2">
                    AI Summary
                </span>
                <h2 className="text-2xl font-semibold text-neutral-900">{summary.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">{summary.overview}</p>
            </div>

            {summary.key_takeaways.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                        Key Takeaways
                    </h3>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-neutral-800">
                        {summary.key_takeaways.map((item, idx) => (
                            <li key={idx}>{item}</li>
                        ))}
                    </ul>
                </div>
            )}

            {summary.action_items.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                        Action Items
                    </h3>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-neutral-800">
                        {summary.action_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                        ))}
                    </ul>
                </div>
            )}

            {summary.speaker_highlights.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                        Speaker Highlights
                    </h3>
                    <ul className="space-y-2 text-sm text-neutral-800">
                        {summary.speaker_highlights.map((item, idx) => (
                            <li
                                key={idx}
                                className="rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}