"""MCP server: protocol handshake, tool inventory, and the human-gate tool semantics."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from creatorloop.mcp_server import PROTOCOL_VERSION, TOOL_SPECS, McpServer

SAMPLE_MANIFEST = Path(__file__).resolve().parents[1] / "data" / "samples" / "capability_manifest_kling.json"


@pytest.fixture()
def server(tmp_path):
    return McpServer(home=str(tmp_path / "store"))


def _call(server, name, **arguments):
    response = server.handle(
        {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": name, "arguments": arguments}}
    )
    payload = json.loads(response["result"]["content"][0]["text"])
    return response["result"].get("isError", False), payload


def test_initialize_reports_protocol_and_capabilities(server):
    response = server.handle(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {"protocolVersion": PROTOCOL_VERSION, "capabilities": {}, "clientInfo": {"name": "t", "version": "1"}},
        }
    )
    result = response["result"]
    assert result["protocolVersion"] == PROTOCOL_VERSION
    assert result["serverInfo"]["name"] == "creator-loop"
    assert "tools" in result["capabilities"]
    assert "apply_human_edits" in result["instructions"]


def test_notifications_get_no_response(server):
    assert server.handle({"jsonrpc": "2.0", "method": "notifications/initialized"}) is None


def test_unknown_method_is_a_protocol_error(server):
    response = server.handle({"jsonrpc": "2.0", "id": 9, "method": "resources/list"})
    assert response["error"]["code"] == -32601


def test_tools_list_matches_the_implemented_surface(server):
    response = server.handle({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    tools = response["result"]["tools"]
    names = {tool["name"] for tool in tools}
    assert names == set(server.methods), "every advertised tool must be callable"
    for tool in tools:
        assert tool["description"]
        assert tool["inputSchema"]["type"] == "object"
        assert tool["inputSchema"].get("additionalProperties") is False
    assert {"research_brief", "draft_screenplay", "apply_human_edits", "produce_video", "policy_audit", "next_topics"} <= names


def test_unknown_tool_call_is_rejected(server):
    response = server.handle(
        {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "delete_channel", "arguments": {}}}
    )
    assert response["error"]["code"] == -32601


def test_doctor_tool_returns_json(server):
    error, payload = _call(server, "creatorloop_doctor")
    assert error is False
    assert payload["providers"]["free_only"] is True
    assert payload["tts"]["selected"]


def test_research_then_script_then_human_edits(server):
    error, brief = _call(
        server,
        "research_brief",
        niche_id="solo_tax_kr",
        title="개인사업자 첫 부가세 신고 순서",
        answers={"human_take": "저는 첫 신고에서 40만원을 더 냈습니다.", "original_data": "매입세액 32만원 중 18만원 공제"},
        value_adds=[
            {"kind": "personal_experience", "evidence": "첫 신고에서 40만원을 더 냈습니다."},
            {"kind": "original_data", "evidence": "매입세액 32만원 중 18만원만 공제받았습니다."},
        ],
        keywords=["부가가치세 신고"],
        personal_advantage=4,
        runtime_target_s=60,
    )
    assert error is False
    assert brief["decisions"] >= 3
    brief_id = brief["brief_id"]

    error, draft = _call(server, "draft_screenplay", brief_id=brief_id, variation_index=1, runtime_target_s=60)
    assert error is False
    assert draft["scenes"] >= 5
    assert draft["gates"]["passed"] in (True, False)

    error, edited = _call(
        server,
        "apply_human_edits",
        brief_id=brief_id,
        edits={"sc00": "제가 직접 겪은 순서만 정리합니다. 첫 신고에서 40만원을 더 냈습니다."},
        decided_by="human",
    )
    assert error is False
    assert edited["human_edited"] is True
    assert edited["gates"]["passed"] is True, edited["gates"]["reasons"]

    error, audit = _call(server, "policy_audit", brief_id=brief_id)
    assert error is False
    assert audit["score"] > 0
    assert audit["summary"]


def test_produce_video_refuses_behind_a_closed_gate(server):
    _, brief = _call(
        server,
        "research_brief",
        niche_id="solo_tax_kr",
        title="게이트 테스트",
        answers={},
        value_adds=[],
        runtime_target_s=45,
    )
    _call(server, "draft_screenplay", brief_id=brief["brief_id"], runtime_target_s=45)
    error, result = _call(server, "produce_video", brief_id=brief["brief_id"], resolution="720p")
    assert error is False
    assert result["ok"] is False
    assert result["blocked_by"] == "human_gates"


def test_tool_errors_are_returned_as_tool_results_not_protocol_errors(server):
    response = server.handle(
        {
            "jsonrpc": "2.0",
            "id": 7,
            "method": "tools/call",
            "params": {"name": "draft_screenplay", "arguments": {"brief_id": "does-not-exist"}},
        }
    )
    assert "error" not in response
    assert response["result"]["isError"] is True
    assert "not found" in response["result"]["content"][0]["text"]


def test_project_state_lists_progress(server):
    _call(
        server,
        "research_brief",
        niche_id="career_pivot_4050",
        title="45세 이력서 수정 과정",
        answers={"human_take": "14곳 지원해 2곳에서 답을 받았습니다."},
        value_adds=[{"kind": "personal_experience", "evidence": "14곳 지원 2곳 응답"}],
        runtime_target_s=45,
    )
    error, state = _call(server, "project_state")
    assert error is False
    assert state["projects"]
    row = state["projects"][0]
    assert row["has_screenplay"] is False
    assert row["has_video"] is False


def test_rea_tools_expose_the_lawful_playbook(server):
    error, plan = _call(server, "rea_analysis_plan", target="har", artifacts=["/tmp/session.har"], product="kling")
    assert error is False
    assert plan["legal_checklist"]
    assert "evidence" in plan["markdown"].lower() or "증거" in plan["markdown"]
    assert plan["manifest_template"]["observed_capabilities"]

    error, ingested = _call(
        server,
        "rea_ingest_manifest",
        manifest_path=str(SAMPLE_MANIFEST),
    )
    assert error is False
    assert ingested["ok"] is True
    assert any(check.get("provider") == "kling" for check in ingested["contract_checks"])


def test_every_tool_spec_name_is_snake_case_and_unique():
    names = [tool["name"] for tool in TOOL_SPECS]
    assert len(names) == len(set(names))
    assert all(name.replace("_", "").isalnum() and name.islower() for name in names)
