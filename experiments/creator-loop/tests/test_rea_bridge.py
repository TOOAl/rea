"""REA bridge: lawful artifact-analysis plans and capability-manifest ingestion."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from creatorloop.rea_bridge import LEGAL_CHECKLIST, TARGETS, analysis_plan, ingest_manifest, manifest_template

SAMPLE_MANIFEST = Path(__file__).resolve().parents[1] / "data" / "samples" / "capability_manifest_kling.json"


@pytest.mark.parametrize("target", sorted(TARGETS))
def test_every_target_produces_runnable_rea_commands(target):
    plan = analysis_plan(target=target, artifacts=["/abs/artifact"], product="sample")
    assert plan["steps"], f"{target} produced no steps"
    for step in plan["steps"]:
        assert step["command"].startswith("rea "), "only the REA CLI may be invoked"
        assert step["why"]
    assert plan["legal_checklist"] == list(LEGAL_CHECKLIST)
    assert "금지" in plan["markdown"]


def test_plan_markdown_is_a_checklist_a_human_can_follow():
    plan = analysis_plan(target="web-client", product="kling")
    markdown = plan["markdown"]
    assert markdown.startswith("# REA 분석 플랜")
    assert "```bash" in markdown
    assert "- [ ]" in markdown
    assert plan["manifest_path"].endswith(".json")


def test_plan_never_targets_a_remote_service():
    for target in TARGETS:
        plan = analysis_plan(target=target, product="x")
        for step in plan["steps"]:
            tokens = step["command"].split()
            positional = [token for token in tokens[1:] if not token.startswith("-") and "://" not in token]
            assert positional, "every step needs a local artifact or endpoint argument"
            for argument in positional:
                assert not argument.startswith("https://"), f"REA must read local artifacts, not {argument}"
            assert "--cookie" not in step["command"]
            assert "Authorization: Bearer" not in step["command"]
        # loopback CDP and --allowed-origins placeholders are fine, remote fetching is not
        assert "curl" not in " ".join(step["command"] for step in plan["steps"])


def test_capture_plans_mask_credentials():
    plan = analysis_plan(target="har", artifacts=["/abs/session.har"], product="veo")
    commands = " ".join(step["command"] for step in plan["steps"])
    assert "--sensitive-value Authorization" in commands


def test_manifest_template_has_evidence_and_mapping_fields():
    template = manifest_template("kling", "본인 계정 API 응답")
    capability = template["observed_capabilities"][0]
    assert {"feature", "observed_values", "constraint", "evidence", "maps_to_creator_loop"} <= set(capability)
    assert template["not_observed"], "the manifest must state what was NOT observable"


def test_ingest_manifest_stores_and_cross_checks(tmp_path):
    result = ingest_manifest(SAMPLE_MANIFEST, store_root=tmp_path)
    assert result["ok"] is True
    assert result["product"] == "kling"
    assert result["capabilities"] == 3
    stored = json.loads(Path(result["stored_at"]).read_text("utf-8"))
    assert stored["ingested_from"].endswith("capability_manifest_kling.json")

    checks = result["contract_checks"]
    kling = next(check for check in checks if check.get("provider") == "kling")
    assert kling["adapter_max_clip_s"] == 10.0
    assert kling["observed_max_duration_s"] == 10
    assert kling["adapter_camera_control"] is True

    camera = next(check for check in checks if check.get("feature") == "kling_camera_control")
    assert camera["observed_single_axis_rule"] is True
    assert camera["ok"] is True


def test_ingest_flags_missing_evidence(tmp_path):
    manifest = tmp_path / "sloppy.json"
    manifest.write_text(
        json.dumps(
            {
                "product": "veo",
                "observed_capabilities": [{"feature": "native_audio", "observed_values": {}}],
                "observed_limits": [{"name": "max_duration_s", "value": 8}],
            },
            ensure_ascii=False,
        ),
        "utf-8",
    )
    result = ingest_manifest(manifest, store_root=tmp_path)
    assert result["ok"] is False
    assert result["missing_evidence"] == ["native_audio"]


def test_ingest_detects_an_adapter_that_over_promises(tmp_path):
    manifest = tmp_path / "wrong.json"
    manifest.write_text(
        json.dumps(
            {
                "product": "kling",
                "observed_capabilities": [],
                "observed_limits": [{"name": "max_duration_s", "value": 5}],
            },
            ensure_ascii=False,
        ),
        "utf-8",
    )
    result = ingest_manifest(manifest, store_root=tmp_path)
    kling = next(check for check in result["contract_checks"] if check.get("provider") == "kling")
    assert kling["ok"] is False
    assert "max_clip_s" in kling["note"]


def test_ingest_rejects_a_malformed_manifest(tmp_path):
    manifest = tmp_path / "bad.json"
    manifest.write_text(json.dumps({"product": "x", "observed_capabilities": "nope"}), "utf-8")
    with pytest.raises(ValueError):
        ingest_manifest(manifest, store_root=tmp_path)
