"""MCP server exposing the creator loop to any MCP host (Claude Desktop, REA, agents).

Implemented directly on JSON-RPC 2.0 over stdio so it has **no third-party
dependency**; if the official ``mcp`` package is installed it is still compatible
because the wire protocol is the same.

Human-in-the-loop is preserved in the tool surface itself:

* ``apply_human_edits`` requires the caller to pass text that a human wrote — the
  server records it as a human decision and will not invent edits.
* ``produce_video`` refuses to run when the topic/script gates are unmet unless the
  caller explicitly passes ``force=True`` (the policy audit still fails closed).
* ``upload_bundle`` returns a payload for a human to execute; the server never uploads.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Callable

from .contracts import to_jsonable
from .loop import CreatorLoop, LoopOptions, _load_brand
from .policy import summarize as policy_summary
from .store import Store

PROTOCOL_VERSION = "2024-11-05"
SERVER_INFO = {"name": "creator-loop", "version": "0.1.0"}


class Tools:
    """Tool implementations; each returns JSON-serialisable data."""

    def __init__(self, home: str = "") -> None:
        self.store = Store(home or None)
        self.loop = CreatorLoop(self.store, brand=_load_brand(""))

    # ---------------------------------------------------------------- info --
    def doctor(self, **_: Any) -> dict[str, Any]:
        return self.loop.doctor()

    def list_niches(self, personal_advantage: dict[str, int] | None = None, **_: Any) -> dict[str, Any]:
        return self.loop.research_options(personal_advantage)

    def project_state(self, brief_id: str = "", **_: Any) -> dict[str, Any]:
        rows = [row for row in self.store.projects() if not brief_id or row["brief_id"] == brief_id]
        out = []
        for row in rows:
            out.append(
                {
                    "brief_id": row["brief_id"],
                    "title": row["brief"].working_title if row["brief"] else "",
                    "niche_id": row["brief"].niche_id if row["brief"] else "",
                    "has_screenplay": bool(row["screenplay"]),
                    "human_sourced_ratio": row["screenplay"].human_sourced_ratio if row["screenplay"] else 0.0,
                    "has_video": bool(row["video"]),
                    "video_path": row["video"].path if row["video"] else "",
                    "policy_score": (row["policy"] or {}).get("score"),
                    "policy_ok": (row["policy"] or {}).get("ok"),
                }
            )
        return {"projects": out, "catalog_videos": len(self.store.catalog()), "decisions": len(self.store.decisions())}

    # ------------------------------------------------------------ ① research --
    def research_questions(self, niche_id: str, **_: Any) -> dict[str, Any]:
        return {"niche_id": niche_id, "questions": self.loop.builder.questions(niche_id)}

    def research_brief(
        self,
        niche_id: str,
        title: str,
        answers: dict[str, str] | None = None,
        value_adds: list[dict[str, str]] | None = None,
        keywords: list[str] | None = None,
        sources: list[str] | None = None,
        personal_advantage: int | None = None,
        video_format: str = "long_form",
        runtime_target_s: int = 240,
        **_: Any,
    ) -> dict[str, Any]:
        brief = self.loop.research(
            niche_id,
            title,
            answers,
            value_adds=[(item.get("kind", "personal_experience"), item.get("evidence", "")) for item in (value_adds or []) if item.get("evidence")],
            keywords=keywords or [],
            sources=sources or [],
            personal_advantage=personal_advantage,
            video_format=video_format,
            runtime_target_s=runtime_target_s,
        )
        return {
            "brief_id": brief.id,
            "title": brief.working_title,
            "niche_score": brief.niche_score,
            "decisions": len(brief.decisions),
            "value_adds": len(brief.human_value_adds),
            "gap_check": self.loop.builder.gap_check(brief, self.store.catalog()),
            "next_step": "draft_screenplay(brief_id=...) — 반드시 사람이 답한 내용을 바탕으로",
        }

    # -------------------------------------------------------------- ② script --
    def draft_screenplay(
        self,
        brief_id: str,
        variation_index: int = 0,
        aspect: str = "16:9",
        resolution: str = "1080p",
        runtime_target_s: int = 240,
        article: str = "",
        remix_from: str = "",
        **_: Any,
    ) -> dict[str, Any]:
        brief = self.store.load_brief(brief_id)
        if brief is None:
            raise ValueError(f"brief not found: {brief_id}")
        options = LoopOptions(
            aspect=aspect,
            resolution=resolution,
            variation_index=variation_index,
            runtime_target_s=runtime_target_s,
            article=article,
            remix_from=remix_from,
        )
        screenplay = self.loop.script(brief, options=options)
        gates = self.loop.check_gates(brief, screenplay, options=options)
        from .screenplay import beat_summary

        return {
            "brief_id": brief_id,
            "screenplay_id": screenplay.id,
            "hook_archetype": screenplay.hook_archetype,
            "beat_plan": screenplay.beat_plan,
            "scenes": len(screenplay.scenes),
            "estimated_runtime_s": screenplay.estimated_runtime_s,
            "human_sourced_ratio": screenplay.human_sourced_ratio,
            "human_edited": screenplay.human_edited,
            "variation_lineage": screenplay.variation_lineage,
            "beats": beat_summary(screenplay),
            "gates": gates,
            "required_human_action": (
                "apply_human_edits로 훅·근거·결론 씬을 사람이 다시 써야 produce_video가 진행됩니다"
                if not gates["passed"]
                else ""
            ),
        }

    def apply_human_edits(self, brief_id: str, edits: dict[str, str], decided_by: str = "human", **_: Any) -> dict[str, Any]:
        """Record human-written scene narration. The text must come from a human."""

        brief = self.store.load_brief(brief_id)
        screenplay = self.store.load_screenplay(brief_id)
        if brief is None or screenplay is None:
            raise ValueError(f"brief/screenplay not found: {brief_id}")
        from .screenplay import apply_human_edits

        screenplay = apply_human_edits(screenplay, edits, decided_by=decided_by)
        for decision in screenplay.decisions[-max(1, len(edits)) :]:
            self.store.record_decision(decision, brief.id)
        self.store.save_screenplay(screenplay)
        gates = self.loop.check_gates(brief, screenplay)
        return {
            "brief_id": brief_id,
            "edited_scenes": list(edits),
            "human_edit_distance": screenplay.human_edit_distance,
            "human_edited": screenplay.human_edited,
            "human_sourced_ratio": screenplay.human_sourced_ratio,
            "gates": gates,
        }

    # ------------------------------------------------------------- ② produce --
    def produce_video(
        self,
        brief_id: str,
        resolution: str = "1080p",
        aspect: str = "16:9",
        budget_usd: float = 0.0,
        prefer_free: bool = True,
        native_audio: bool = False,
        tts: str = "",
        media_dir: str = "",
        fps: int = 30,
        force: bool = False,
        **_: Any,
    ) -> dict[str, Any]:
        brief = self.store.load_brief(brief_id)
        screenplay = self.store.load_screenplay(brief_id)
        if brief is None or screenplay is None:
            raise ValueError(f"brief/screenplay not found: {brief_id}")
        options = LoopOptions(
            aspect=aspect,
            resolution=resolution,
            budget_usd=budget_usd,
            prefer_free=prefer_free,
            native_audio=native_audio,
            tts_backend=tts,
            media_dir=media_dir,
            fps=fps,
        )
        gates = self.loop.check_gates(brief, screenplay, options=options)
        if not gates["passed"] and not force:
            return {"ok": False, "blocked_by": "human_gates", "gates": gates}
        produced = self.loop.produce(brief, screenplay, options=options)
        package = self.loop.package(brief, screenplay, produced)
        report = self.loop.policy_report(brief, screenplay, package, produced)
        bundle = self.loop.build_upload_bundle(brief, screenplay, package, produced["video"], report)
        video = produced["video"]
        return {
            "ok": report.ok,
            "brief_id": brief_id,
            "video_path": video.path,
            "duration_s": video.duration_s,
            "size": f"{video.width}x{video.height}",
            "provider": video.provider.value,
            "cost_usd": video.cost_usd,
            "tts_backend": produced["tts"].backend,
            "subtitles": video.subtitles_path,
            "package": {
                "best_title": package.best_title,
                "titles": [item.title for item in package.titles[:5]],
                "thumbnails": [item.path for item in package.thumbnails],
                "ab_plan": package.ab_plan,
                "disclosure": package.disclosure_text,
            },
            "policy": {"score": report.score, "ok": report.ok, "blocking": [finding.code for finding in report.blocking()]},
            "policy_summary": policy_summary(report),
            "upload_bundle": str(bundle),
            "warnings": produced["warnings"][:10],
            "gates": gates,
        }

    def policy_audit(self, brief_id: str, **_: Any) -> dict[str, Any]:
        brief = self.store.load_brief(brief_id)
        if brief is None:
            raise ValueError(f"brief not found: {brief_id}")
        report = self.loop.policy_report(brief, self.store.load_screenplay(brief_id), self.store.load_package(brief_id), None)
        return {"score": report.score, "ok": report.ok, "summary": policy_summary(report), "findings": [finding.to_json() for finding in report.findings]}

    # ------------------------------------------------------------ ④ analytics --
    def analytics_report(self, csv_path: str = "", window_days: int = 90, **_: Any) -> dict[str, Any]:
        from .analytics import report_summary

        report = self.loop.analyze(csv_path=csv_path or None, window_days=window_days)
        return {"summary": report_summary(report), "report": to_jsonable(report)}

    def next_topics(self, window_days: int = 90, limit: int = 5, **_: Any) -> dict[str, Any]:
        report = self.loop.analyze(window_days=window_days)
        return {"recommendations": [to_jsonable(item) for item in report.recommendations[:limit]], "guards": report.guards}

    # ------------------------------------------------------------------ REA --
    def rea_analysis_plan(self, target: str = "web-client", artifacts: list[str] | None = None, product: str = "", **_: Any) -> dict[str, Any]:
        from .rea_bridge import analysis_plan

        plan = analysis_plan(target=target, artifacts=artifacts or [], product=product)
        return {"markdown": plan["markdown"], "steps": plan["steps"], "manifest_template": plan["manifest_template"], "legal_checklist": plan["legal_checklist"]}

    def rea_ingest_manifest(self, manifest_path: str, **_: Any) -> dict[str, Any]:
        from .rea_bridge import ingest_manifest

        return ingest_manifest(Path(manifest_path), store_root=self.store.root)


TOOL_SPECS: list[dict[str, Any]] = [
    {
        "name": "creatorloop_doctor",
        "description": "환경 점검: ffmpeg/libass/한국어 글꼴, TTS 백엔드, 비디오 프로바이더(키·무료쿼터·비용) 상태와 현재 라우팅 모드를 반환합니다.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "list_niches",
        "description": "① 니치 스코어카드. personal_advantage(1~5, 사람만 채울 수 있음)를 주면 점수가 개인화된 순위로 다시 계산됩니다. 에이전트가 이 값을 대신 추정하지 마세요.",
        "inputSchema": {
            "type": "object",
            "properties": {"personal_advantage": {"type": "object", "additionalProperties": {"type": "integer"}, "description": "niche_id → 1..5"}},
            "additionalProperties": False,
        },
    },
    {
        "name": "research_questions",
        "description": "특정 니치에서 사람이 직접 답해야 하는 질문 목록을 반환합니다.",
        "inputSchema": {"type": "object", "properties": {"niche_id": {"type": "string"}}, "required": ["niche_id"], "additionalProperties": False},
    },
    {
        "name": "research_brief",
        "description": "① TopicBrief 생성. 사람이 답한 answers/value_adds가 결정 로그에 기록되고 이후 모든 정책 검사의 근거가 됩니다.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "niche_id": {"type": "string"},
                "title": {"type": "string"},
                "answers": {"type": "object", "additionalProperties": {"type": "string"}},
                "value_adds": {"type": "array", "items": {"type": "object", "properties": {"kind": {"type": "string"}, "evidence": {"type": "string"}}, "required": ["evidence"]}},
                "keywords": {"type": "array", "items": {"type": "string"}},
                "sources": {"type": "array", "items": {"type": "string"}},
                "personal_advantage": {"type": "integer"},
                "video_format": {"type": "string", "enum": ["long_form", "shorts", "hybrid"]},
                "runtime_target_s": {"type": "integer"},
            },
            "required": ["niche_id", "title"],
            "additionalProperties": False,
        },
    },
    {
        "name": "draft_screenplay",
        "description": "② AI가 훅/비트/카메라 DSL/오디오 디자인까지 포함한 대본 초안을 만듭니다. variation_index를 바꾸면 훅 아키타입·비트 계획·카메라 풀이 회전해 채널 내 반복을 피합니다.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "brief_id": {"type": "string"},
                "variation_index": {"type": "integer"},
                "aspect": {"type": "string", "enum": ["16:9", "9:16", "1:1"]},
                "resolution": {"type": "string", "enum": ["720p", "1080p"]},
                "runtime_target_s": {"type": "integer"},
                "article": {"type": "string", "description": "본인이 쓴 장문 전문 (Pictory 경로)"},
                "remix_from": {"type": "string"},
            },
            "required": ["brief_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "apply_human_edits",
        "description": "② 사람이 쓴 씬 내레이션을 기록합니다. 이 텍스트는 반드시 사람이 작성한 것이어야 하며, 서버는 편집을 창작하지 않습니다. 게이트 통과 조건입니다.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "brief_id": {"type": "string"},
                "edits": {"type": "object", "additionalProperties": {"type": "string"}, "description": "scene_id → 사람이 다시 쓴 내레이션"},
                "decided_by": {"type": "string"},
            },
            "required": ["brief_id", "edits"],
            "additionalProperties": False,
        },
    },
    {
        "name": "produce_video",
        "description": "② + ③ + 정책 감사: 샷 라우팅(무료 로컬↔클라우드) → 오디오/자막 → 합성 → 제목·썸네일 최적화 → fail-closed 정책 리포트 → 업로드 번들 생성. force=true는 사람 게이트를 건너뛰지만 정책 리포트는 여전히 차단 소견을 남깁니다.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "brief_id": {"type": "string"},
                "resolution": {"type": "string", "enum": ["720p", "1080p"]},
                "aspect": {"type": "string", "enum": ["16:9", "9:16", "1:1"]},
                "budget_usd": {"type": "number"},
                "prefer_free": {"type": "boolean"},
                "native_audio": {"type": "boolean"},
                "tts": {"type": "string"},
                "media_dir": {"type": "string"},
                "fps": {"type": "integer"},
                "force": {"type": "boolean"},
            },
            "required": ["brief_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "policy_audit",
        "description": "YouTube 2025-07-15 비진정성 정책 감사 리포트(점수·소견·조치법)를 반환합니다.",
        "inputSchema": {"type": "object", "properties": {"brief_id": {"type": "string"}}, "required": ["brief_id"], "additionalProperties": False},
    },
    {
        "name": "analytics_report",
        "description": "④ YouTube Studio CSV를 인제스트해 코호트·제목 가중치 학습·가드를 포함한 리포트를 만듭니다.",
        "inputSchema": {
            "type": "object",
            "properties": {"csv_path": {"type": "string"}, "window_days": {"type": "integer"}},
            "additionalProperties": False,
        },
    },
    {
        "name": "next_topics",
        "description": "④ → ① 피드백: 기대값(EV) 기준으로 순위를 매긴 다음 주제 추천(앵글·필수 고유 기여·리스크 포함).",
        "inputSchema": {"type": "object", "properties": {"window_days": {"type": "integer"}, "limit": {"type": "integer"}}, "additionalProperties": False},
    },
    {
        "name": "project_state",
        "description": "프로젝트 목록과 단계별 진행 상태(대본/영상/정책 점수)를 반환합니다.",
        "inputSchema": {"type": "object", "properties": {"brief_id": {"type": "string"}}, "additionalProperties": False},
    },
    {
        "name": "rea_analysis_plan",
        "description": "본인이 소유한 아티팩트(웹 클라이언트/HAR/프로젝트 내보내기/APK)를 REA로 합법적으로 관찰하는 명령 플랜과 capability manifest 템플릿을 반환합니다.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "target": {"type": "string", "enum": ["web-client", "har", "project-export", "apk", "any"]},
                "artifacts": {"type": "array", "items": {"type": "string"}},
                "product": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "rea_ingest_manifest",
        "description": "capability manifest를 검증·저장하고 creator-loop 어댑터 가정값과 대조한 contract check를 만듭니다.",
        "inputSchema": {"type": "object", "properties": {"manifest_path": {"type": "string"}}, "required": ["manifest_path"], "additionalProperties": False},
    },
]


class McpServer:
    def __init__(self, home: str = "") -> None:
        self.tools = Tools(home)
        self.methods: dict[str, Callable[..., Any]] = {
            "creatorloop_doctor": self.tools.doctor,
            "list_niches": self.tools.list_niches,
            "research_questions": self.tools.research_questions,
            "research_brief": self.tools.research_brief,
            "draft_screenplay": self.tools.draft_screenplay,
            "apply_human_edits": self.tools.apply_human_edits,
            "produce_video": self.tools.produce_video,
            "policy_audit": self.tools.policy_audit,
            "analytics_report": self.tools.analytics_report,
            "next_topics": self.tools.next_topics,
            "project_state": self.tools.project_state,
            "rea_analysis_plan": self.tools.rea_analysis_plan,
            "rea_ingest_manifest": self.tools.rea_ingest_manifest,
        }

    def handle(self, message: dict[str, Any]) -> dict[str, Any] | None:
        method = message.get("method", "")
        message_id = message.get("id")
        params = message.get("params") or {}
        try:
            if method == "initialize":
                result = {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": SERVER_INFO,
                    "instructions": (
                        "creator-loop: 사람이 주제를 결정하고 AI가 제작을 자동화하는 YouTube 루프. "
                        "research_brief → draft_screenplay → apply_human_edits(사람 텍스트 필수) → produce_video → "
                        "analytics_report/next_topics 순서로 사용하세요. 정책 감사는 fail-closed입니다."
                    ),
                }
            elif method == "notifications/initialized" or method.startswith("notifications/"):
                return None
            elif method == "ping":
                result = {}
            elif method == "tools/list":
                result = {"tools": TOOL_SPECS}
            elif method == "tools/call":
                name = str(params.get("name", ""))
                arguments = params.get("arguments") or {}
                if name not in self.methods:
                    return _error(message_id, -32601, f"unknown tool: {name}")
                payload = self.methods[name](**arguments)
                result = {
                    "content": [{"type": "text", "text": json.dumps(to_jsonable(payload), ensure_ascii=False, indent=2)}],
                    "isError": False,
                }
            else:
                return _error(message_id, -32601, f"method not found: {method}")
        except Exception as error:  # tool errors are returned as MCP tool results, not protocol errors
            if method == "tools/call":
                result = {
                    "content": [{"type": "text", "text": json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False)}],
                    "isError": True,
                }
            else:
                return _error(message_id, -32603, str(error))
        if message_id is None:
            return None
        return {"jsonrpc": "2.0", "id": message_id, "result": result}

    def serve_stdio(self) -> int:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                _write(_error(None, -32700, "parse error"))
                continue
            response = self.handle(message)
            if response is not None:
                _write(response)
            sys.stdout.flush()
        return 0


def _error(message_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": message_id, "error": {"code": code, "message": message}}


def _write(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")


def main(*, transport: str = "stdio", home: str = "") -> int:
    if transport != "stdio":
        print(f"unsupported transport: {transport}", file=sys.stderr)
        return 2
    return McpServer(home).serve_stdio()


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
