"""The integrated loop: ① human topic strategy → ② AI production → ③ packaging → ④ analytics → ①.

Design rules this module enforces:

* **Fail-closed authenticity.** Production stops before finalization when the policy
  report has any blocking finding; the run record keeps the reason and the remediation.
* **Human gates are evidence, not clicks.** A gate passes only when a recorded human
  decision exists (topic choice + angle answers, script edits, final approval).
* **Everything is an artifact.** Each stage writes JSON/media into the project
  directory, so a run can be inspected, replayed or audited later.
* **The loop closes.** Analytics output becomes ranked topic recommendations that are
  attached to the run and pre-fill the next research desk session.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Sequence

from .analytics import ReportInputs, build_report, ingest_studio_csv
from .art import DEFAULT_BRAND
from .audio import backend_doctor, select_tts
from .captions import CaptionStyle, build_subtitles, highlight_candidates
from .contracts import (
    HumanDecision,
    LoopRun,
    PolicyReport,
    ProducedVideo,
    ProviderId,
    Screenplay,
    Stage,
    TopicBrief,
    VideoMetrics,
    new_id,
    utcnow,
)
from .direction import continuity_report, storyboard
from .packaging import PackagingInputs, optimize_package
from .policy import DISCLOSURE_KO, PolicyEngine, PolicyInputs, audio_signature, image_dhash, structure_signature
from .providers.base import Budget
from .providers.images import default_chain, resolve_still
from .providers.router import ProviderRegistry, execute_plan, plan_shots
from .render import ComposeResult, compose_video, doctor as ffmpeg_doctor, geometry, probe
from .research import BriefBuilder, NicheLibrary
from .screenplay import (
    apply_human_edits,
    article_to_screenplay,
    draft_screenplay,
    narration_segments_for_tts,
    remix,
)
from .store import Store


@dataclass(slots=True)
class LoopOptions:
    language: str = "ko-KR"
    aspect: str = "16:9"
    resolution: str = "1080p"
    variation_index: int = 0
    runtime_target_s: int = 240
    budget_usd: float = 0.0
    prefer_free: bool = True
    native_audio: bool = False
    tts_backend: str = ""
    voice_files: tuple[str, ...] = ()
    media_dir: str = ""
    gates: tuple[str, ...] = ("topic", "script", "final")
    auto_approve: bool = False
    article: str = ""
    remix_from: str = ""
    publish: bool = False
    fps: int = 30
    max_shots: int = 0
    catalog_window: int = 12


@dataclass(slots=True)
class StageResult:
    stage: str
    ok: bool
    artifacts: dict[str, str] = field(default_factory=dict)
    detail: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    elapsed_s: float = 0.0


class CreatorLoop:
    def __init__(
        self,
        store: Store | None = None,
        *,
        registry: ProviderRegistry | None = None,
        brand: dict[str, Any] | None = None,
        library: NicheLibrary | None = None,
        policy: PolicyEngine | None = None,
        on_event: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self.store = store or Store()
        self.registry = registry or ProviderRegistry(quota_path=self.store.root / "quota.json")
        self.brand = {**DEFAULT_BRAND, **(brand or _load_brand())}
        self.library = library or NicheLibrary()
        self.builder = BriefBuilder(self.library)
        self.policy = policy or PolicyEngine()
        self.emit = on_event or (lambda event: None)

    # ------------------------------------------------------------------ ① --
    def research(
        self,
        niche_id: str,
        working_title: str,
        answers: dict[str, str] | None = None,
        *,
        value_adds: Sequence[tuple[str, str]] = (),
        keywords: Sequence[str] = (),
        sources: Sequence[str] = (),
        personal_advantage: int | None = None,
        video_format: str = "long_form",
        runtime_target_s: int = 240,
    ) -> TopicBrief:
        started = time.time()
        brief = self.builder.build(
            niche_id,
            working_title,
            answers,
            value_adds=value_adds,
            keywords=keywords,
            sources=sources,
            personal_advantage=personal_advantage,
            video_format=video_format,
            runtime_target_s=runtime_target_s,
        )
        for decision in brief.decisions:
            self.store.record_decision(decision, brief.id)
        self.store.save_brief(brief)
        gap = self.builder.gap_check(brief, self.store.catalog())
        self.store.save_any(brief.id, "research.json", {"gap_check": gap, "niche": niche_id, "generated_at": utcnow()})
        self.emit(
            {
                "type": "stage_done",
                "stage": Stage.RESEARCH.value,
                "brief_id": brief.id,
                "decisions": len(brief.decisions),
                "elapsed_s": round(time.time() - started, 2),
            }
        )
        return brief

    def research_options(self, personal_advantage: dict[str, int] | None = None) -> dict[str, Any]:
        from .research import research_report

        report = research_report(self.library, personal_advantage)
        report["catalog_titles"] = [str(row.get("title", "")) for row in self.store.catalog()][-20:]
        report["doctor"] = self.doctor()
        return report

    # ------------------------------------------------------------------ ② --
    def script(
        self,
        brief: TopicBrief,
        *,
        options: LoopOptions | None = None,
        edits: dict[str, str] | None = None,
    ) -> Screenplay:
        started = time.time()
        options = options or LoopOptions()
        if options.article:
            screenplay = article_to_screenplay(
                options.article, brief=brief, aspect=options.aspect, language=options.language, title=brief.working_title
            )
        else:
            screenplay = draft_screenplay(
                brief,
                variation_index=options.variation_index,
                aspect=options.aspect,
                language=options.language,
                runtime_target_s=options.runtime_target_s or brief.runtime_target_s,
            )
        if options.remix_from:
            previous = self.store.load_screenplay(options.remix_from)
            if previous:
                screenplay = remix(previous, variation_index=options.variation_index + 1, brief=brief)
            else:
                screenplay.record(
                    HumanDecision(
                        stage=Stage.SCRIPT,
                        question="리믹스 소스 확인",
                        answer=f"remix_from={options.remix_from} not found — drafted fresh",
                        kind="note",
                        decided_by="system",
                    )
                )
        if edits:
            screenplay = apply_human_edits(screenplay, edits)
        for decision in screenplay.decisions:
            self.store.record_decision(decision, brief.id)
        self.store.save_screenplay(screenplay)
        self.store.save_any(
            brief.id,
            "storyboard.json",
            {"shots": storyboard(screenplay), "continuity": continuity_report(screenplay)},
        )
        self.emit(
            {
                "type": "stage_done",
                "stage": Stage.SCRIPT.value,
                "brief_id": brief.id,
                "screenplay_id": screenplay.id,
                "scenes": len(screenplay.scenes),
                "human_sourced_ratio": screenplay.human_sourced_ratio,
                "elapsed_s": round(time.time() - started, 2),
            }
        )
        return screenplay

    def produce(
        self,
        brief: TopicBrief,
        screenplay: Screenplay,
        *,
        options: LoopOptions | None = None,
    ) -> dict[str, Any]:
        started = time.time()
        options = options or LoopOptions()
        width, height = geometry(options.aspect, options.resolution)
        project_dir = self.store.project_dir(brief.id)
        assets_dir = project_dir / "assets"
        assets_dir.mkdir(parents=True, exist_ok=True)
        warnings: list[str] = []

        budget = Budget(max_usd=options.budget_usd, prefer_free=options.prefer_free)
        plan = plan_shots(screenplay, self.registry, budget=budget, native_audio=options.native_audio)
        self.store.save_any(brief.id, "render_plan.json", plan)

        # Resolve stills for shots the local renderer must draw (and for provider references).
        shot_notes: dict[str, list[str]] = {}
        sources = default_chain(self.brand, options.media_dir or None, seed_text=brief.working_title)
        shot_index = 0
        for scene in screenplay.scenes:
            for shot in scene.shots:
                needs_still = shot.asset_kind in ("generated_still", "screen_recording") or bool(shot.first_frame) is False
                if needs_still:
                    destination = assets_dir / f"{shot.id}.png"
                    asset, notes = resolve_still(shot, destination, sources, index=shot_index)
                    warnings.extend(notes)
                    if asset:
                        shot.first_frame = asset.path
                        shot.asset_uri = asset.path
                        if asset.source == "procedural":
                            shot_notes.setdefault(shot.id, []).append("local procedural art (no generative provider available)")
                    else:
                        shot_notes.setdefault(shot.id, []).append("no image source produced a still")
                if shot.asset_kind == "screen_recording":
                    shot_notes.setdefault(shot.id, []).append(
                        "screen_recording slot: supply your own capture for the strongest originality evidence (--media)"
                    )
                shot_index += 1

        # Provider shots (paid or local clip render) — routed with fallbacks.
        assets = execute_plan(plan, self.registry, output_dir=assets_dir, on_event=self.emit)
        shot_assets: dict[str, str] = {}
        for asset in assets:
            if asset.uri:
                shot_assets[asset.shot_id] = asset.uri
            for note in asset.warnings:
                shot_notes.setdefault(asset.shot_id, []).append(note)

        # Narration + captions
        segments_text = narration_segments_for_tts(screenplay)
        backend, backend_notes = select_tts(options.language, options.voice_files, options.tts_backend)
        warnings.extend(backend_notes)
        self.emit({"type": "tts_start", "backend": backend.name, "segments": len(segments_text)})
        tts = backend.synthesize_segments(
            segments_text, language=options.language, out_dir=project_dir / "audio"
        )
        warnings.extend(tts.warnings)
        subtitles = build_subtitles(
            tts.segments,
            language=options.language,
            project_dir=project_dir,
            style=CaptionStyle(fontname=str(self.brand.get("fonts", {}).get("extrabold", "NanumGothicExtraBold")), width=width, height=height),
        )
        warnings.extend(subtitles.reading_speed_warnings)
        self.store.save_any(brief.id, "subtitles.json", subtitles)

        composed: ComposeResult = compose_video(
            screenplay,
            project_dir=project_dir,
            narration_segments=tts.segments,
            shot_assets=shot_assets,
            subtitles_ass=Path(subtitles.ass_path),
            fonts_dir=_fonts_dir(),
            brand=self.brand,
            width=width,
            height=height,
            fps=options.fps,
            seed_text=brief.working_title,
            title=brief.working_title,
            disclosure=DISCLOSURE_KO,
            audio_design=screenplay.audio,
            on_event=self.emit,
            shot_notes=shot_notes,
        )
        warnings.extend(composed.warnings)

        video = ProducedVideo(
            id=new_id("video"),
            brief_id=brief.id,
            screenplay_id=screenplay.id,
            package_id="",
            path=str(composed.path),
            duration_s=composed.duration_s,
            width=composed.width,
            height=composed.height,
            provider=plan.provider,
            has_audio=True,
            subtitles_path=subtitles.srt_path,
            poster_path=str(composed.poster),
            cost_usd=round(sum(asset.cost_usd for asset in assets), 4),
            elapsed_s=round(time.time() - started, 2),
        )
        self.store.save_video(video)
        highlights = highlight_candidates(tts.segments)
        self.store.save_any(
            brief.id,
            "produce_report.json",
            {
                "video": video,
                "provider_plan": {"provider": plan.provider.value, "reason": plan.reason, "shots": len(plan.shots)},
                "assets": assets,
                "tts": {"backend": tts.backend, "voice": tts.voice, "duration_s": tts.duration_s, "segments": len(tts.segments)},
                "scene_timings": composed.scene_timings,
                "highlights": highlights,
                "storyboard": storyboard(screenplay),
                "continuity": continuity_report(screenplay),
                "warnings": warnings[:40],
                "generated_at": utcnow(),
            },
        )
        self.emit(
            {
                "type": "stage_done",
                "stage": Stage.PRODUCE.value,
                "brief_id": brief.id,
                "video": str(composed.path),
                "duration_s": composed.duration_s,
                "tts_backend": tts.backend,
                "elapsed_s": round(time.time() - started, 2),
            }
        )
        return {
            "video": video,
            "composed": composed,
            "subtitles": subtitles,
            "tts": tts,
            "plan": plan,
            "assets": assets,
            "highlights": highlights,
            "warnings": warnings,
            "scene_timings": composed.scene_timings,
        }

    # ------------------------------------------------------------------ ③ --
    def package(
        self,
        brief: TopicBrief,
        screenplay: Screenplay | None,
        produced: dict[str, Any],
        *,
        weights: dict[str, float] | None = None,
    ) -> Any:
        started = time.time()
        video: ProducedVideo = produced["video"]
        inputs = PackagingInputs(
            brief=brief,
            screenplay=screenplay,
            scene_timings=produced.get("scene_timings", []),
            brand=self.brand,
            weights=weights or self.store.weights(),
            video_path=Path(video.path),
        )
        package = optimize_package(inputs)
        video.package_id = package.id
        self.store.save_video(video)
        self.store.save_package(package)
        self.emit(
            {
                "type": "stage_done",
                "stage": Stage.PACKAGE.value,
                "brief_id": brief.id,
                "package_id": package.id,
                "best_title": package.best_title,
                "thumbnails": len(package.thumbnails),
                "elapsed_s": round(time.time() - started, 2),
            }
        )
        return package

    # -------------------------------------------------------------- policy --
    def policy_report(
        self,
        brief: TopicBrief,
        screenplay: Screenplay | None,
        package: Any | None,
        produced: dict[str, Any] | None,
        *,
        disclosure_set: bool = True,
        uploads_last_7_days: int | None = None,
        uploads_last_24h: int = 0,
    ) -> PolicyReport:
        composed: ComposeResult | None = produced.get("composed") if produced else None
        narration_path = ""
        if produced and produced.get("tts"):
            narration_path = produced["tts"].path
        report = self.policy.evaluate(
            PolicyInputs(
                brief=brief,
                screenplay=screenplay,
                catalog=self.store.catalog(),
                title=(package.best_title if package else brief.working_title),
                narration_path=narration_path,
                frame_paths=[str(frame) for frame in (composed.frames if composed else [])],
                narration_backend=(produced["tts"].backend if produced and produced.get("tts") else ""),
                uploads_last_7_days=(
                    uploads_last_7_days if uploads_last_7_days is not None else self.uploads_last(days=7)
                ),
                uploads_last_24h=uploads_last_24h,
                approved_gates=tuple(self._approved_gates(brief, screenplay)),
                disclosure_set=disclosure_set,
                synthetic_media=True,
                reused_sources=bool(brief.sources),
            )
        )
        self.store.save_policy(report, brief.id)
        self.emit({"type": "policy", "brief_id": brief.id, "ok": report.ok, "score": report.score, "findings": len(report.findings)})
        return report

    # ------------------------------------------------------------------ ④ --
    def analyze(
        self,
        *,
        csv_path: Path | str | None = None,
        window_days: int = 90,
        personal_advantage: dict[str, int] | None = None,
    ) -> Any:
        started = time.time()
        metrics: list[VideoMetrics] = []
        if csv_path:
            metrics.extend(ingest_studio_csv(csv_path))
        metrics.extend(self.store.catalog_metrics())
        deduped = _dedupe_metrics(metrics)
        if deduped:
            self.store.ingest_metrics(deduped)
        report = build_report(
            ReportInputs(
                metrics=deduped,
                catalog=self.store.catalog(),
                window_days=window_days,
                niche_library=self.library,
                personal_advantage=personal_advantage,
                uploads_last_7_days=self.uploads_last(days=7),
            )
        )
        self.store.save_analytics(report)
        if report.weight_updates:
            weights = {**self.store.weights(), **report.weight_updates, "_samples": report.weight_updates.get("_samples", 0)}
            self.store.save_weights({key: float(value) for key, value in weights.items()})
        self.emit(
            {
                "type": "stage_done",
                "stage": Stage.ANALYZE.value,
                "report_id": report.id,
                "videos": report.videos,
                "recommendations": len(report.recommendations),
                "elapsed_s": round(time.time() - started, 2),
            }
        )
        return report

    def uploads_last(self, *, days: int) -> int:
        cutoff = time.time() - days * 86400
        count = 0
        for row in self.store.catalog():
            stamp = row.get("created_at", "")
            try:
                moment = time.mktime(time.strptime(stamp[:19], "%Y-%m-%dT%H:%M:%S"))
            except ValueError:
                continue
            if moment >= cutoff:
                count += 1
        return count

    # ---------------------------------------------------------------- loop --
    def run(self, brief: TopicBrief, *, options: LoopOptions | None = None, edits: dict[str, str] | None = None) -> LoopRun:
        options = options or LoopOptions()
        run = LoopRun(id=new_id("run"), brief_id=brief.id)
        self.store.save_brief(brief)

        run.stages[Stage.RESEARCH.value] = "done"
        run.artifacts["brief"] = str(self.store.project_dir(brief.id) / "brief.json")
        run.decisions.extend(brief.decisions)

        screenplay = self.script(brief, options=options, edits=edits)
        run.screenplay_id = screenplay.id
        run.stages[Stage.SCRIPT.value] = "done"
        run.artifacts["screenplay"] = str(self.store.project_dir(brief.id) / "screenplay.json")
        run.decisions.extend(screenplay.decisions)

        gate_report = self.check_gates(brief, screenplay, options=options)
        if not gate_report["passed"]:
            run.blocked = True
            run.block_reason = "; ".join(gate_report["reasons"])
            run.stages[Stage.PRODUCE.value] = "blocked"
            self.store.save_run(run)
            self.emit({"type": "blocked", "stage": "gates", "reasons": gate_report["reasons"]})
            return run

        produced = self.produce(brief, screenplay, options=options)
        video: ProducedVideo = produced["video"]
        run.produced_video_id = video.id
        run.stages[Stage.PRODUCE.value] = "done"
        run.artifacts["video"] = video.path
        run.artifacts["subtitles"] = video.subtitles_path
        run.artifacts["produce_report"] = str(self.store.project_dir(brief.id) / "produce_report.json")

        package = self.package(brief, screenplay, produced)
        run.package_id = package.id
        run.stages[Stage.PACKAGE.value] = "done"
        run.artifacts["package"] = str(self.store.project_dir(brief.id) / "package.json")
        run.artifacts["thumbnails"] = ", ".join(item.path for item in package.thumbnails)

        report = self.policy_report(brief, screenplay, package, produced)
        run.policy_report_id = report.id
        run.artifacts["policy"] = str(self.store.project_dir(brief.id) / "policy.json")
        if not report.ok:
            run.blocked = True
            run.block_reason = f"policy blocked (score {report.score}): " + "; ".join(
                finding.code for finding in report.findings if finding.severity.value == "block"
            )
            run.stages[Stage.PUBLISH.value] = "blocked"
            self.store.save_run(run)
            self.emit({"type": "blocked", "stage": "policy", "reasons": [run.block_reason]})
            return run
        run.stages[Stage.PUBLISH.value] = "ready_for_human"
        upload_bundle = self.build_upload_bundle(brief, screenplay, package, video, report)
        run.artifacts["upload_bundle"] = str(upload_bundle)

        self.remember(brief, screenplay, video, package, report, produced)

        analytics = self.analyze()
        run.analytics_report_id = analytics.id
        run.next_recommendations = analytics.recommendations[:5]
        run.stages[Stage.ANALYZE.value] = "done"
        run.artifacts["analytics"] = str(self.store.root / "analytics" / f"{analytics.id}.json")
        run.finished_at = utcnow()
        self.store.save_run(run)
        self.emit({"type": "loop_done", "run_id": run.id, "blocked": run.blocked})
        return run

    def check_gates(self, brief: TopicBrief, screenplay: Screenplay | None, *, options: LoopOptions | None = None) -> dict[str, Any]:
        options = options or LoopOptions()
        reasons: list[str] = []
        if "topic" in options.gates:
            decisions = [decision for decision in brief.decisions if decision.stage is Stage.RESEARCH]
            if len(decisions) < 3:
                reasons.append(f"topic gate: 인간 결정 {len(decisions)}건 < 3건 (research 질문 답변 필요)")
            if not brief.human_value_adds:
                reasons.append("topic gate: 근거가 있는 value-add가 0건입니다")
        if "script" in options.gates and screenplay is not None:
            if not screenplay.human_edited and not options.article:
                reasons.append(
                    f"script gate: 사람 편집 0건 + 사람 작성 문장 비율 {screenplay.human_sourced_ratio:.0%} < 35% "
                    "(script --edit로 훅·근거·결론을 직접 다시 쓰거나 brief 답변/value-add를 보강하세요)"
                )
        if options.auto_approve:
            reasons = [reason for reason in reasons if "value-add" in reason]
        return {"passed": not reasons, "reasons": reasons}

    def _approved_gates(self, brief: TopicBrief, screenplay: Screenplay | None) -> list[str]:
        approved: list[str] = []
        if any(decision.stage is Stage.RESEARCH for decision in brief.decisions):
            approved.append("topic")
        if screenplay and (screenplay.human_edited or any(decision.kind == "edit" for decision in screenplay.decisions)):
            approved.append("script")
        if screenplay and any("final" in decision.question.lower() or decision.question.startswith("최종") for decision in screenplay.decisions):
            approved.append("final")
        return approved

    def approve_final(self, brief: TopicBrief, *, decided_by: str = "human", note: str = "") -> HumanDecision:
        decision = HumanDecision(
            stage=Stage.PUBLISH,
            question="최종 승인 (업로드 준비 완료)",
            answer=note or "approved",
            kind="approval",
            decided_by=decided_by,
            evidence=f"brief={brief.id}",
        )
        self.store.record_decision(decision, brief.id)
        screenplay = self.store.load_screenplay(brief.id)
        if screenplay:
            screenplay.decisions.append(decision)
            self.store.save_screenplay(screenplay)
        return decision

    def remember(
        self,
        brief: TopicBrief,
        screenplay: Screenplay | None,
        video: ProducedVideo,
        package: Any,
        report: PolicyReport,
        produced: dict[str, Any],
    ) -> None:
        """Write channel memory so the next run can measure its own variation."""

        composed: ComposeResult | None = produced.get("composed")
        frame_hashes = [image_dhash(frame) for frame in (composed.frames if composed else [])]
        narration_path = produced["tts"].path if produced.get("tts") else ""
        record = {
            "video_id": video.id,
            "title": package.best_title if package else brief.working_title,
            "brief_id": brief.id,
            "niche_id": brief.niche_id,
            "angle": brief.angle,
            "hook_archetype": screenplay.hook_archetype if screenplay else "",
            "format": brief.format,
            "narration_text": screenplay.narration_text if screenplay else "",
            "structure": screenplay.structure_signature if screenplay else {},
            "frame_hashes": [hashes for hashes in frame_hashes if hashes],
            "audio_signature": audio_signature(narration_path) if narration_path else None,
            "policy_score": report.score,
            "human_sourced_ratio": screenplay.human_sourced_ratio if screenplay else 0.0,
            "created_at": utcnow(),
            "metrics": {
                "video_id": video.id,
                "title": package.best_title if package else brief.working_title,
                "published_at": utcnow(),
                "brief_id": brief.id,
                "niche_id": brief.niche_id,
                "angle": brief.angle,
                "hook_archetype": screenplay.hook_archetype if screenplay else "",
                "thumbnail_variant": package.thumbnails[0].variant_id if package and package.thumbnails else "",
                "format": brief.format,
                "runtime_s": video.duration_s,
                # Zeroed until the human imports the Studio export for this video.
                "views": 0,
                "impressions": 0,
                "ctr": 0.0,
                "avg_pct_viewed": 0.0,
                "avg_view_duration_s": 0.0,
                "watch_time_h": 0.0,
                "subscribers_gained": 0,
                "estimated_revenue": 0.0,
                "rpm": 0.0,
            },
        }
        self.store.append_catalog(record)

    def build_upload_bundle(
        self, brief: TopicBrief, screenplay: Screenplay | None, package: Any, video: ProducedVideo, report: PolicyReport
    ) -> Path:
        """Human-executable upload payload (this pipeline never uploads on its own by default)."""

        bundle = {
            "generated_at": utcnow(),
            "video_file": video.path,
            "title": package.best_title if package else brief.working_title,
            "title_candidates": [{"title": item.title, "score": item.score} for item in (package.titles if package else [])],
            "description": package.description if package else "",
            "tags": package.tags if package else [],
            "hashtags": package.hashtags if package else [],
            "thumbnails": [{"variant": item.variant_id, "path": item.path, "score": item.score} for item in (package.thumbnails if package else [])],
            "subtitles": {"path": video.subtitles_path, "language": brief.keywords and screenplay.language if screenplay else "ko-KR"},
            "category": "22" if brief.niche_id == "solo_tax_kr" else "27",
            "privacyStatus": "private",
            "altered_or_synthetic_content": True,
            "disclosure_text": package.disclosure_text if package else DISCLOSURE_KO,
            "pinned_comment": package.pinned_comment if package else "",
            "ab_test_plan": package.ab_plan if package else "",
            "policy": {"score": report.score, "ok": report.ok, "findings": [finding.to_json() for finding in report.findings]},
            "human_checklist": [
                "영상을 직접 보고 사실과 다른 부분이 없는지 확인",
                "수치·연도·출처를 원본과 대조",
                "Studio에서 '변형되거나 합성된 콘텐츠' 토글 켜기",
                "썸네일 3종을 Test & Compare에 등록",
                "업로드 후 48시간 내 댓글로 나온 질문에 정정/보강 계획 확인",
            ],
        }
        return self.store.save_any(brief.id, "upload.json", bundle)

    def publish(self, brief_id: str, *, access_token: str = "") -> dict[str, Any]:
        """Optional YouTube Data API v3 upload.  Requires explicit human action + OAuth token."""

        bundle_path = self.store.project_dir(brief_id) / "upload.json"
        if not bundle_path.exists():
            return {
                "ok": False,
                "reason": f"upload bundle missing: {bundle_path} — run `creatorloop loop run --brief {brief_id}` first",
            }
        bundle = json.loads(bundle_path.read_text("utf-8"))
        video = self.store.load_video(brief_id)
        if not video or not Path(video.path).exists():
            return {"ok": False, "reason": "video file missing"}
        token = access_token or _youtube_token()
        if not token:
            return {
                "ok": False,
                "reason": "YOUTUBE_ACCESS_TOKEN not set — upload manually with the generated bundle",
                "bundle": str(bundle_path),
            }
        import urllib.request

        metadata = {
            "snippet": {
                "title": bundle["title"],
                "description": bundle["description"],
                "tags": bundle["tags"],
                "categoryId": bundle.get("category", "22"),
                "defaultLanguage": "ko",
            },
            "status": {
                "privacyStatus": bundle.get("privacyStatus", "private"),
                "selfDeclaredMadeForKids": False,
                "containsSyntheticMedia": True,
            },
        }
        url = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
        request = urllib.request.Request(url, method="POST")
        request.add_header("Authorization", f"Bearer {token}")
        request.add_header("Content-Type", "application/json; charset=UTF-8")
        request.add_header("X-Upload-Content-Type", "video/mp4")
        request.add_header("X-Upload-Content-Length", str(Path(video.path).stat().st_size))
        request.data = json.dumps(metadata).encode("utf-8")
        try:
            with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310
                location = response.headers.get("Location", "")
        except Exception as error:  # pragma: no cover - requires credentials
            return {"ok": False, "reason": f"resumable session failed: {error}", "bundle": str(bundle_path)}
        if not location:
            return {"ok": False, "reason": "no upload location returned", "bundle": str(bundle_path)}
        upload_request = urllib.request.Request(location, method="PUT", data=Path(video.path).read_bytes())
        upload_request.add_header("Authorization", f"Bearer {token}")
        upload_request.add_header("Content-Type", "video/mp4")
        try:
            with urllib.request.urlopen(upload_request, timeout=1800) as response:  # noqa: S310
                payload = json.loads(response.read().decode("utf-8"))
            return {"ok": True, "video_id": payload.get("id", ""), "bundle": str(bundle_path)}
        except Exception as error:  # pragma: no cover - requires credentials
            return {"ok": False, "reason": f"upload failed: {error}", "bundle": str(bundle_path)}

    # -------------------------------------------------------------- doctor --
    def doctor(self) -> dict[str, Any]:
        providers = self.registry.doctor()
        return {
            "ffmpeg": ffmpeg_doctor(),
            "tts": backend_doctor(),
            "providers": providers,
            "fonts_dir": str(_fonts_dir() or ""),
            "brand": self.brand.get("name", ""),
            "store_root": str(self.store.root),
            "catalog_videos": len(self.store.catalog()),
            "human_decisions": len(self.store.decisions()),
            "weights": self.store.weights(),
        }


def _youtube_token() -> str:
    import os

    return os.environ.get("YOUTUBE_ACCESS_TOKEN", "")


def _load_brand(path: Path | str | None = None) -> dict[str, Any]:
    target = Path(path) if path else Path(__file__).resolve().parent.parent / "data" / "brand" / "default.json"
    if target.exists():
        try:
            return json.loads(target.read_text("utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def _fonts_dir() -> Path | None:
    try:
        import koreanize_matplotlib  # type: ignore

        candidate = Path(koreanize_matplotlib.__file__).parent / "fonts"
        if candidate.exists():
            return candidate
    except Exception:
        pass
    for path in ("/usr/share/fonts/truetype/nanum", "/usr/share/fonts/truetype"):
        candidate = Path(path)
        if candidate.exists():
            return candidate
    return None


def _dedupe_metrics(metrics: Sequence[VideoMetrics]) -> list[VideoMetrics]:
    latest: dict[str, VideoMetrics] = {}
    for item in metrics:
        previous = latest.get(item.video_id)
        if previous is None or item.views >= previous.views:
            latest[item.video_id] = item
    return list(latest.values())


def structure_of(screenplay: Screenplay) -> dict[str, Any]:
    return structure_signature(screenplay)


def channel_fingerprint(project_dir: Path | str) -> dict[str, Any]:
    """Fingerprints used for cross-video repetition checks (kept in the catalog)."""

    directory = Path(project_dir)
    poster = directory / "poster.png"
    narration = directory / "audio" / "narration.wav"
    probe_info = probe(directory / "video.mp4")
    return {
        "frame_hash": image_dhash(poster) if poster.exists() else None,
        "audio_signature": audio_signature(narration) if narration.exists() else None,
        "video": probe_info,
    }
