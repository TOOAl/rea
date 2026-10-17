"""Screenplay engine: variation rotation, human provenance, article path, remix lineage."""

from __future__ import annotations

from creatorloop.policy import signature_similarity, structure_signature
from creatorloop.screenplay import (
    HOOK_ARCHETYPES,
    article_to_screenplay,
    apply_human_edits,
    beat_summary,
    draft_screenplay,
    human_ratio,
    narration_segments_for_tts,
    provenance_report,
    remix,
    slots_from_brief,
    variation_profile,
)

ARTICLE = """\
# 간이과세자에서 일반과세자로 전환될 때

간이과세자는 매출의 1.5~4% 수준으로 납부하지만, 연간 공급대가 8천만원을 넘으면 일반과세자로 전환됩니다.

전환 시점부터는 매입세액 공제가 가능해지는 대신 신고 횟수가 연 2회로 늘고 세금계산서 발급 의무가 생깁니다.

가장 흔한 실수는 전환 직전 매입을 놓치는 것입니다. 큰 지출이 예정되어 있다면 시점을 조정하는 것이 좋습니다.
"""


def test_draft_has_hook_scenes_shots_and_runtime(brief):
    screenplay = draft_screenplay(brief, variation_index=0, runtime_target_s=90)
    assert len(screenplay.scenes) >= 5
    assert all(scene.shots for scene in screenplay.scenes)
    assert screenplay.scenes[0].beat == "hook"
    assert screenplay.estimated_runtime_s > 20
    assert screenplay.hook_archetype in HOOK_ARCHETYPES
    assert screenplay.entities, "Sora-style entity bible must exist for continuity"


def test_variation_index_rotates_hook_beats_and_camera(brief):
    drafts = [draft_screenplay(brief, variation_index=index, runtime_target_s=90) for index in range(5)]
    hooks = {draft.hook_archetype for draft in drafts}
    plans = {draft.beat_plan for draft in drafts}
    assert len(hooks) >= 3, f"hook archetypes must rotate: {hooks}"
    assert len(plans) >= 2, f"beat plans must rotate: {plans}"
    signatures = [structure_signature(draft) for draft in drafts]
    worst = max(signature_similarity(a, b) for i, a in enumerate(signatures) for b in signatures[i + 1 :])
    assert worst < 0.82, f"variations too similar for the repetition rule: {worst}"


def test_variation_profile_is_deterministic():
    first = variation_profile("같은 제목", variation_index=2, niche_id="solo_tax_kr")
    second = variation_profile("같은 제목", variation_index=2, niche_id="solo_tax_kr")
    assert first.seed == second.seed
    assert first.hook_archetype == second.hook_archetype
    assert first.lineage != variation_profile("같은 제목", variation_index=3, niche_id="solo_tax_kr").lineage


def test_human_answers_reach_the_narration(brief):
    screenplay = draft_screenplay(brief, variation_index=0, runtime_target_s=90)
    narration = screenplay.narration_text
    assert "40만원" in narration, "the human's own numbers must appear in the script"
    assert screenplay.human_sourced_ratio > 0.2
    assert human_ratio(screenplay) == screenplay.human_sourced_ratio


def test_human_edits_are_recorded_as_decisions(screenplay):
    edited = apply_human_edits(screenplay, {"sc00": "제가 직접 확인한 순서만 정리합니다."}, decided_by="human")
    assert edited.human_edited is True
    assert edited.human_edit_distance > 0
    assert edited.scenes[0].narration == "제가 직접 확인한 순서만 정리합니다."
    assert edited.scenes[0].origin == "human"
    kinds = {decision.kind for decision in edited.decisions}
    assert "edit" in kinds
    assert edited.ai_draft_text != edited.final_text


def test_editing_every_scene_makes_it_fully_human(screenplay):
    edits = {scene.id: f"사람이 다시 쓴 {index}번 문장입니다." for index, scene in enumerate(screenplay.scenes)}
    edited = apply_human_edits(screenplay, edits)
    assert edited.human_sourced_ratio > 0.9


def test_beat_summary_carries_origin_and_shots(screenplay):
    rows = beat_summary(screenplay)
    assert len(rows) == len(screenplay.scenes)
    for row in rows:
        assert row["origin"] in {"human", "mixed", "assistant"}
        assert row["shots"] >= 1
        assert row["narration"]


def test_narration_segments_match_scenes(screenplay):
    segments = narration_segments_for_tts(screenplay)
    assert len(segments) == len(screenplay.scenes)
    assert all(isinstance(segment, str) and segment for segment in segments)


def test_provenance_report_is_auditable(screenplay):
    report = provenance_report(screenplay)
    assert len(report["scenes"]) == len(screenplay.scenes)
    assert "human_sourced_ratio" in report
    assert report["note"]
    assert all({"scene_id", "beat", "origin", "chars"} <= set(row) for row in report["scenes"])


def test_slots_are_filled_from_the_brief(brief):
    values = slots_from_brief(brief).as_dict()
    assert values["topic"], "the topic slot must be filled from keywords/title"
    assert values["myth"] and values["period"]
    assert "40만원" in values["action"] or "40만원" in values["situation"]


def test_korean_particles_follow_batchim():
    from creatorloop.screenplay import _particle

    assert _particle("신고", ("은", "는")) == "신고는"      # 받침 없음 → 는
    assert _particle("비용", ("을", "를")) == "비용을"      # 받침 있음 → 을
    assert _particle("매출", ("이", "가")) == "매출이"      # 받침 있음 → 이
    assert _particle("홈택스", ("은", "는")) == "홈택스는"  # 받침 없음 → 는


def test_article_path_is_fully_human_sourced(brief):
    screenplay = article_to_screenplay(ARTICLE, brief=brief, scene_target_s=18.0)
    assert len(screenplay.scenes) >= 3
    assert screenplay.human_sourced_ratio == 1.0
    assert "8천만원" in screenplay.narration_text
    assert any("간이과세" in scene.narration for scene in screenplay.scenes)


def test_remix_keeps_lineage_and_stays_under_the_block_threshold(screenplay):
    mixed = remix(screenplay, variation_index=3)
    assert len(mixed.variation_lineage) >= 2
    similarity = signature_similarity(structure_signature(screenplay), structure_signature(mixed))
    assert similarity < 1.0
    assert mixed.id != screenplay.id


def test_runtime_target_shapes_the_cut(brief):
    short = draft_screenplay(brief, variation_index=0, runtime_target_s=45)
    long = draft_screenplay(brief, variation_index=0, runtime_target_s=600)
    assert long.estimated_runtime_s > short.estimated_runtime_s
    assert long.estimated_runtime_s <= 600 * 1.05
    # narration is never compressed below what speaking it requires
    assert short.estimated_runtime_s >= 45 * 0.6
    assert any(decision.question == "런타임 목표 불일치" for decision in short.decisions)


def test_shots_carry_camera_and_prompt_metadata(screenplay):
    for scene in screenplay.scenes:
        for shot in scene.shots:
            assert shot.prompt
            assert shot.negative_prompt
            assert shot.duration_s > 0
            assert shot.size and shot.move
            assert shot.lens_mm in (16, 24, 35, 50, 85, 105, 135)


def test_particles_follow_how_numbers_and_letters_are_read():
    """조사는 표기가 아니라 독음으로 정해집니다 (4→사, 1→일, AI→아이)."""

    from creatorloop.screenplay import _resolve_particle_alternatives as resolve

    assert resolve("4을(를) 되돌려받았다") == "4를 되돌려받았다"
    assert resolve("4이(가) 사라진 이유") == "4가 사라진 이유"
    assert resolve("1을(를) 확인했다") == "1을 확인했다"      # 일 → 받침 있음
    assert resolve("10개 중 3이(가)") == "10개 중 3이"          # 삼 → 받침 있음
    assert resolve("AI은(는) 도구다") == "AI는 도구다"          # 아이 → 받침 없음
    assert resolve("비용을(를) 줄였다") == "비용을 줄였다"
    assert "을(를)" not in resolve("2025년 4을(를) 되돌려받은 순서")


def test_packaging_titles_have_no_unresolved_particles(brief):
    """③ 제목 후보에 '을(를)' 같은 미해결 조사 표기가 남아 있으면 안 됩니다."""

    from creatorloop.packaging import PackagingInputs, title_candidates

    candidates = title_candidates(PackagingInputs(brief=brief))
    assert candidates
    for candidate in candidates:
        assert "을(를)" not in candidate.title, candidate.title
        assert "이(가)" not in candidate.title, candidate.title
        assert "은(는)" not in candidate.title, candidate.title
