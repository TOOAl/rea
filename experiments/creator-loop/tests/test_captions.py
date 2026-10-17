"""Word-level Korean captions: line limits, cue timing, SRT/ASS output, highlight extraction."""

from __future__ import annotations

from creatorloop.captions import (
    KOREAN_MAX_CHARS,
    KOREAN_MAX_CPS,
    CaptionStyle,
    build_cues,
    build_subtitles,
    highlight_candidates,
    limits_for,
    split_lines,
    write_ass,
    write_srt,
)


def segment(text: str, start: float, end: float, words: list[tuple[str, float, float]] | None = None) -> dict:
    if words is None:
        tokens = text.split()
        span = (end - start) / max(len(tokens), 1)
        words = [(token, start + index * span, start + (index + 1) * span) for index, token in enumerate(tokens)]
    return {
        "text": text,
        "start_s": start,
        "end_s": end,
        "duration_s": end - start,
        "words": [{"word": token, "start_s": word_start, "end_s": word_end} for token, word_start, word_end in words],
    }


def test_limits_differ_by_language():
    ko_chars, ko_cps = limits_for("부가가치세 신고 순서를 확인합니다")
    en_chars, en_cps = limits_for("check the filing order")
    assert (ko_chars, ko_cps) == (KOREAN_MAX_CHARS, KOREAN_MAX_CPS)
    assert en_chars > ko_chars, "Hangul is denser per character than Latin text"


def test_split_lines_respects_the_korean_limit():
    text = "개인사업자 첫 부가세 신고에서 미리채움 자료를 그대로 제출하면 안 되는 이유를 정리했습니다"
    lines = split_lines(text, KOREAN_MAX_CHARS)
    assert len(lines) >= 2
    assert all(len(line) <= KOREAN_MAX_CHARS + 2 for line in lines)
    assert "".join(lines).replace(" ", "") == text.replace(" ", "")


def test_cues_are_ordered_indexed_and_non_overlapping():
    segments = [
        segment("첫 문장입니다. 신고 순서를 확인합니다.", 0.0, 4.0),
        segment("두 번째 문장입니다. 매입세액 18만원 차이.", 4.0, 9.0),
    ]
    cues = build_cues(segments)
    assert len(cues) >= 2
    assert [cue.index for cue in cues] == list(range(1, len(cues) + 1))
    for previous, current in zip(cues, cues[1:]):
        assert current.start_s >= previous.start_s
        assert current.end_s >= current.start_s
    assert all(cue.text for cue in cues)


def test_long_segments_are_broken_into_readable_cues():
    long_text = "부가가치세 신고 전에 확인해야 할 항목들을 순서대로 정리하고 홈택스 미리채움 자료와 실제 거래 내역을 대조하는 방법까지 한 번에 설명드리겠습니다"
    cues = build_cues([segment(long_text, 0.0, 12.0)])
    assert len(cues) >= 3, "one 12-second wall of text must not become a single cue"
    assert all(len(cue.text) <= KOREAN_MAX_CHARS * 1.4 for cue in cues)


def test_srt_and_ass_files_are_written(tmp_path):
    cues = build_cues([segment("신고 순서를 확인합니다.", 0.0, 3.0), segment("매입세액 차이입니다.", 3.0, 6.0)])
    srt = write_srt(cues, tmp_path / "subs.srt")
    ass = write_ass(cues, tmp_path / "subs.ass", CaptionStyle(width=1920, height=1080))
    srt_text = srt.read_text("utf-8")
    assert "-->" in srt_text
    assert "00:00:0" in srt_text
    assert srt_text.strip().startswith("1")
    ass_text = ass.read_text("utf-8")
    assert "[Script Info]" in ass_text
    assert "[V4+ Styles]" in ass_text
    assert "Dialogue:" in ass_text
    assert "PlayResX: 1920" in ass_text


def test_fast_speech_is_split_until_it_is_readable(tmp_path):
    fast_text = "이 문장은 아주 빠릅니다. 다음 문장도 마찬가지입니다. 그래도 잘라내면 읽을 수 있습니다."
    fast = segment(fast_text, 0.0, 1.2)
    subtitles = build_subtitles([fast], project_dir=tmp_path, language="ko-KR")
    assert len(subtitles.cues) >= 3, "a 1.2s wall of speech must be split into readable cues"
    for cue in subtitles.cues:
        span = max(cue.end_s - cue.start_s, 0.1)
        cps = len(cue.text.replace(" ", "")) / span
        assert cps <= KOREAN_MAX_CPS * 1.25, f"cue {cue.index} still unreadable at {cps:.1f} cps"
    assert (tmp_path / "subtitles.srt").exists()
    assert (tmp_path / "subtitles.ass").exists()


def test_unreadable_single_token_is_reported(tmp_path):
    # A token longer than the line limit cannot be split, so it must surface as a warning.
    huge = "부가가치세신고순서확인방법정리" * 4
    subtitles = build_subtitles([segment(huge, 0.0, 0.5)], project_dir=tmp_path, language="ko-KR")
    assert subtitles.cues
    assert subtitles.reading_speed_warnings


def test_highlight_candidates_rank_shorts_segments():
    segments = [
        segment("짧은 도입.", 0.0, 2.0),
        segment("핵심 근거입니다. 매입세액 32만원 중 18만원만 공제받았습니다. 그래서 순서가 중요합니다.", 2.0, 12.0),
        segment("마무리.", 12.0, 13.0),
    ]
    highlights = highlight_candidates(segments, limit=2)
    assert highlights
    assert highlights[0]["text"]
    assert highlights[0]["end_s"] >= highlights[0]["start_s"]
    assert any("근거" in item["text"] for item in highlights)
