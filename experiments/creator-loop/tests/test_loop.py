"""Loop orchestration: human gates, fail-closed policy, channel memory, analytics feedback.

Rendering itself is covered by the demo; these tests stay offline and fast by
exercising everything around ``produce()``.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from creatorloop.contracts import ProducedVideo, ProviderId, Severity, utcnow
from creatorloop.loop import CreatorLoop, LoopOptions
from creatorloop.packaging import PackagingInputs, optimize_package

SAMPLE_CSV = Path(__file__).resolve().parents[1] / "data" / "samples" / "analytics_export.csv"


@pytest.fixture()
def loop(store):
    return CreatorLoop(store)


@pytest.fixture()
def made_brief(loop):
    return loop.research(
        "solo_tax_kr",
        "개인사업자 첫 부가세 신고 전에 확인할 5가지",
        {
            "human_take": "저는 첫 신고 때 증빙을 못 찾아서 40만원을 더 냈습니다.",
            "original_data": "2025년 1기 확정신고에서 매입세액 32만원 중 18만원만 공제받았습니다.",
            "통념": "미리채움 그대로 제출하면 된다고 생각하는 경우가 많습니다.",
            "limit": "간이과세자라면 기준이 달라집니다.",
        },
        value_adds=[
            ("personal_experience", "첫 신고 때 증빙을 못 찾아 40만원을 더 냈습니다."),
            ("original_data", "매입세액 32만원 중 18만원만 공제받았습니다."),
        ],
        keywords=["부가가치세 신고", "경비처리"],
        personal_advantage=4,
        runtime_target_s=60,
    )


def test_research_records_human_decisions(loop, made_brief):
    assert len(made_brief.decisions) >= 3
    assert all(decision.decided_by == "human" for decision in made_brief.decisions)
    assert loop.store.load_brief(made_brief.id).id == made_brief.id
    assert loop.store.decisions(made_brief.id)
    assert (loop.store.project_dir(made_brief.id) / "research.json").exists()


def test_script_stage_stores_screenplay_and_storyboard(loop, made_brief):
    screenplay = loop.script(made_brief, options=LoopOptions(runtime_target_s=60))
    assert loop.store.load_screenplay(made_brief.id).id == screenplay.id
    storyboard = (loop.store.project_dir(made_brief.id) / "storyboard.json").exists()
    assert storyboard


def test_script_gate_blocks_an_untouched_ai_draft(loop, made_brief):
    screenplay = loop.script(made_brief, options=LoopOptions(runtime_target_s=60))
    for scene in screenplay.scenes:
        scene.origin = "assistant"
    screenplay.human_sourced_ratio = 0.0
    screenplay.human_edited = False
    loop.store.save_screenplay(screenplay)
    gates = loop.check_gates(made_brief, screenplay)
    assert gates["passed"] is False
    assert any("script gate" in reason for reason in gates["reasons"])


def test_script_gate_passes_after_human_edits(loop, made_brief):
    screenplay = loop.script(
        made_brief,
        options=LoopOptions(runtime_target_s=60),
        edits={"sc00": "제가 직접 겪은 순서만 정리합니다. 첫 신고에서 40만원을 더 냈습니다."},
    )
    gates = loop.check_gates(made_brief, screenplay)
    assert gates["passed"] is True, gates["reasons"]
    assert screenplay.human_edited is True
    assert any(decision.kind == "edit" for decision in screenplay.decisions)


def test_topic_gate_needs_enough_human_input(loop):
    thin = loop.research("solo_tax_kr", "그냥 부가세 이야기", {}, value_adds=[], keywords=[], runtime_target_s=60)
    screenplay = loop.script(thin, options=LoopOptions(runtime_target_s=60))
    gates = loop.check_gates(thin, screenplay)
    assert gates["passed"] is False
    assert any("value-add" in reason or "topic gate" in reason for reason in gates["reasons"])


def test_article_route_satisfies_the_script_gate(loop):
    article = "직접 쓴 글입니다.\n\n첫 문단은 전환 시점 설명입니다.\n\n두 번째 문단은 매입 증빙 설명입니다.\n\n마지막 문단은 예상 세액 계산입니다."
    brief = loop.research(
        "solo_tax_kr",
        "간이과세자에서 일반과세자로 전환될 때",
        {"human_take": "제가 직접 쓴 실무 노트입니다."},
        value_adds=[("original_data", "직접 작성한 실무 노트 전문")],
        keywords=["간이과세"],
        personal_advantage=4,
        runtime_target_s=90,
    )
    options = LoopOptions(runtime_target_s=90, article=article)
    screenplay = loop.script(brief, options=options)
    assert screenplay.human_sourced_ratio == 1.0
    assert loop.check_gates(brief, screenplay, options=options)["passed"] is True


def test_policy_is_fail_closed_without_a_video(loop, made_brief):
    screenplay = loop.script(
        made_brief, options=LoopOptions(runtime_target_s=60), edits={"sc00": "제가 확인한 순서입니다."}
    )
    report = loop.policy_report(made_brief, screenplay, None, None)
    assert (loop.store.project_dir(made_brief.id) / "policy.json").exists()
    assert report.policy_reference
    for finding in report.findings:
        assert finding.severity in set(Severity)
    if not report.ok:
        assert report.blocking()


def test_analyze_ingests_csv_and_ranks_next_topics(loop):
    report = loop.analyze(csv_path=SAMPLE_CSV)
    assert report.videos >= 8
    assert report.recommendations
    assert loop.store.weights(), "learned title weights must be persisted for the next package"
    stored = loop.store.latest_analytics()
    assert stored is not None and stored.id == report.id


def test_uploads_last_counts_catalog_entries(loop, made_brief):
    loop.store.append_catalog({"video_id": "v1", "title": "첫 편", "created_at": utcnow()})
    assert loop.uploads_last(days=7) >= 1


def test_remember_writes_channel_fingerprints(loop, made_brief):
    screenplay = loop.script(made_brief, options=LoopOptions(runtime_target_s=60))
    video = ProducedVideo(
        id="video_1",
        brief_id=made_brief.id,
        screenplay_id=screenplay.id,
        package_id="pkg_1",
        path="/tmp/does-not-exist.mp4",
        duration_s=60.0,
        width=1920,
        height=1080,
        provider=ProviderId.LOCAL_STUDIO,
        has_audio=True,
    )
    package = optimize_package(PackagingInputs(brief=made_brief, screenplay=screenplay))
    report = loop.policy_report(made_brief, screenplay, package, None)
    loop.remember(made_brief, screenplay, video, package, report, {"tts": None, "composed": None})
    rows = loop.store.catalog()
    assert rows[-1]["video_id"] == "video_1"
    assert rows[-1]["structure"]["beat_sequence"]
    assert rows[-1]["metrics"]["views"] == 0
    assert loop.store.catalog_metrics()[-1].video_id == "video_1"


def test_second_video_is_measured_against_the_first(loop, made_brief):
    options = LoopOptions(runtime_target_s=60)
    first = loop.script(made_brief, options=options, edits={"sc00": "제가 확인한 순서입니다."})
    video = ProducedVideo(
        id="video_a",
        brief_id=made_brief.id,
        screenplay_id=first.id,
        package_id="",
        path="/tmp/a.mp4",
        duration_s=60.0,
        width=1920,
        height=1080,
        provider=ProviderId.LOCAL_STUDIO,
        has_audio=True,
    )
    package = optimize_package(PackagingInputs(brief=made_brief, screenplay=first))
    loop.remember(made_brief, first, video, package, loop.policy_report(made_brief, first, package, None), {})

    # 같은 brief + 같은 variation_index = 같은 템플릿. 2025-07-15 정책이 겨누는
    # "mass-produced / repetitious" 패턴이 정확히 이것입니다.
    second = loop.script(made_brief, options=options)
    report = loop.policy_report(made_brief, second, None, None)
    assert "TEMPLATE_REPETITION" in report.codes(), report.codes()
    assert report.ok is False
    assert report.variation_vs_catalog < 0.9


def test_a_rotated_variation_of_the_same_topic_is_allowed(loop, made_brief):
    options = LoopOptions(runtime_target_s=60)
    first = loop.script(made_brief, options=options, edits={"sc00": "제가 확인한 순서입니다."})
    video = ProducedVideo(
        id="video_c",
        brief_id=made_brief.id,
        screenplay_id=first.id,
        package_id="",
        path="/tmp/c.mp4",
        duration_s=60.0,
        width=1920,
        height=1080,
        provider=ProviderId.LOCAL_STUDIO,
        has_audio=True,
    )
    package = optimize_package(PackagingInputs(brief=made_brief, screenplay=first))
    loop.remember(made_brief, first, video, package, loop.policy_report(made_brief, first, package, None), {})

    rotated = loop.script(made_brief, options=LoopOptions(runtime_target_s=60, variation_index=3))
    report = loop.policy_report(made_brief, rotated, None, None)
    assert "TEMPLATE_REPETITION" not in report.codes(), (
        f"a rotated variation must stay publishable: {report.codes()}"
    )


def test_upload_bundle_is_human_executable(loop, made_brief, tmp_path):
    screenplay = loop.script(made_brief, options=LoopOptions(runtime_target_s=60))
    video = ProducedVideo(
        id="video_b",
        brief_id=made_brief.id,
        screenplay_id=screenplay.id,
        package_id="pkg_b",
        path=str(tmp_path / "video.mp4"),
        duration_s=60.0,
        width=1920,
        height=1080,
        provider=ProviderId.LOCAL_STUDIO,
        has_audio=True,
        subtitles_path=str(tmp_path / "subtitles.srt"),
    )
    package = optimize_package(PackagingInputs(brief=made_brief, screenplay=screenplay))
    report = loop.policy_report(made_brief, screenplay, package, None)
    bundle_path = loop.build_upload_bundle(made_brief, screenplay, package, video, report)
    import json

    bundle = json.loads(bundle_path.read_text("utf-8"))
    assert bundle["title"] == package.best_title
    assert bundle["altered_or_synthetic_content"] is True
    assert bundle["disclosure_text"]
    assert bundle["human_checklist"]
    assert bundle["privacyStatus"] == "private", "the pipeline never publishes on its own"


def test_publish_refuses_without_a_bundle(loop, made_brief, monkeypatch):
    monkeypatch.delenv("YOUTUBE_ACCESS_TOKEN", raising=False)
    result = loop.publish(made_brief.id)
    assert result["ok"] is False
    assert "bundle" in result["reason"]


def test_publish_refuses_without_a_token(loop, made_brief, monkeypatch, tmp_path):
    monkeypatch.delenv("YOUTUBE_ACCESS_TOKEN", raising=False)
    screenplay = loop.script(made_brief, options=LoopOptions(runtime_target_s=60))
    video = ProducedVideo(
        id="video_pub",
        brief_id=made_brief.id,
        screenplay_id=screenplay.id,
        package_id="pkg_pub",
        path=str(tmp_path / "video.mp4"),
        duration_s=60.0,
        width=1920,
        height=1080,
        provider=ProviderId.LOCAL_STUDIO,
        has_audio=True,
    )
    (tmp_path / "video.mp4").write_bytes(b"stub mp4")
    loop.store.save_video(video)
    package = optimize_package(PackagingInputs(brief=made_brief, screenplay=screenplay, video_path=tmp_path / "video.mp4"))
    report = loop.policy_report(made_brief, screenplay, package, None)
    loop.build_upload_bundle(made_brief, screenplay, package, video, report)
    result = loop.publish(made_brief.id)
    assert result["ok"] is False
    assert "YOUTUBE_ACCESS_TOKEN" in result["reason"]
    assert Path(result["bundle"]).exists()


def test_doctor_reports_the_free_only_mode(loop):
    report = loop.doctor()
    assert report["ffmpeg"]["ffmpeg_ok"] is True or report["ffmpeg"]["ffmpeg"] == ""
    assert report["providers"]["free_only"] is True
    assert report["tts"]["selected"]
    assert report["store_root"]


def test_loop_run_blocks_before_rendering_when_gates_fail(loop, made_brief, monkeypatch):
    monkeypatch.setattr(loop, "produce", lambda *args, **kwargs: pytest.fail("produce must not run behind a closed gate"))
    screenplay = loop.script(made_brief, options=LoopOptions(runtime_target_s=60))
    for scene in screenplay.scenes:
        scene.origin = "assistant"
    screenplay.human_sourced_ratio = 0.0
    screenplay.human_edited = False
    loop.store.save_screenplay(screenplay)
    monkeypatch.setattr(loop, "script", lambda brief, options=None, edits=None: screenplay)
    run = loop.run(made_brief, options=LoopOptions(runtime_target_s=60))
    assert run.blocked is True
    assert run.stages["produce"] == "blocked"
    assert loop.store.load_run(run.id).block_reason
