from typing import List, Optional
import requests

from app.core.config import settings
from app.models.schemas import SummaryResult, TranscriptSegment

SUMMARY_LANG_NAMES = {
    "en": "English",
    "hi": "Hindi (Devanagari script)",
    "kn": "Kannada (Kannada script)",
    "same": "the primary language used in the transcript",
}

MAX_CHUNK_CHARS = 12000


def _ollama_chat(prompt: str, json_schema: Optional[dict] = None) -> str:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "keep_alive": 0,
        "options": {
            "temperature": 0.1,
            "num_ctx": 8192,
        },
    }
    if json_schema is not None:
        payload["format"] = json_schema

    resp = requests.post(
        f"{settings.OLLAMA_URL}/api/chat",
        json=payload,
        timeout=300,
    )
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def _split_into_chunks(lines: List[str], max_chars: int = MAX_CHUNK_CHARS) -> List[str]:
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for line in lines:
        if current and current_len + len(line) + 1 > max_chars:
            chunks.append("\n".join(current))
            current = [line]
            current_len = len(line)
        else:
            current.append(line)
            current_len += len(line) + 1

    if current:
        chunks.append("\n".join(current))
    return chunks


def summarize_transcript(
    segments: List[TranscriptSegment],
    summary_language: str = "en",
) -> Optional[SummaryResult]:
    if not segments:
        return None

    formatted_lines = [
        f"[{seg.start:.1f}s - {seg.end:.1f}s] {seg.speaker} ({seg.language}): {seg.text}"
        for seg in segments
    ]
    target_lang = SUMMARY_LANG_NAMES.get(summary_language, "English")
    chunks = _split_into_chunks(formatted_lines)

    # Map stage for long recordings
    if len(chunks) > 1:
        section_notes: List[str] = []
        for idx, chunk in enumerate(chunks, start=1):
            map_prompt = f"""You are summarizing part {idx} of {len(chunks)} of a speaker-labeled transcript (which may contain English, Hindi, Kannada, Hinglish, or Kanglish).
Extract concise bullet points preserving key concepts, decisions, action items, and who said what (keep SPEAKER_XX labels). Write notes in {target_lang}.

Transcript section:
{chunk}
"""
            section_notes.append(f"--- Part {idx} ---\n{_ollama_chat(map_prompt)}")
        source_material = "\n\n".join(section_notes)
    else:
        source_material = chunks[0]

    # Reduce / final structured JSON stage
    final_prompt = f"""You are an expert meeting and lecture summarizer fluent in English, Hindi, and Kannada (including Hinglish and Kanglish).

Analyze the content below and return ONLY valid JSON matching the required schema, written entirely in {target_lang}.

Field rules:
- title: Concise 4-8 word title capturing the main topic.
- overview: Clear 2-4 sentence executive summary.
- key_takeaways: 4-8 concrete bullet points covering core ideas, decisions, or facts.
- action_items: Specific tasks or next steps mentioned (empty list [] if none exist).
- speaker_highlights: One short bullet per speaker summarizing their main role or points (e.g., "SPEAKER_00: Explained the setup...").

Content:
{source_material}
"""
    raw_json = _ollama_chat(final_prompt, json_schema=SummaryResult.model_json_schema())
    return SummaryResult.model_validate_json(raw_json)