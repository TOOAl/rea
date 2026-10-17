"""The authenticity policy engine: fail-closed on the 2025-07-15 inauthentic-content rules."""

from __future__ import annotations

from creatorloop.policy import PolicyEngine, PolicyInputs, signature_similarity, structure_signature, summarize
from creatorloop.screenplay import apply_human_edits, draft_screenplay

ENGINE = PolicyEngine()


def _inputs(brief, screenplay, **overrides):
    defaults = dict(
        catalog=[],
        title=brief.working_title,
        narration_backend="espeak-ng",
        approved_gates=["topic", "script"],
        disclosure_set=True,
        synthetic_media=True,
        reused_sources=False,
    )
    defaults.update(overrides)
    return PolicyInputs(brief=brief, screenplay=screenplay, **defaults)


def test_human_shaped_project_passes(brief, edited_screenplay):
    report = ENGINE.evaluate(_inputs(brief, edited_screenplay))
    assert report.ok, summarize(report)
    assert report.score >= 60
    assert not report.blocking()


def test_unedited_pure_ai_script_blocks(brief):
    screenplay = draft_screenplay(brief, variation_index=0, runtime_target_s=90)
    # Strip the human-sourced material so the draft is machine-only.
    for scene in screenplay.scenes:
        scene.origin = "assistant"
    screenplay.human_sourced_ratio = 0.0
    screenplay.human_edited = False
    screenplay.human_edit_distance = 0.0
    report = ENGINE.evaluate(_inputs(brief, screenplay))
    codes = {finding.code for finding in report.findings}
    assert "SCRIPT_UNEDITED" in codes or "LOW_HUMAN_SHARE" in codes
    assert not report.ok
    assert any(finding.severity.value == "block" for finding in report.findings)


def test_missing_value_adds_blocks(brief, edited_screenplay):
    brief.value_add_claims = []  # human_value_adds is derived from this list
    report = ENGINE.evaluate(_inputs(brief, edited_screenplay))
    codes = {finding.code for finding in report.findings}
    assert "VALUE_ADD_MISSING" in codes
    assert not report.ok


def test_reused_source_with_transformation_passes(brief, edited_screenplay):
    report = ENGINE.evaluate(_inputs(brief, edited_screenplay, reused_sources=True))
    assert "REUSED_WITHOUT_TRANSFORM" not in report.codes()


def test_template_repetition_against_channel_history_blocks(brief, edited_screenplay):
    signature = structure_signature(edited_screenplay)
    catalog = [
        {
            "video_id": "vid_old",
            "title": brief.working_title,
            "narration_text": edited_screenplay.narration_text,
            "structure": signature,
        }
    ]
    report = ENGINE.evaluate(_inputs(brief, edited_screenplay, catalog=catalog))
    codes = {finding.code for finding in report.findings}
    assert codes & {"TEMPLATE_REPETITION", "NARRATION_REPETITION", "TITLE_DUPLICATION"}
    assert not report.ok


def test_variation_rotates_structure_below_block_threshold(brief):
    first = draft_screenplay(brief, variation_index=0, runtime_target_s=90)
    rotated = [draft_screenplay(brief, variation_index=index, runtime_target_s=90) for index in range(1, 5)]
    for other in rotated:
        similarity = signature_similarity(structure_signature(first), structure_signature(other))
        assert similarity < 0.82, f"variation too close to the original: {similarity}"
    hooks = {item.hook_archetype for item in rotated} | {first.hook_archetype}
    assert len(hooks) >= 3, f"hook archetypes must rotate, got {hooks}"


def test_missing_disclosure_is_flagged(brief, edited_screenplay):
    report = ENGINE.evaluate(_inputs(brief, edited_screenplay, disclosure_set=False))
    codes = {finding.code for finding in report.findings}
    assert "DISCLOSURE_MISSING" in codes


def test_mass_production_cadence_blocks(brief, edited_screenplay):
    report = ENGINE.evaluate(_inputs(brief, edited_screenplay, uploads_last_24h=5, uploads_last_7_days=30))
    codes = {finding.code for finding in report.findings}
    assert codes & {"MASS_PRODUCTION_CADENCE", "HIGH_CADENCE"}
    assert not report.ok


def test_reused_source_without_transformation_blocks(brief, edited_screenplay):
    brief.value_add_claims = []  # 재사용 + 변환적 기여 없음 → reused content 정책 위반
    report = ENGINE.evaluate(_inputs(brief, edited_screenplay, reused_sources=True))
    codes = {finding.code for finding in report.findings}
    assert "REUSED_WITHOUT_TRANSFORM" in codes


def test_human_edit_low_share_warns_but_can_pass(brief):
    screenplay = draft_screenplay(brief, variation_index=3, runtime_target_s=90)
    screenplay = apply_human_edits(screenplay, {"sc00": "제가 직접 확인한 순서만 정리합니다."})
    report = ENGINE.evaluate(_inputs(brief, screenplay))
    assert any(finding.code == "LOW_HUMAN_SHARE" for finding in report.findings) or report.ok


def test_text_similarity_catches_reordered_short_titles():
    from creatorloop.policy import text_similarity

    left = "개인사업자 부가세 신고 순서 5가지"
    reordered = "부가세 신고 순서 5가지 (개인사업자)"
    unrelated = "오늘의 고양이 털 관리 방법"
    assert text_similarity(left, reordered) > 0.6
    assert text_similarity(left, unrelated) < 0.3
    assert text_similarity(left, left) == 1.0
    assert text_similarity("", left) == 0.0


def test_summarize_mentions_score_and_findings(brief, edited_screenplay):
    report = ENGINE.evaluate(_inputs(brief, edited_screenplay))
    text = summarize(report)
    assert str(report.score) in text
    assert "block" in text.lower() or "warn" in text.lower() or "PASS" in text
