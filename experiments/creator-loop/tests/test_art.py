"""Art engine: procedural scene plates, thumbnails and the legibility check."""

from __future__ import annotations

import pytest

from creatorloop.art import (
    DEFAULT_BRAND,
    MOOD_PALETTES,
    ThumbnailSpec,
    fonts_available,
    hangul_font_ok,
    legibility_report,
    palette_for,
    render_scene_art,
    render_thumbnail,
)

pytestmark = pytest.mark.skipif(not fonts_available()[0], reason="Korean TTF fonts unavailable")


def test_hangul_font_is_usable():
    assert hangul_font_ok(), "without a Hangul-capable TTF no Korean text can be rendered"


def test_palette_for_is_deterministic_and_on_brand(shot):
    first = palette_for(shot, DEFAULT_BRAND, "같은 시드")
    second = palette_for(shot, DEFAULT_BRAND, "같은 시드")
    assert first == second
    assert all(value.startswith("#") for value in first)
    assert shot.mood in MOOD_PALETTES


def test_render_scene_art_matches_the_timeline_resolution(shot, tmp_path):
    from PIL import Image

    path = render_scene_art(shot, tmp_path / "plate.png", brand=DEFAULT_BRAND, seed_text="seed", size=(1920, 1080))
    with Image.open(path) as image:
        assert image.size == (1920, 1080)
    assert path.stat().st_size > 20_000, "a flat image would mean the motif pass did not run"


def test_render_scene_art_varies_between_shots(shot, tmp_path):
    first = render_scene_art(shot, tmp_path / "a.png", seed_text="same", size=(640, 360))
    shot.id = "s99_9"
    shot.subject = "홈택스 미리채움 대조 화면"
    second = render_scene_art(shot, tmp_path / "b.png", seed_text="same", size=(640, 360))
    assert first.read_bytes() != second.read_bytes(), "identical plates are exactly what the policy flags"


def test_render_thumbnail_layouts(shot, tmp_path):
    from PIL import Image

    for variant, layout in (("A", "big_word"), ("B", "split"), ("C", "question")):
        spec = ThumbnailSpec(
            variant_id=variant,
            layout=layout,
            headline="40만원",
            kicker="첫 신고",
            badge="2025년 기준",
            background_shot=shot,
        )
        path = render_thumbnail(spec, tmp_path / f"thumb_{variant}.png", brand=DEFAULT_BRAND, seed_text="seed")
        with Image.open(path) as image:
            assert image.size == (1280, 720), "YouTube thumbnails are 1280x720"
        assert path.stat().st_size > 30_000


def test_legibility_report_measures_contrast_and_mobile_size(tmp_path):
    from PIL import Image, ImageDraw

    good = tmp_path / "good.png"
    image = Image.new("RGB", (1280, 720), (10, 15, 30))
    ImageDraw.Draw(image).rectangle([60, 420, 1220, 680], fill=(245, 247, 250))
    image.save(good)

    report = legibility_report(good, "40만원", mobile_width=200)
    assert {"contrast", "dynamic_range", "legible_at_mobile"} <= set(report)
    assert report["dynamic_range"] > 0

    flat = tmp_path / "flat.png"
    Image.new("RGB", (1280, 720), (128, 128, 128)).save(flat)
    flat_report = legibility_report(flat, "40만원")
    assert flat_report["dynamic_range"] < report["dynamic_range"]
    assert flat_report["legible_at_mobile"] is False


def test_brand_defaults_are_a_starting_point_not_a_prison():
    assert DEFAULT_BRAND["width"] == 1920
    assert DEFAULT_BRAND["height"] == 1080
    assert DEFAULT_BRAND["palette"] and DEFAULT_BRAND["accent"]
    assert DEFAULT_BRAND["caption_bar"]


def test_font_resolution_supports_the_brand_styles():
    from creatorloop.art import font

    for style in ("extrabold", "bold", "regular"):
        face = font(style, 64)
        assert face is not None
        assert face.getlength("부가세") > 0
