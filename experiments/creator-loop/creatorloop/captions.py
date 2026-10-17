"""Captions: Pictory-style auto-captioning with word timings and Korean line rules.

Cues are built from the narration timings the TTS backend reports (edge-tts gives
true word boundaries; other backends fall back to a syllable-proportional model in
:func:`creatorloop.audio.estimate_word_timing`).  Output is both SRT (portable,
uploadable) and ASS (brand-styled burn-in for the local renderer).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

from .contracts import CaptionCue, Subtitles

KOREAN_MAX_CHARS = 26
LATIN_MAX_CHARS = 42
KOREAN_MAX_CPS = 12.0
LATIN_MAX_CPS = 17.0
MIN_CUE_S = 0.7
MAX_CUE_S = 5.0

ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
{styles}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

DEFAULT_STYLES: dict[str, dict[str, Any]] = {
    "standard": {"fontsize": 0.052, "primary": "&H00FFFFFF", "outline": "&H00000000", "back": "&H96000000", "bold": -1, "alignment": 2, "margin_v": 0.075, "outline_w": 3},
    "emphasis": {"fontsize": 0.064, "primary": "&H004EC1F2", "outline": "&H00000000", "back": "&H96000000", "bold": -1, "alignment": 2, "margin_v": 0.075, "outline_w": 4},
    "lower_third": {"fontsize": 0.044, "primary": "&H00FFFFFF", "outline": "&H00000000", "back": "&HC8000000", "bold": -1, "alignment": 1, "margin_v": 0.16, "outline_w": 2},
    "title_card": {"fontsize": 0.086, "primary": "&H0000D4FF", "outline": "&H00000000", "back": "&H00000000", "bold": -1, "alignment": 5, "margin_v": 0.0, "outline_w": 5},
}


@dataclass(slots=True)
class CaptionStyle:
    fontname: str = "NanumGothicExtraBold"
    width: int = 1920
    height: int = 1080
    accent_ass: str = "&H004EC1F2"
    styles: dict[str, dict[str, Any]] | None = None


def _is_korean(text: str) -> bool:
    return any("\uac00" <= ch <= "\ud7a3" for ch in text)


def limits_for(text: str) -> tuple[int, float]:
    if _is_korean(text):
        return KOREAN_MAX_CHARS, KOREAN_MAX_CPS
    return LATIN_MAX_CHARS, LATIN_MAX_CPS


def split_lines(text: str, max_chars: int) -> list[str]:
    """Greedy wrap on spaces; Korean eojeol are never broken mid-word."""

    words = text.split()
    if not words:
        return []
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        if len(current) + 1 + len(word) <= max_chars:
            current = f"{current} {word}"
        else:
            lines.append(current)
            current = word
    lines.append(current)
    if len(lines) > 2 and max_chars > 12:
        return split_lines(text, max_chars - 4)
    return lines[-2:] if len(lines) > 2 else lines


def build_cues(
    segments: Sequence[dict[str, Any]],
    *,
    style: str = "standard",
    max_chars: int | None = None,
    max_cps: float | None = None,
) -> list[CaptionCue]:
    cues: list[CaptionCue] = []
    index = 1
    for segment in segments:
        text = str(segment.get("text", "")).strip()
        if not text:
            continue
        words = segment.get("words") or []
        resolved_max_chars = max_chars or limits_for(text)[0]
        resolved_max_cps = max_cps or limits_for(text)[1]
        groups = _group_words(words, text, resolved_max_chars, resolved_max_cps)
        for group in groups:
            duration = max(group["end_s"] - group["start_s"], MIN_CUE_S)
            if duration > MAX_CUE_S:
                duration = MAX_CUE_S
            cue_style = style
            if group.get("emphasis"):
                cue_style = "emphasis"
            cues.append(
                CaptionCue(
                    index=index,
                    start_s=round(group["start_s"], 3),
                    end_s=round(group["start_s"] + duration, 3),
                    text=group["text"],
                    style=cue_style,
                    words=group.get("words", []),
                )
            )
            index += 1
    return cues


def _group_words(
    words: Sequence[dict[str, Any]],
    text: str,
    max_chars: int,
    max_cps: float,
) -> list[dict[str, Any]]:
    if not words:
        duration = max(len(text) / max(max_cps * 2, 1.0), MIN_CUE_S)
        return [{"text": text, "start_s": 0.0, "end_s": duration, "words": []}]
    groups: list[dict[str, Any]] = []
    current_words: list[dict[str, Any]] = []
    current_text = ""
    emphasis_markers = ("!", "?", "핵심", "중요", "꼭", "반드시")
    for word in words:
        token = str(word.get("word", "")).strip()
        if not token:
            continue
        candidate = f"{current_text} {token}".strip()
        start = float(word.get("start_s", 0.0))
        end = float(word.get("end_s", start + 0.2))
        span = end - (current_words[0]["start_s"] if current_words else start)
        too_long = len(candidate) > max_chars
        too_fast = span > 0 and len(candidate) / span > max_cps * 1.6
        if current_words and (too_long or too_fast):
            groups.append(_finalize_group(current_words, current_text))
            current_words, current_text = [], ""
        current_words.append(dict(word))
        current_text = f"{current_text} {token}".strip()
    if current_words:
        groups.append(_finalize_group(current_words, current_text))
    for group in groups:
        group["emphasis"] = any(marker in group["text"] for marker in emphasis_markers)
    if groups:
        for previous, following in zip(groups, groups[1:]):
            gap = following["start_s"] - previous["end_s"]
            if gap > 0:
                previous["end_s"] = min(previous["end_s"] + gap * 0.6, following["start_s"])
    return groups


def _finalize_group(words: list[dict[str, Any]], text: str) -> dict[str, Any]:
    return {
        "text": text,
        "start_s": float(words[0].get("start_s", 0.0)),
        "end_s": float(words[-1].get("end_s", words[0].get("start_s", 0.0) + 0.5)),
        "words": words,
    }


def _ass_time(seconds: float) -> str:
    seconds = max(seconds, 0.0)
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    rest = seconds - hours * 3600 - minutes * 60
    return f"{hours}:{minutes:02d}:{rest:05.2f}"


def write_srt(cues: Sequence[CaptionCue], path: Path | str) -> Path:
    lines: list[str] = []
    for cue in cues:
        lines.append(str(cue.index))
        lines.append(f"{_srt_time(cue.start_s)} --> {_srt_time(cue.end_s)}")
        lines.append("\n".join(split_lines(cue.text, limits_for(cue.text)[0])))
        lines.append("")
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text("\n".join(lines), "utf-8")
    return destination


def _srt_time(seconds: float) -> str:
    milliseconds = int(round((seconds - int(seconds)) * 1000))
    whole = int(seconds)
    return f"{whole // 3600:02d}:{(whole % 3600) // 60:02d}:{whole % 60:02d},{milliseconds:03d}"


def write_ass(cues: Sequence[CaptionCue], path: Path | str, style: CaptionStyle | None = None) -> Path:
    style = style or CaptionStyle()
    styles = {**DEFAULT_STYLES, **(style.styles or {})}
    rows = []
    for name, spec in styles.items():
        rows.append(
            "Style: "
            + ",".join(
                str(value)
                for value in (
                    name,
                    style.fontname,
                    int(style.height * float(spec["fontsize"])),
                    spec.get("primary", "&H00FFFFFF"),
                    spec.get("secondary", "&H000000FF"),
                    spec.get("outline", "&H00000000"),
                    spec.get("back", "&H96000000"),
                    spec.get("bold", -1),
                    0,
                    0,
                    0,
                    100,
                    100,
                    0,
                    0,
                    1,
                    int(spec.get("outline_w", 3)),
                    2,
                    int(spec.get("alignment", 2)),
                    int(style.width * 0.045),
                    int(style.width * 0.045),
                    int(style.height * float(spec.get("margin_v", 0.075))),
                    1,
                )
            )
        )
    events = [
        f"Dialogue: 0,{_ass_time(cue.start_s)},{_ass_time(cue.end_s)},{cue.style},,0,0,0,,{_ass_escape(cue.text)}"
        for cue in cues
    ]
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        ASS_HEADER.format(width=style.width, height=style.height, styles="\n".join(rows)) + "\n".join(events) + "\n",
        "utf-8",
    )
    return destination


def _ass_escape(text: str) -> str:
    return text.replace("\n", "\\N").replace("{", "(").replace("}", ")")


def build_subtitles(
    segments: Sequence[dict[str, Any]],
    *,
    language: str = "ko-KR",
    project_dir: Path | str,
    style: CaptionStyle | None = None,
) -> Subtitles:
    cues = build_cues(segments)
    destination = Path(project_dir)
    srt_path = write_srt(cues, destination / "subtitles.srt")
    ass_path = write_ass(cues, destination / "subtitles.ass", style)
    warnings: list[str] = []
    for cue in cues:
        max_chars, max_cps = limits_for(cue.text)
        span = max(cue.end_s - cue.start_s, 0.1)
        cps = len(cue.text.replace(" ", "")) / span
        if cps > max_cps * 1.25:
            warnings.append(f"cue {cue.index}: {cps:.1f} cps > {max_cps} (fast read)")
        if len(cue.text) > max_chars * 1.4:
            warnings.append(f"cue {cue.index}: {len(cue.text)} chars > {max_chars}")
    return Subtitles(
        language=language,
        cues=cues,
        srt_path=str(srt_path),
        ass_path=str(ass_path),
        max_chars_per_line=KOREAN_MAX_CHARS if language.startswith("ko") else LATIN_MAX_CHARS,
        max_cps=KOREAN_MAX_CPS if language.startswith("ko") else LATIN_MAX_CPS,
        reading_speed_warnings=warnings[:12],
    )


def highlight_candidates(
    segments: Sequence[dict[str, Any]],
    *,
    limit: int = 3,
    target_s: float = 45.0,
) -> list[dict[str, Any]]:
    """Pictory-style highlight extraction: rank narration spans for Shorts/reels."""

    scored: list[dict[str, Any]] = []
    for segment in segments:
        text = str(segment.get("text", ""))
        duration = float(segment.get("end_s", 0.0)) - float(segment.get("start_s", 0.0))
        if duration <= 0.5:
            continue
        score = 0.0
        score += min(len(text) / 60.0, 1.5)
        if any(marker in text for marker in ("!", "?", "핵심", "중요", "꼭", "절대", "반드시", "첫 번째", "두 번째", "세 번째")):
            score += 1.2
        if any(ch.isdigit() for ch in text):
            score += 1.0
        if 8.0 <= duration <= target_s:
            score += 0.8
        scored.append(
            {
                "text": text,
                "start_s": round(float(segment.get("start_s", 0.0)), 3),
                "end_s": round(float(segment.get("end_s", 0.0)), 3),
                "duration_s": round(duration, 3),
                "score": round(score, 3),
            }
        )
    scored.sort(key=lambda row: row["score"], reverse=True)
    return scored[:limit]
