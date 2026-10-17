"""③ Packaging: title scoring, thumbnail variants, description chapters, A/B plan."""

from __future__ import annotations

import pytest

from creatorloop.art import DEFAULT_BRAND, legibility_report
from creatorloop.packaging import (
    ARCHETYPE_BY_HOOK,
    TITLE_ARCHETYPES,
    MAX_TITLE_CHARS,
    PackagingInputs,
    ab_plan,
    build_description,
    headline_from_title,
    optimize_package,
    render_thumbnails,
    score_title,
    thumbnail_specs,
    title_candidates,
    title_content_congruence,
)


@pytest.fixture()
def scene_timings(screenplay):
    cursor = 0.0
    rows = []
    for scene in screenplay.scenes:
        rows.append({"scene_id": scene.id, "beat": scene.beat, "start_s": cursor, "end_s": cursor + scene.duration_s})
        cursor += scene.duration_s
    return rows


@pytest.fixture()
def inputs(brief, edited_screenplay, scene_timings, tmp_path):
    # video_path decides where thumbnails are written; tests keep it inside tmp_path.
    return PackagingInputs(
        brief=brief,
        screenplay=edited_screenplay,
        scene_timings=scene_timings,
        brand=DEFAULT_BRAND,
        video_path=tmp_path / "video.mp4",
    )


def test_title_candidates_are_unique_ranked_and_within_limits(inputs):
    titles = title_candidates(inputs)
    assert len(titles) >= 5
    texts = [item.title for item in titles]
    assert len(set(texts)) == len(texts), "duplicate titles waste an A/B slot"
    scores = [item.score for item in titles]
    assert scores == sorted(scores, reverse=True)
    for item in titles:
        assert 0 < len(item.title) <= MAX_TITLE_CHARS
        assert item.archetype
        assert item.rationale


def test_title_archetypes_are_all_reachable(inputs):
    titles = title_candidates(inputs, limit=12)
    assert {item.archetype for item in titles} <= set(TITLE_ARCHETYPES)
    assert len({item.archetype for item in titles}) >= 3
    assert ARCHETYPE_BY_HOOK.get(inputs.screenplay.hook_archetype) in set(TITLE_ARCHETYPES)


def test_score_title_prefers_the_sweet_spot(inputs):
    good = "개인사업자 부가세 신고, 순서 5가지"
    too_long = good + " 그리고 홈택스 미리채움 자료를 그대로 제출하면 안 되는 이유와 예외 조건까지 전부 정리했습니다"
    assert len(too_long) > MAX_TITLE_CHARS
    assert score_title(good, inputs)[0] > score_title(too_long, inputs)[0]


def test_score_title_penalises_clickbait(inputs):
    honest = "부가세 신고 순서 5가지 (2025년 기준)"
    bait = "충격!! 모두가 경악한 부가세 신고의 진실 (미친 반전)"
    honest_score, honest_breakdown = score_title(honest, inputs)
    bait_score, bait_breakdown = score_title(bait, inputs)
    assert honest_score > bait_score
    assert bait_breakdown["clickbait_penalty"] < honest_breakdown["clickbait_penalty"]


def test_specific_numbers_raise_the_score(inputs):
    vague = "부가세 신고 전에 확인할 것들"
    specific = "부가세 신고 전 5가지, 매입세액 18만원 차이"
    assert score_title(specific, inputs)[0] > score_title(vague, inputs)[0]


def test_congruence_matches_titles_to_the_actual_script(inputs):
    related = inputs.screenplay.scenes[0].narration[:24]
    unrelated = "오늘은 고양이 털 관리 방법을 알아봅니다"
    assert title_content_congruence(related, inputs.screenplay) > title_content_congruence(unrelated, inputs.screenplay)


def test_headline_fits_a_thumbnail(inputs):
    headline = headline_from_title(inputs.brief.working_title, max_chars=16)
    assert 0 < len(headline) <= 16


def test_thumbnail_specs_are_three_distinct_layouts(inputs):
    specs = thumbnail_specs(inputs, title_candidates(inputs))
    assert [spec.variant_id for spec in specs] == ["A", "B", "C"]
    assert len({spec.layout for spec in specs}) >= 2
    assert all(spec.headline for spec in specs)


def test_render_thumbnails_produces_mobile_legible_jpegs(inputs, tmp_path):
    from PIL import Image

    variants = render_thumbnails(inputs, title_candidates(inputs))
    assert len(variants) == 3
    for variant in variants:
        path = tmp_path / "thumbnails" / variant.path.split("/")[-1]
        assert path.exists(), f"thumbnail missing: {variant.path}"
        assert path.suffix == ".jpg", "YouTube needs JPEG/PNG under 2MB"
        assert variant.bytes <= 2 * 1024 * 1024
        with Image.open(path) as image:
            assert image.size == (1280, 720)
        assert 0 <= variant.score <= 100
        assert isinstance(variant.legible_at_mobile, bool)
    assert not list((tmp_path / "thumbnails").glob("*.png")), "intermediate PNGs must be cleaned up"


def test_legibility_report_flags_low_contrast(tmp_path):
    from PIL import Image, ImageDraw

    flat = tmp_path / "flat.png"
    image = Image.new("RGB", (1280, 720), (120, 120, 120))
    ImageDraw.Draw(image).rectangle([80, 480, 900, 660], fill=(126, 126, 126))
    image.save(flat)
    report = legibility_report(flat, "테스트")
    assert report["legible_at_mobile"] is False
    assert report["contrast"] < 3.0


def test_description_has_chapters_disclosure_and_tags(inputs):
    description, chapters, hashtags, disclosure = build_description(inputs, inputs.brief.working_title)
    assert "AI" in disclosure or "합성" in disclosure, "synthetic-media disclosure is mandatory"
    assert chapters, "chapters prove editorial structure and help retention"
    assert chapters[0]["start_s"] == 0
    assert all(chapter["label"] for chapter in chapters)
    assert hashtags
    assert description.strip()


def test_ab_plan_states_a_decision_rule(inputs):
    plan = ab_plan(render_thumbnails(inputs, title_candidates(inputs)), title_candidates(inputs))
    assert "Test & Compare" in plan
    assert "3,000" in plan and "7일" in plan
    assert "0.3%p" in plan, "the plan must say how a winner is decided"


def test_pinned_comment_carries_the_correction_policy(inputs):
    from creatorloop.packaging import pinned_comment

    comment = pinned_comment(inputs, inputs.brief.working_title)
    assert "정정" in comment
    assert "댓글" in comment


def test_optimize_package_returns_a_complete_bundle(inputs):
    package = optimize_package(inputs)
    assert package.id
    assert package.best_title in [item.title for item in package.titles]
    assert package.description and package.tags and package.hashtags
    assert package.disclosure_text and package.synthetic_disclosure
    assert package.ab_plan and package.pinned_comment
    assert package.chapters
    assert len(package.thumbnails) == 3
