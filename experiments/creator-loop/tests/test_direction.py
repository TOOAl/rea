"""Camera DSL: one shot description must compile to each provider's dialect."""

from __future__ import annotations

from creatorloop.contracts import CameraMove, ProviderId, Shot
from creatorloop.direction import (
    compile_for_kling,
    compile_for_runway,
    compile_for_sora,
    compile_for_veo,
    continuity_report,
    degrees_to_zoom,
    describe_shot,
    expand_prompt,
    ffmpeg_move_filter,
    kling_camera_control,
    motion_profile,
    storyboard,
)


def test_describe_shot_reads_like_a_shot_line(shot):
    text = describe_shot(shot)
    assert "50mm" in text
    assert "dolly" in text.lower() or "forward" in text.lower()


def test_expand_prompt_adds_director_context(shot):
    expanded = expand_prompt(shot)
    assert shot.prompt.split(",")[0] in expanded
    assert len(expanded) > len(shot.prompt)
    assert "watermark" not in expanded or "no readable" in expanded


def test_kling_simple_move_uses_single_axis(shot):
    shot.move = CameraMove.PAN_RIGHT
    control = kling_camera_control(shot)
    assert control is not None
    assert control["type"] == "simple"
    non_zero = [value for value in control["config"].values() if value]
    assert len(non_zero) == 1, "Kling 'simple' allows exactly one non-zero axis"
    assert all(-10 <= value <= 10 for value in control["config"].values())


def test_kling_compound_move_falls_back_to_dynamic(shot):
    shot.move = CameraMove.DOLLY_IN
    control = kling_camera_control(shot)
    assert control["type"] == "dynamic"
    assert sum(1 for value in control["config"].values() if value) >= 2


def test_kling_static_move_is_omitted(shot):
    shot.move = CameraMove.STATIC
    assert kling_camera_control(shot) is None


def test_compile_for_kling_payload(shot):
    payload = compile_for_kling(shot, model_name="kling-v2-master", mode="pro", duration="10", aspect_ratio="16:9")
    assert payload["model_name"] == "kling-v2-master"
    assert payload["mode"] == "pro"
    assert payload["duration"] == "10"
    assert payload["aspect_ratio"] == "16:9"
    assert payload["prompt"]
    assert "negative_prompt" in payload
    assert 0 <= payload["cfg_scale"] <= 1


def test_compile_for_veo_payload(shot):
    payload = compile_for_veo(shot, aspect_ratio="9:16", resolution="1080p")
    assert payload["aspectRatio"] == "9:16"
    assert payload["resolution"] == "1080p"
    assert payload["prompt"]
    assert "negativePrompt" in payload
    assert "personGeneration" in payload


def test_compile_for_runway_payload(shot):
    payload = compile_for_runway(shot, model="gen4_turbo", ratio="1280:720", duration=10)
    assert payload["model"] == "gen4_turbo"
    assert payload["ratio"] == "1280:720"
    assert payload["duration"] == 10
    assert payload["promptText"]


def test_compile_for_sora_payload(shot):
    payload = compile_for_sora(shot, seconds="12", size="1080x1920")
    assert payload["seconds"] == "12"
    assert payload["size"] == "1080x1920"
    assert payload["prompt"]


def test_ffmpeg_move_filter_is_a_valid_zoompan_chain(shot):
    shot.move = CameraMove.PAN_LEFT
    chain = ffmpeg_move_filter(shot, width=1920, height=1080, fps=30)
    assert chain.startswith("scale=")
    assert "zoompan=" in chain
    assert "s=1920x1080" in chain
    assert "fps=30" in chain


def test_ffmpeg_move_filter_static_has_no_motion(shot):
    shot.move = CameraMove.STATIC
    chain = ffmpeg_move_filter(shot, width=1280, height=720)
    assert "z='1.0'" in chain, "a static shot must keep zoom at 1.0"
    assert "on/" not in chain, "a static shot must not animate over the frame index"


def test_degrees_to_zoom_is_monotonic():
    assert degrees_to_zoom(0) < degrees_to_zoom(15) < degrees_to_zoom(35)


def test_motion_profile_matches_provider_capability(shot):
    local = motion_profile(shot, provider=ProviderId.LOCAL_STUDIO)
    kling = motion_profile(shot, provider=ProviderId.KLING)
    assert local["move"] == "dolly_in"
    assert "cfg_scale" not in local, "the free local engine has no provider motion budget"
    assert kling["mode"] in {"std", "pro"}
    assert 0 <= kling["cfg_scale"] <= 1


def test_storyboard_rows_are_renderable(screenplay):
    rows = storyboard(screenplay)
    assert rows
    for row in rows:
        assert row["scene"] and row["shot"]
        assert row["move"]
        assert row["duration_s"] > 0
        assert row["prompt"]


def test_continuity_report_flags_entity_reuse(screenplay):
    report = continuity_report(screenplay)
    assert isinstance(report, dict)
    assert "entity_usage" in report and "break_count" in report
    assert report["break_count"] == len(report["continuity_breaks"])


def test_shot_defaults_are_safe():
    bare = Shot(id="x", prompt="p")
    assert bare.move == CameraMove.STATIC
    assert bare.duration_s > 0
