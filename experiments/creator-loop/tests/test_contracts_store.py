"""Contract round-trips: JSON must survive save/load with nested dataclasses and enums."""

from __future__ import annotations

import json

from creatorloop.contracts import CameraMove, HumanDecision, ShotSize, Stage, to_jsonable
from creatorloop.screenplay import draft_screenplay


def test_screenplay_round_trip_keeps_nested_types(store, brief):
    screenplay = draft_screenplay(brief, variation_index=2, runtime_target_s=90)
    store.save_screenplay(screenplay)
    loaded = store.load_screenplay(brief.id)

    assert loaded is not None
    assert loaded.id == screenplay.id
    assert loaded.scenes, "scenes must survive the round trip"
    assert loaded.scenes[0].shots, "shots must survive the round trip"
    assert isinstance(loaded.scenes[0].shots[0].move, CameraMove)
    assert isinstance(loaded.scenes[0].shots[0].size, ShotSize)
    assert loaded.audio.music_mood == screenplay.audio.music_mood
    assert loaded.structure_signature == screenplay.structure_signature
    assert abs(loaded.estimated_runtime_s - screenplay.estimated_runtime_s) < 1e-6


def test_brief_round_trip_keeps_decisions_and_enums(store, brief):
    store.save_brief(brief)
    loaded = store.load_brief(brief.id)
    assert loaded is not None
    assert loaded.niche_id == brief.niche_id
    assert loaded.value_add_claims, "value-add claims must survive"
    assert loaded.value_add_claims[0].kind.name.lower() == brief.value_add_claims[0].kind.value
    assert all(isinstance(decision.stage, Stage) for decision in loaded.decisions)


def test_decisions_are_appended_as_jsonl(store, brief):
    decision = HumanDecision(stage=Stage.RESEARCH, question="q", answer="a", kind="choice", decided_by="human")
    store.record_decision(decision, brief.id)
    store.record_decision(decision, brief.id)
    rows = store.decisions(brief.id)
    assert len(rows) == 2
    assert rows[0]["decided_by"] == "human"
    raw = (store.root / "decisions.jsonl").read_text("utf-8").strip().splitlines()
    assert len(raw) == 2
    assert json.loads(raw[0])["stage"] == "research"


def test_catalog_and_metrics_round_trip(store):
    store.append_catalog(
        {
            "video_id": "vid_1",
            "title": "첫 영상",
            "niche_id": "solo_tax_kr",
            "metrics": {
                "video_id": "vid_1",
                "title": "첫 영상",
                "published_at": "2026-09-01",
                "views": 1000,
                "impressions": 50000,
                "impressions_ctr": 0.042,
                "niche_id": "solo_tax_kr",
            },
        }
    )
    assert len(store.catalog()) == 1
    metrics = store.catalog_metrics()
    assert metrics[0].video_id == "vid_1"
    assert abs(metrics[0].ctr - 0.042) < 1e-6


def test_to_jsonable_is_json_serialisable(screenplay):
    payload = json.dumps(to_jsonable(screenplay), ensure_ascii=False)
    assert payload
    assert "beat_sequence" in payload


def test_project_path_does_not_create_directories(store):
    """읽기 경로는 폴더를 만들지 않습니다 (stray 디렉터리 방지)."""

    before = {path.name for path in (store.root / "projects").iterdir()}
    path = store.project_path("brief_that_does_not_exist")
    assert not path.exists()
    assert {item.name for item in (store.root / "projects").iterdir()} == before

    created = store.project_dir("brief_that_does_exist")
    assert (created / "assets").is_dir() and (created / "thumbnails").is_dir()


def test_resolve_brief_id_accepts_id_folder_and_json_path(store, brief):
    store.save_brief(brief)

    assert store.resolve_brief_id(brief.id) == brief.id
    assert store.resolve_brief_id(str(store.project_path(brief.id))) == brief.id
    assert store.resolve_brief_id(str(store.project_path(brief.id) / "brief.json")) == brief.id
    assert store.resolve_brief_id(brief.id[:12]) == brief.id, "prefix로도 찾아야 합니다"
    assert store.resolve_brief_id("") == ""
    assert store.resolve_brief_id("missing") == "missing"
