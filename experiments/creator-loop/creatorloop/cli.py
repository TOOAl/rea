"""Command-line surface for the creator loop.

Every command prints a human-readable Korean summary and supports ``--json`` for
scripting.  The pipeline never uploads by itself: ``upload bundle`` writes the exact
payload a human reviews, and ``upload push`` requires an explicit OAuth token.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Sequence

from .contracts import HumanDecision, Stage, to_jsonable
from .loop import CreatorLoop, LoopOptions, _load_brand
from .policy import summarize as policy_summary
from .store import Store


def _print(payload: Any, as_json: bool, human: str = "") -> None:
    if as_json:
        print(json.dumps(to_jsonable(payload), ensure_ascii=False, indent=2))
    else:
        print(human or json.dumps(to_jsonable(payload), ensure_ascii=False, indent=2))


def _loop(args: argparse.Namespace) -> CreatorLoop:
    store = Store(args.home)
    events: list[dict[str, Any]] = []

    def on_event(event: dict[str, Any]) -> None:
        events.append(event)
        if getattr(args, "verbose", False):
            print(f"  · {event.get('type')}: " + ", ".join(f"{k}={v}" for k, v in event.items() if k != "type"), file=sys.stderr)

    return CreatorLoop(store, brand=_load_brand(args.brand), on_event=on_event)


def _options(args: argparse.Namespace) -> LoopOptions:
    return LoopOptions(
        language=getattr(args, "language", "ko-KR"),
        aspect=getattr(args, "aspect", "16:9"),
        resolution=getattr(args, "resolution", "1080p"),
        variation_index=getattr(args, "variation", 0),
        runtime_target_s=getattr(args, "runtime", 240),
        budget_usd=getattr(args, "budget", 0.0),
        prefer_free=not getattr(args, "allow_paid", False),
        native_audio=getattr(args, "native_audio", False),
        tts_backend=getattr(args, "tts", ""),
        voice_files=tuple(getattr(args, "voice_file", []) or ()),
        media_dir=getattr(args, "media", ""),
        auto_approve=getattr(args, "auto_gates", False),
        article=Path(args.article).read_text("utf-8") if getattr(args, "article", "") else "",
        remix_from=getattr(args, "remix_from", ""),
        fps=getattr(args, "fps", 30),
    )


def _pairs(values: Sequence[str], separator: str = "=") -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for value in values or ():
        if separator in value:
            key, _, rest = value.partition(separator)
            out.append((key.strip(), rest.strip()))
    return out


def _answers(values: Sequence[str]) -> dict[str, str]:
    return dict(_pairs(values, "="))


def _brief_id(loop: CreatorLoop, value: str) -> str:
    """``--brief`` accepts an id, a project directory, or a path to brief.json."""

    return loop.store.resolve_brief_id(value)


def _require_brief(loop: CreatorLoop, brief_ref: str) -> Any:
    brief_id = _brief_id(loop, brief_ref)
    brief = loop.store.load_brief(brief_id)
    if brief is None:
        known = ", ".join(loop.store.list_briefs()[-5:]) or "(없음)"
        raise SystemExit(
            f"brief not found: {brief_ref} — id/폴더/brief.json 경로를 주세요. 최근 프로젝트: {known}"
        )
    return brief


# --------------------------------------------------------------------------- #
# commands
# --------------------------------------------------------------------------- #
def cmd_doctor(args: argparse.Namespace) -> int:
    loop = _loop(args)
    report = loop.doctor()
    if args.json:
        _print(report, True)
        return 0
    ffmpeg = report["ffmpeg"]
    print(f"ffmpeg      : {ffmpeg['ffmpeg'] or 'MISSING'} (libass={ffmpeg['libass']}, zoompan={ffmpeg['filters'].get('zoompan')}, loudnorm={ffmpeg['filters'].get('loudnorm')})")
    print(f"fonts       : {report['fonts_dir'] or 'MISSING (Korean text will not render)'}")
    print(f"TTS selected: {report['tts']['selected']}")
    for backend in report["tts"]["backends"]:
        print(f"   - {backend['backend']:16} {'OK ' if backend['available'] else '--'} {backend['reason']}")
    print("providers   :")
    for provider in report["providers"]["providers"]:
        quota = provider["free_quota_units_per_day"]
        print(
            f"   - {provider['provider']:12} {'OK ' if provider['available'] else '--'} "
            f"${provider['cost_per_second_usd']}/s"
            + (f" free_units/day={quota}" if quota else "")
            + (f" ({provider['reason']})" if provider["reason"] else "")
        )
    print(f"store       : {report['store_root']} | catalog videos: {report['catalog_videos']} | human decisions: {report['human_decisions']}")
    if report["providers"]["free_only"]:
        print("\n→ 유료 키가 없어 로컬 무료 엔진(절차적 아트 + ffmpeg + 오프라인 TTS)으로 제작합니다.")
        print("  키를 추가하면 같은 샷이 자동으로 Veo/Runway/Kling/Sora로 라우팅됩니다 (creatorloop doctor 로 확인).")
    return 0


def cmd_research_niches(args: argparse.Namespace) -> int:
    loop = _loop(args)
    advantage = {key: int(value) for key, value in _pairs(args.advantage)}
    report = loop.research_options(advantage or None)
    if args.json:
        _print(report, True)
        return 0
    for row in report["ranked_niches"]:
        niche = next(n for n in report["niches"] if n["id"] == row["niche_id"])
        flag = "" if row["personal_advantage_supplied"] else "  (personal_advantage 미입력 → 참고용)"
        print(f"[{row['score']:.2f}/5] {row['niche_id']}: {niche['name']}{flag}")
        print(f"    왜: {niche['why'][:110]}...")
        print(f"    대상: {niche['audience']}")
        print(f"    수익화: {niche['monetization_notes'][:90]}")
        print(f"    리스크: {niche['risk_notes'][0][:90]}")
        print(f"    씨앗 주제: {len(niche['seed_topics'])}개 · 사람이 답할 질문 {len(niche['human_angle_questions'])}개")
    return 0


def cmd_research_questions(args: argparse.Namespace) -> int:
    loop = _loop(args)
    questions = loop.builder.questions(args.niche)
    if args.json:
        _print({"niche": args.niche, "questions": questions}, True)
        return 0
    print(f"{args.niche} — 사람이 직접 답해야 하는 질문 (답변은 결정 로그에 기록되어 수익화 근거가 됩니다)\n")
    for index, question in enumerate(questions, start=1):
        print(f"  {index}. {question}")
    return 0


def cmd_research_seeds(args: argparse.Namespace) -> int:
    loop = _loop(args)
    titles = [str(row.get("title", "")) for row in loop.store.catalog()]
    options = loop.builder.seed_topic_options(args.niche, titles)
    if args.json:
        _print(options, True)
        return 0
    for row in options:
        print(f"  [{row['freshness']:.2f} 신선도] {row['topic']}")
    return 0


def cmd_research_brief(args: argparse.Namespace) -> int:
    loop = _loop(args)
    brief = loop.research(
        args.niche,
        args.title,
        _answers(args.answer),
        value_adds=_pairs(args.value_add),
        keywords=args.keyword,
        sources=args.source,
        personal_advantage=args.advantage,
        video_format=args.format,
        runtime_target_s=args.runtime,
    )
    gap = loop.builder.gap_check(brief, loop.store.catalog())
    if args.json:
        _print({"brief": brief, "gap_check": gap}, True)
        return 0
    print(f"brief 생성: {brief.id}")
    print(f"  제목(작업용): {brief.working_title}")
    print(f"  니치: {brief.niche_id} (점수 {brief.niche_score:.2f}/5)")
    print(f"  앵글: {brief.angle}")
    print(f"  인간 결정 {len(brief.decisions)}건 · value-add {len(brief.human_value_adds)}건")
    print(f"  카탈로그 중복 검사: {gap['advice']}")
    print(f"  저장: {loop.store.project_dir(brief.id)}")
    print("\n다음: creatorloop script draft --brief " + brief.id)
    return 0


def cmd_script_draft(args: argparse.Namespace) -> int:
    loop = _loop(args)
    brief = _require_brief(loop, args.brief)
    options = _options(args)
    screenplay = loop.script(brief, options=options)
    gates = loop.check_gates(brief, screenplay, options=options)
    if args.json:
        _print({"screenplay": screenplay, "gates": gates}, True)
        return 0
    _print_screenplay(screenplay, gates)
    return 0


def _print_screenplay(screenplay: Any, gates: dict[str, Any]) -> None:
    from .screenplay import beat_summary

    print(f"screenplay: {screenplay.id}  hook={screenplay.hook_archetype}  scenes={len(screenplay.scenes)}  "
          f"예상 런타임={screenplay.estimated_runtime_s:.0f}s")
    print(f"  사람 작성 문장 비율: {screenplay.human_sourced_ratio:.0%} | 사람 편집: {screenplay.human_edited} (거리 {screenplay.human_edit_distance:.1%})")
    print(f"  variation lineage: {' → '.join(screenplay.variation_lineage)}")
    for row in beat_summary(screenplay):
        print(f"  [{row['scene_id']}|{row['beat']}|{row['origin']}] shots={row['shots']} {row['duration_s']}s :: {row['narration'][:72]}")
    print(f"\n  gates: {'PASS' if gates['passed'] else 'BLOCKED'}")
    for reason in gates["reasons"]:
        print(f"    ! {reason}")
    print("\n다음: creatorloop script edit --brief <id> --scene sc00 --text \"...\"  (사람 편집 기록)")


def cmd_script_show(args: argparse.Namespace) -> int:
    loop = _loop(args)
    brief_id = _brief_id(loop, args.brief)
    screenplay = loop.store.load_screenplay(brief_id)
    if screenplay is None:
        raise SystemExit(f"screenplay not found for {args.brief}")
    from .screenplay import beat_summary, provenance_report

    if args.json:
        _print({"screenplay": screenplay, "beats": beat_summary(screenplay), "provenance": provenance_report(screenplay)}, True)
        return 0
    _print_screenplay(screenplay, {"passed": True, "reasons": []})
    return 0


def cmd_script_edit(args: argparse.Namespace) -> int:
    loop = _loop(args)
    brief = _require_brief(loop, args.brief)
    screenplay = loop.store.load_screenplay(brief.id)
    if screenplay is None:
        raise SystemExit("draft first: creatorloop script draft")
    from .screenplay import apply_human_edits

    edits = dict(_pairs(args.text, separator="::"))
    for scene_id, text in _pairs(args.scene_text, separator="="):
        edits[scene_id] = text
    if args.from_json:
        edits.update(json.loads(Path(args.from_json).read_text("utf-8")))
    if not edits:
        raise SystemExit("no edits supplied (--scene-text sc00=... 또는 --text sc00::...)")
    screenplay = apply_human_edits(screenplay, edits, decided_by=args.by)
    for decision in screenplay.decisions[-len(edits) :]:
        loop.store.record_decision(decision, brief.id)
    loop.store.save_screenplay(screenplay)
    if args.json:
        _print(screenplay, True)
        return 0
    print(f"편집 기록: {len(edits)}개 씬 | edit_distance={screenplay.human_edit_distance:.1%} | human_edited={screenplay.human_edited} | human_ratio={screenplay.human_sourced_ratio:.0%}")
    return 0


def cmd_produce(args: argparse.Namespace) -> int:
    loop = _loop(args)
    brief = _require_brief(loop, args.brief)
    screenplay = loop.store.load_screenplay(brief.id)
    if screenplay is None:
        raise SystemExit("draft first: creatorloop script draft")
    options = _options(args)
    gates = loop.check_gates(brief, screenplay, options=options)
    if not gates["passed"]:
        print("GATE BLOCKED — 제작을 멈춥니다 (사람 게이트 미충족):")
        for reason in gates["reasons"]:
            print(f"  ! {reason}")
        if not args.force:
            return 2
        print("  (--force 로 계속 진행; 정책 리포트는 여전히 fail-closed로 평가됩니다)")
    produced = loop.produce(brief, screenplay, options=options)
    video = produced["video"]
    if args.json:
        _print({"video": video, "warnings": produced["warnings"], "highlights": produced["highlights"]}, True)
        return 0
    print(f"영상 생성: {video.path}")
    print(f"  길이 {video.duration_s:.1f}s | {video.width}x{video.height} | provider={video.provider.value} | 비용 ${video.cost_usd:.2f}")
    print(f"  내레이션 {produced['tts'].backend} ({produced['tts'].duration_s:.1f}s) | 자막 큐 {len(produced['subtitles'].cues)}개 | {video.subtitles_path}")
    print(f"  쇼트용 하이라이트 {len(produced['highlights'])}개 (produce_report.json)")
    for warning in produced["warnings"][:8]:
        print(f"  ! {warning}")
    print("\n다음: creatorloop package --brief " + brief.id)
    return 0


def cmd_package(args: argparse.Namespace) -> int:
    loop = _loop(args)
    brief = _require_brief(loop, args.brief)
    screenplay = loop.store.load_screenplay(brief.id)
    video = loop.store.load_video(brief.id)
    if video is None:
        raise SystemExit("produce first: creatorloop produce")
    produce_report = loop.store.project_dir(brief.id) / "produce_report.json"
    scene_timings = json.loads(produce_report.read_text("utf-8")).get("scene_timings", []) if produce_report.exists() else []
    package = loop.package(brief, screenplay, {"video": video, "scene_timings": scene_timings})
    if args.json:
        _print(package, True)
        return 0
    print("제목 후보 (점수순):")
    for item in package.titles[:5]:
        print(f"  [{item.score:5.1f}] ({item.archetype}) {item.title}")
        print(f"          {item.rationale}")
    print("\n썸네일 A/B/C:")
    for item in package.thumbnails:
        print(f"  {item.variant_id}: {item.path} score={item.score:.1f} mobile_legible={item.legible_at_mobile} {item.bytes // 1024}KB")
    print(f"\n설명·챕터 {len(package.chapters)}개 | 태그 {len(package.tags)}개 | 해시태그 {', '.join(package.hashtags)}")
    print(f"A/B 플랜: {package.ab_plan}")
    print(f"공개 문구: {package.disclosure_text[:80]}...")
    return 0


def cmd_policy(args: argparse.Namespace) -> int:
    loop = _loop(args)
    brief = _require_brief(loop, args.brief)
    screenplay = loop.store.load_screenplay(brief.id)
    package = loop.store.load_package(brief.id)
    video = loop.store.load_video(brief.id)
    produced = None
    if video:
        tts_path = loop.store.project_dir(brief.id) / "audio" / "narration.wav"
        produced = {
            "video": video,
            "tts": _TtsRef(str(tts_path), "unknown"),
            "composed": _ComposedRef([str(p) for p in (loop.store.project_dir(brief.id) / "work" / "frames").glob("*.png")]),
        }
    report = loop.policy_report(brief, screenplay, package, produced, uploads_last_24h=args.uploads_24h)
    if args.json:
        _print(report.to_json(), True)
        return 0
    print(policy_summary(report))
    return 0 if report.ok else 3


class _TtsRef:
    def __init__(self, path: str, backend: str) -> None:
        self.path = path
        self.backend = backend


class _ComposedRef:
    def __init__(self, frames: list[str]) -> None:
        self.frames = [Path(frame) for frame in frames]


def cmd_approve(args: argparse.Namespace) -> int:
    loop = _loop(args)
    brief = _require_brief(loop, args.brief)
    decision = loop.approve_final(brief, decided_by=args.by, note=args.note)
    print(f"최종 승인 기록: {decision.decided_at} by {decision.decided_by}")
    return 0


def cmd_analytics_import(args: argparse.Namespace) -> int:
    loop = _loop(args)
    from .analytics import ingest_studio_csv

    metrics = ingest_studio_csv(args.csv)
    count = loop.store.ingest_metrics(metrics)
    if args.json:
        _print({"imported": len(metrics), "catalog_size": count}, True)
        return 0
    print(f"{args.csv}: {len(metrics)}건 읽어 채널 카탈로그 {count}건으로 갱신했습니다.")
    return 0


def cmd_analytics_report(args: argparse.Namespace) -> int:
    loop = _loop(args)
    if args.csv:
        from .analytics import ingest_studio_csv

        loop.store.ingest_metrics(ingest_studio_csv(args.csv))
    report = loop.analyze(window_days=args.window)
    if args.json:
        _print(report, True)
        return 0
    from .analytics import report_summary

    print(report_summary(report))
    return 0


def cmd_analytics_next(args: argparse.Namespace) -> int:
    loop = _loop(args)
    report = loop.analyze(window_days=args.window)
    if args.json:
        _print(report.recommendations, True)
        return 0
    print("다음 주제 추천 (④ → ① 피드백):")
    for item in report.recommendations[:8]:
        print(f"  #{item.rank} [{item.niche_id}] {item.working_title}")
        print(f"      EV≈{item.expected_value} · 신뢰도 {item.confidence}")
        print(f"      앵글: {item.angle}")
        print(f"      근거: {' | '.join(item.rationale[:2])}")
        print(f"      필수 고유 기여: {', '.join(item.required_value_add)}")
        if item.risks:
            print(f"      리스크: {item.risks[0]}")
    return 0


def cmd_loop_run(args: argparse.Namespace) -> int:
    loop = _loop(args)
    options = _options(args)
    if args.brief:
        brief = _require_brief(loop, args.brief)
    else:
        report = loop.analyze(window_days=args.window)
        if not report.recommendations:
            raise SystemExit("추천 주제가 없습니다 — creatorloop research brief 로 직접 만드세요")
        recommendation = report.recommendations[args.pick]
        print(f"추천 #{recommendation.rank} 적용: {recommendation.working_title}")
        brief = loop.research(
            recommendation.niche_id,
            recommendation.working_title,
            _answers(args.answer),
            value_adds=_pairs(args.value_add),
            keywords=args.keyword,
            personal_advantage=args.advantage,
            runtime_target_s=options.runtime_target_s,
        )
    edits = dict(_pairs(args.scene_text, separator="="))
    run = loop.run(brief, options=options, edits=edits or None)
    if args.json:
        _print(run, True)
        return 0 if not run.blocked else 3
    print(f"\nloop run: {run.id}")
    for stage, status in run.stages.items():
        print(f"  {stage:9} {status}")
    print("  artifacts:")
    for key, value in run.artifacts.items():
        print(f"    {key:14} {value}")
    if run.blocked:
        print(f"\nBLOCKED: {run.block_reason}")
        print("→ 정책 게이트는 fail-closed입니다. 위 remediation을 반영해 다시 실행하세요.")
        return 3
    if run.next_recommendations:
        print("\n다음 주제 (④ → ①):")
        for item in run.next_recommendations[:3]:
            print(f"  #{item.rank} [{item.niche_id}] {item.working_title} (EV≈{item.expected_value}, {item.confidence})")
    return 0


def cmd_demo(args: argparse.Namespace) -> int:
    """End-to-end offline demo with clearly-labelled sample human input."""

    from .demo import run_demo

    result = run_demo(
        Store(args.home),
        resolution=args.resolution,
        niche_id=args.niche,
        runtime_target_s=args.runtime,
        analytics_csv=args.csv,
        verbose=args.verbose,
    )
    if args.json:
        _print(result, True)
        return 0
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
    return 0


def cmd_upload_bundle(args: argparse.Namespace) -> int:
    loop = _loop(args)
    brief = _require_brief(loop, args.brief)
    path = loop.store.project_dir(brief.id) / "upload.json"
    if not path.exists():
        raise SystemExit("run the loop first (creatorloop loop run --brief ...) — bundle이 아직 없습니다")
    if args.json:
        _print(json.loads(path.read_text("utf-8")), True)
        return 0
    print(path.read_text("utf-8"))
    return 0


def cmd_upload_push(args: argparse.Namespace) -> int:
    loop = _loop(args)
    result = loop.publish(_brief_id(loop, args.brief), access_token=args.token)
    _print(result, args.json, json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") else 4


def cmd_studio(args: argparse.Namespace) -> int:
    from .studio import serve

    serve(host=args.host, port=args.port, store=Store(args.home), open_browser=not args.no_browser)
    return 0


def cmd_mcp(args: argparse.Namespace) -> int:
    from .mcp_server import main as mcp_main

    return mcp_main(transport=args.transport, home=args.home)


def cmd_rea(args: argparse.Namespace) -> int:
    from .rea_bridge import analysis_plan, ingest_manifest

    if args.rea_command == "plan":
        plan = analysis_plan(target=args.target, artifacts=args.artifact)
        _print(plan, args.json, plan["markdown"])
        return 0
    manifest = ingest_manifest(Path(args.file))
    _print(manifest, args.json, json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="creatorloop", description="Authenticity-first YouTube creator loop (①리서치 → ②제작 → ③패키징 → ④분석)")
    parser.add_argument("--home", default="", help="store root (기본 ./out, 환경변수 CREATOR_LOOP_HOME)")
    parser.add_argument("--brand", default="", help="brand kit json path")
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("doctor", help="환경/키/프로바이더 점검").set_defaults(func=cmd_doctor)

    research = sub.add_parser("research", help="① 니치 리서치 데스크")
    research_sub = research.add_subparsers(dest="subcommand", required=True)
    niches = research_sub.add_parser("niches", help="니치 스코어 카드")
    niches.add_argument("--advantage", action="append", default=[], help="niche_id=1..5 (사람만 채울 수 있는 값)")
    niches.set_defaults(func=cmd_research_niches)
    questions = research_sub.add_parser("questions", help="사람이 답해야 할 질문 출력")
    questions.add_argument("--niche", required=True)
    questions.set_defaults(func=cmd_research_questions)
    seeds = research_sub.add_parser("seeds", help="씨앗 주제 + 카탈로그 신선도")
    seeds.add_argument("--niche", required=True)
    seeds.set_defaults(func=cmd_research_seeds)
    brief_cmd = research_sub.add_parser("brief", help="TopicBrief 생성 (사람 결정 기록)")
    brief_cmd.add_argument("--niche", required=True)
    brief_cmd.add_argument("--title", required=True)
    brief_cmd.add_argument("--answer", action="append", default=[], help="question=answer")
    brief_cmd.add_argument("--value-add", action="append", default=[], help="kind=evidence (personal_experience|original_data|...)")
    brief_cmd.add_argument("--keyword", action="append", default=[])
    brief_cmd.add_argument("--source", action="append", default=[])
    brief_cmd.add_argument("--advantage", type=int, default=None)
    brief_cmd.add_argument("--format", default="long_form", choices=["long_form", "shorts", "hybrid"])
    brief_cmd.add_argument("--runtime", type=int, default=240)
    brief_cmd.set_defaults(func=cmd_research_brief)

    script = sub.add_parser("script", help="② 대본/스토리보드")
    script_sub = script.add_subparsers(dest="subcommand", required=True)
    _add_production_flags(script_sub.add_parser("draft", help="AI 초안 생성")).set_defaults(func=cmd_script_draft)
    show = script_sub.add_parser("show", help="대본 보기")
    show.add_argument("--brief", required=True)
    show.set_defaults(func=cmd_script_show)
    edit = script_sub.add_parser("edit", help="사람 편집 기록 (게이트/정책 근거)")
    edit.add_argument("--brief", required=True)
    edit.add_argument("--scene-text", action="append", default=[], help="sc00=새 문장")
    edit.add_argument("--text", action="append", default=[], help="sc00::새 문장")
    edit.add_argument("--from-json", default="")
    edit.add_argument("--by", default="human")
    edit.set_defaults(func=cmd_script_edit)

    produce = sub.add_parser("produce", help="② 영상 렌더 (라우팅+오디오+자막)")
    _add_production_flags(produce)
    produce.add_argument("--force", action="store_true")
    produce.set_defaults(func=cmd_produce)

    package = sub.add_parser("package", help="③ 제목·썸네일 최적화")
    package.add_argument("--brief", required=True)
    package.set_defaults(func=cmd_package)

    policy = sub.add_parser("policy", help="정책 감사 (fail-closed)")
    policy_sub = policy.add_subparsers(dest="subcommand", required=True)
    audit = policy_sub.add_parser("audit")
    audit.add_argument("--brief", required=True)
    audit.add_argument("--uploads-24h", type=int, default=0)
    audit.set_defaults(func=cmd_policy)

    approve = sub.add_parser("approve", help="최종 승인 게이트 기록")
    approve.add_argument("--brief", required=True)
    approve.add_argument("--note", default="")
    approve.add_argument("--by", default="human")
    approve.set_defaults(func=cmd_approve)

    analytics = sub.add_parser("analytics", help="④ 데이터 분석")
    analytics_sub = analytics.add_subparsers(dest="subcommand", required=True)
    ingest = analytics_sub.add_parser("import", help="YouTube Studio CSV 가져오기")
    ingest.add_argument("--csv", required=True)
    ingest.set_defaults(func=cmd_analytics_import)
    report = analytics_sub.add_parser("report")
    report.add_argument("--csv", default="")
    report.add_argument("--window", type=int, default=90)
    report.set_defaults(func=cmd_analytics_report)
    next_topics = analytics_sub.add_parser("next", help="다음 주제 추천")
    next_topics.add_argument("--window", type=int, default=90)
    next_topics.set_defaults(func=cmd_analytics_next)

    loop_cmd = sub.add_parser("loop", help="전체 루프 실행")
    loop_sub = loop_cmd.add_subparsers(dest="subcommand", required=True)
    run = loop_sub.add_parser("run")
    _add_production_flags(run)
    run.add_argument("--pick", type=int, default=0, help="brief 없으면 분석 추천 n번째를 사용")
    run.add_argument("--answer", action="append", default=[])
    run.add_argument("--value-add", action="append", default=[])
    run.add_argument("--keyword", action="append", default=[])
    run.add_argument("--advantage", type=int, default=None)
    run.add_argument("--scene-text", action="append", default=[], help="sc00=사람이 다시 쓴 문장")
    run.add_argument("--window", type=int, default=90)
    run.set_defaults(func=cmd_loop_run)

    demo = sub.add_parser("demo", help="오프라인 전체 루프 데모 (샘플 사람 입력 포함)")
    demo.add_argument("--resolution", default="1080p", choices=["720p", "1080p"])
    demo.add_argument("--niche", default="solo_tax_kr")
    demo.add_argument("--runtime", type=int, default=120)
    demo.add_argument("--csv", default="")
    demo.set_defaults(func=cmd_demo)

    upload = sub.add_parser("upload", help="업로드 번들/푸시 (푸시는 토큰 필요)")
    upload_sub = upload.add_subparsers(dest="subcommand", required=True)
    bundle = upload_sub.add_parser("bundle")
    bundle.add_argument("--brief", required=True)
    bundle.set_defaults(func=cmd_upload_bundle)
    push = upload_sub.add_parser("push")
    push.add_argument("--brief", required=True)
    push.add_argument("--token", default="", help="OAuth access token (권장: 환경변수 YOUTUBE_ACCESS_TOKEN)")
    push.set_defaults(func=cmd_upload_push)

    studio = sub.add_parser("studio", help="로컬 웹 스튜디오 (①②③④ 대시보드)")
    studio.add_argument("--host", default="0.0.0.0")
    studio.add_argument("--port", type=int, default=8787)
    studio.add_argument("--no-browser", action="store_true")
    studio.set_defaults(func=cmd_studio)

    mcp = sub.add_parser("mcp", help="MCP 서버 (에이전트 도구 노출)")
    mcp.add_argument("--transport", default="stdio", choices=["stdio"])
    mcp.set_defaults(func=cmd_mcp)

    rea = sub.add_parser("rea", help="REA 연동: 합법적 아티팩트 분석 플랜/결과 인제스트")
    rea_sub = rea.add_subparsers(dest="rea_command", required=True)
    plan = rea_sub.add_parser("plan", help="REA 명령 플랜 생성")
    plan.add_argument("--target", default="web-client", choices=["web-client", "project-export", "har", "apk", "any"])
    plan.add_argument("--artifact", action="append", default=[])
    plan.set_defaults(func=cmd_rea)
    ingest_cmd = rea_sub.add_parser("ingest", help="capability manifest json 인제스트")
    ingest_cmd.add_argument("--file", required=True)
    ingest_cmd.set_defaults(func=cmd_rea)

    return parser


def _add_production_flags(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument("--brief", default="")
    parser.add_argument("--language", default="ko-KR")
    parser.add_argument("--aspect", default="16:9", choices=["16:9", "9:16", "1:1"])
    parser.add_argument("--resolution", default="1080p", choices=["720p", "1080p"])
    parser.add_argument("--variation", type=int, default=0)
    parser.add_argument("--runtime", type=int, default=240)
    parser.add_argument("--budget", type=float, default=0.0, help="유료 API 예산 USD (0 = 무료 전용)")
    parser.add_argument("--allow-paid", action="store_true", help="유료 프로바이더 사용 허용")
    parser.add_argument("--native-audio", action="store_true", help="네이티브 오디오 생성 샷 요구 (Veo/Sora)")
    parser.add_argument("--tts", default="", help="edge-tts|openai-tts|elevenlabs|google-tts|espeak-ng|human-recording|silent")
    parser.add_argument("--voice-file", action="append", default=[], help="본인 녹음 WAV (씬 순서대로)")
    parser.add_argument("--media", default="", help="본인 영상/이미치 라이브러리 디렉터리")
    parser.add_argument("--article", default="", help="장문 텍스트 파일 (Pictory 스타일 변환)")
    parser.add_argument("--remix-from", default="", help="기존 brief_id 를 소스로 리믹스")
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--auto-gates", action="store_true", help="게이트를 자동 통과로 기록 (정책 리포트는 그대로 평가)")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "home", ""):
        args.home = ""
    try:
        return int(args.func(args) or 0)
    except SystemExit:
        raise
    except KeyboardInterrupt:
        print("\ninterrupted", file=sys.stderr)
        return 130
    except Exception as error:  # keep the CLI usable: show the reason, not a stack
        if getattr(args, "verbose", False):
            raise
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
