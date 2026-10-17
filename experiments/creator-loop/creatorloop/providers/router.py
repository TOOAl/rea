"""Capability-and-budget routing with explicit, warned degradation.

Selection order per shot:

1. required capabilities (native audio, camera control, duration, aspect, references),
2. the human's ``provider_hint`` when it satisfies the requirements,
3. free quota (Kling's daily credits) before paid spend,
4. lowest cost per second, then highest motion quality.

When no available provider satisfies a requirement, the shot still gets produced —
but the missing capability is recorded on the assignment and surfaced as a warning,
so the human sees "this shot lost native audio" instead of discovering it later.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Protocol

from ..contracts import ProviderId, RenderPlan, RenderedAsset, Screenplay, Shot, new_id
from .base import (
    Availability,
    Budget,
    Capability,
    ProviderError,
    ShotAssignment,
    ShotRequest,
    ShotRequirement,
    ShotResult,
    describe_capabilities,
)


class ProviderLike(Protocol):
    provider_id: ProviderId

    @property
    def capability(self) -> Capability: ...

    def availability(self) -> Availability: ...

    def generate(self, request: ShotRequest) -> ShotResult: ...


@dataclass(slots=True)
class QuotaLedger:
    """Daily free-tier accounting, persisted so batch runs cannot overspend credits."""

    path: Path | None = None
    day: str = ""
    used: dict[str, float] = field(default_factory=dict)

    @classmethod
    def load(cls, path: Path | str | None) -> "QuotaLedger":
        target = Path(path) if path else None
        today = time.strftime("%Y-%m-%d")
        ledger = cls(path=target, day=today)
        if target and target.exists():
            try:
                payload = json.loads(target.read_text("utf-8"))
            except json.JSONDecodeError:
                payload = {}
            if payload.get("day") == today:
                ledger.used = {k: float(v) for k, v in payload.get("used", {}).items()}
        return ledger

    def remaining(self, capability: Capability) -> float | None:
        if capability.free_quota_units_per_day <= 0:
            return None
        if capability.free_quota_units_per_day == float("inf"):
            return float("inf")
        return max(0.0, capability.free_quota_units_per_day - self.used.get(capability.provider.value, 0.0))

    def consume(self, capability: Capability, units: float) -> None:
        if capability.free_quota_units_per_day in (0, float("inf")):
            return
        key = capability.provider.value
        self.used[key] = self.used.get(key, 0.0) + units
        self.persist()

    def persist(self) -> None:
        if not self.path:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps({"day": self.day, "used": self.used}, ensure_ascii=False, indent=2), "utf-8")


class ProviderRegistry:
    def __init__(self, providers: list[Any] | None = None, *, quota_path: Path | str | None = None) -> None:
        from .cloud import all_cloud_providers
        from .local import LocalStudioProvider

        self.providers: dict[ProviderId, Any] = {}
        for provider in providers if providers is not None else [*all_cloud_providers(), LocalStudioProvider()]:
            self.providers[provider.provider_id] = provider
        if ProviderId.LOCAL_STUDIO not in self.providers:
            local = LocalStudioProvider()
            self.providers[local.provider_id] = local
        self.quota = QuotaLedger.load(quota_path)

    def get(self, provider_id: ProviderId) -> Any:
        return self.providers[provider_id]

    def capabilities(self) -> list[Capability]:
        return [provider.capability for provider in self.providers.values()]

    def capability(self, provider_id: ProviderId) -> Capability:
        return self.providers[provider_id].capability

    def availability(self) -> dict[str, Any]:
        return {pid.value: self.providers[pid].availability().__dict__ for pid in self.providers}

    def doctor(self) -> dict[str, Any]:
        rows = []
        for pid, provider in self.providers.items():
            cap = provider.capability
            avail = provider.availability()
            rows.append(
                {
                    "provider": pid.value,
                    "available": avail.available,
                    "reason": avail.reason,
                    "key_present": avail.key_present,
                    "cost_per_second_usd": cap.cost_per_second_usd,
                    "free_quota_units_per_day": (
                        None if cap.free_quota_units_per_day == float("inf") else cap.free_quota_units_per_day
                    ),
                    "free_quota_remaining": self.quota.remaining(cap),
                    "native_audio": cap.native_audio,
                    "camera_control": cap.camera_control,
                    "strengths": list(cap.strengths),
                    "limits": list(cap.limits),
                }
            )
        return {
            "providers": rows,
            "capability_matrix": describe_capabilities(self.capabilities()),
            "free_only": all(not row["available"] for row in rows if row["provider"] != ProviderId.LOCAL_STUDIO.value),
        }


def _candidate_score(
    capability: Capability,
    requirement: ShotRequirement,
    budget: Budget,
    quota_remaining: float | None,
    hinted: bool,
) -> float:
    """Lower is better."""

    score = 0.0
    if hinted:
        score -= 2.0
    if capability.requires_key and not budget.allows_paid():
        score += 1000.0
    if quota_remaining is not None and quota_remaining > 0 and capability.free_quota_units_per_day != float("inf"):
        score -= 3.0  # burn free credits first
    if capability.free_quota_units_per_day == float("inf"):
        score -= 1.0 if budget.prefer_free else 0.0
    score += capability.cost_per_second_usd * requirement.duration_s * 10.0
    score -= 0.15 * capability.motion_quality
    score -= 0.25 * capability.realism if requirement.native_audio else 0.0
    if not requirement.motion:
        score -= 0.5 if capability.provider is ProviderId.LOCAL_STUDIO else 0.0
    return score


def route_shot(
    shot: Shot,
    registry: ProviderRegistry,
    *,
    budget: Budget,
    aspect: str = "16:9",
    resolution: str = "1080p",
    native_audio: bool = False,
    requirement: ShotRequirement | None = None,
) -> ShotAssignment:
    requirement = requirement or ShotRequirement.from_shot(
        shot, aspect=aspect, resolution=resolution, native_audio=native_audio
    )
    supported: list[tuple[float, ProviderId, Capability]] = []
    partial: list[tuple[float, ProviderId, Capability, list[str]]] = []
    for pid, provider in registry.providers.items():
        capability = provider.capability
        availability: Availability = provider.availability()
        if not availability.available:
            continue
        if capability.requires_key and not budget.allows_paid():
            continue
        remaining = registry.quota.remaining(capability)
        if remaining is not None and remaining <= 0:
            continue
        hinted = shot.provider_hint is pid
        ok, missing = capability.supports(requirement)
        score = _candidate_score(capability, requirement, budget, remaining, hinted)
        if ok:
            supported.append((score, pid, capability))
        else:
            partial.append((score, pid, capability, missing))

    fallbacks: list[ProviderId] = []
    if supported:
        supported.sort(key=lambda row: row[0])
        best_score, best_id, best_cap = supported[0]
        fallbacks = [pid for _, pid, _ in supported[1:]]
        if ProviderId.LOCAL_STUDIO not in fallbacks:
            fallbacks.append(ProviderId.LOCAL_STUDIO)
        reason = _reason(best_cap, requirement, budget, registry.quota.remaining(best_cap), shot.provider_hint is best_id)
        return ShotAssignment(
            shot_id=shot.id,
            provider=best_id,
            reason=reason,
            requirement=requirement,
            fallbacks=fallbacks,
            estimated_cost_usd=round(best_cap.cost_per_second_usd * requirement.duration_s, 4),
            params=_params(best_id, shot, registry, aspect, resolution),
        )

    partial.sort(key=lambda row: row[0])
    if partial:
        _, best_id, best_cap, missing = partial[0]
        fallbacks = [pid for _, pid, _, _ in partial[1:]]
        if ProviderId.LOCAL_STUDIO not in fallbacks:
            fallbacks.append(ProviderId.LOCAL_STUDIO)
        return ShotAssignment(
            shot_id=shot.id,
            provider=best_id,
            reason="no provider satisfies every requirement; degraded and reported",
            requirement=requirement,
            missing_if_downgraded=missing,
            fallbacks=fallbacks,
            estimated_cost_usd=round(best_cap.cost_per_second_usd * requirement.duration_s, 4),
            params=_params(best_id, shot, registry, aspect, resolution),
        )

    local = registry.get(ProviderId.LOCAL_STUDIO)
    capability = local.capability
    _, missing = capability.supports(requirement)
    return ShotAssignment(
        shot_id=shot.id,
        provider=ProviderId.LOCAL_STUDIO,
        reason="no paid provider available (no keys / budget 0): local free renderer",
        requirement=requirement,
        missing_if_downgraded=missing,
        fallbacks=[],
        estimated_cost_usd=0.0,
        params=_params(ProviderId.LOCAL_STUDIO, shot, registry, aspect, resolution),
    )


def _reason(
    capability: Capability,
    requirement: ShotRequirement,
    budget: Budget,
    quota_remaining: float | None,
    hinted: bool,
) -> str:
    parts = []
    if hinted:
        parts.append("human provider hint")
    if capability.free_quota_units_per_day not in (0, float("inf")) and quota_remaining:
        parts.append(f"free credits left ({quota_remaining:.0f})")
    if requirement.native_audio and capability.native_audio:
        parts.append("native audio required")
    if requirement.camera_move and capability.camera_control:
        parts.append(f"camera control for {requirement.camera_move.value}")
    if budget.max_usd and capability.cost_per_second_usd:
        parts.append(f"${capability.cost_per_second_usd}/s within ${budget.max_usd} budget")
    if not parts:
        parts.append("best capability/cost match")
    return "; ".join(parts)


def _params(provider_id: ProviderId, shot: Shot, registry: ProviderRegistry, aspect: str, resolution: str) -> dict[str, Any]:
    provider = registry.get(provider_id)
    builder = getattr(provider, "build_request", None)
    if builder is None:
        return {}
    try:
        if provider_id is ProviderId.VEO:
            return {"payload": builder(shot, aspect=aspect, resolution=resolution)}
        if provider_id is ProviderId.RUNWAY:
            ratio = "1280:720" if aspect == "16:9" else "720:1280"
            return {"payload": builder(shot, aspect=ratio, duration=min(10, max(5, int(round(shot.duration_s)))))}
        if provider_id is ProviderId.KLING:
            return {
                "payload": builder(
                    shot,
                    aspect_ratio=aspect,
                    duration="10" if shot.duration_s > 5 else "5",
                    mode="pro" if shot.move_intensity > 0.6 else "std",
                )
            }
        if provider_id is ProviderId.SORA:
            size = "1920x1080" if aspect == "16:9" and resolution == "1080p" else ("1280x720" if aspect == "16:9" else "1080x1920")
            seconds = str(min(12, max(4, int(round(shot.duration_s)))))
            return {"payload": builder(shot, size=size, seconds=seconds)}
        return builder(shot, aspect=aspect, resolution=resolution)
    except TypeError:
        return {"payload": builder(shot)}
    finally:
        pass


def _surface_prompt(params: dict[str, Any], shot: Shot) -> dict[str, Any]:
    """Every backend payload keeps its own prompt key; expose one for the plan row."""

    payload = params.get("payload") if isinstance(params.get("payload"), dict) else params
    prompt = str(payload.get("prompt") or payload.get("promptText") or shot.prompt)
    return {**params, "prompt": prompt}


def plan_shots(
    screenplay: Screenplay,
    registry: ProviderRegistry,
    *,
    budget: Budget | None = None,
    native_audio: bool = False,
) -> RenderPlan:
    budget = budget or Budget()
    aspect = screenplay.aspect if screenplay.aspect != "16:9" else "16:9"
    resolution = "1080p"
    chosen: dict[ProviderId, int] = {}
    rows: list[dict[str, Any]] = []
    total_cost = 0.0
    warnings: list[str] = []
    for scene in screenplay.scenes:
        for shot in scene.shots:
            assignment = route_shot(
                shot, registry, budget=budget, aspect=aspect, resolution=resolution, native_audio=native_audio
            )
            chosen[assignment.provider] = chosen.get(assignment.provider, 0) + 1
            total_cost += assignment.estimated_cost_usd
            if assignment.missing_if_downgraded:
                warnings.append(
                    f"{shot.id}: degraded -> missing {', '.join(assignment.missing_if_downgraded)} "
                    f"(using {assignment.provider.value})"
                )
            assignment.params = _surface_prompt(assignment.params, shot)
            rows.append(
                {
                    "shot_id": shot.id,
                    "scene_id": scene.id,
                    "provider": assignment.provider.value,
                    "reason": assignment.reason,
                    "missing_if_downgraded": assignment.missing_if_downgraded,
                    "fallbacks": [p.value for p in assignment.fallbacks],
                    "estimated_cost_usd": assignment.estimated_cost_usd,
                    "prompt": assignment.params.get("prompt", shot.prompt),
                    "params": assignment.params,
                    "duration_s": shot.duration_s,
                    "asset_kind": shot.asset_kind,
                    "move": shot.move.value,
                }
            )
    dominant = max(chosen.items(), key=lambda kv: kv[1])[0] if chosen else ProviderId.LOCAL_STUDIO
    return RenderPlan(
        screenplay_id=screenplay.id,
        provider=dominant,
        reason=f"provider mix: " + ", ".join(f"{pid.value}={count}" for pid, count in sorted(chosen.items())),
        shots=rows,
        estimated_cost_usd=round(total_cost, 4),
        estimated_quota_units=round(sum(row["duration_s"] for row in rows if row["provider"] == "kling"), 2),
        fallbacks=[ProviderId.LOCAL_STUDIO],
    )


def execute_plan(
    plan: RenderPlan,
    registry: ProviderRegistry,
    *,
    output_dir: Path,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    retries: int = 1,
) -> list[RenderedAsset]:
    """Execute every shot with fallback chain; never fail the whole video on one shot."""

    emit = on_event or (lambda event: None)
    assets: list[RenderedAsset] = []
    output_dir.mkdir(parents=True, exist_ok=True)
    for row in plan.shots:
        shot_id = str(row["shot_id"])
        chain = [ProviderId(row["provider"]), *[ProviderId(item) for item in row.get("fallbacks", [])]]
        destination = output_dir / f"{shot_id}.mp4"
        last_error = ""
        for index, provider_id in enumerate(chain):
            provider = registry.providers.get(provider_id)
            if provider is None:
                continue
            request = ShotRequest(
                shot_id=shot_id,
                prompt=str(row.get("prompt", shot_id)),
                params=dict(row.get("params", {})),
                duration_s=float(row.get("duration_s", 4.0)),
                output_path=str(destination),
                native_audio=provider.capability.native_audio,
            )
            try:
                started = time.time()
                emit({"type": "shot_start", "shot_id": shot_id, "provider": provider_id.value, "attempt": index + 1})
                result = provider.generate(request)
                capability = provider.capability
                if capability.free_quota_units_per_day not in (0, float("inf")):
                    registry.quota.consume(capability, result.duration_s * 20.0)
                assets.append(
                    RenderedAsset(
                        shot_id=shot_id,
                        uri=result.uri,
                        provider=result.provider,
                        duration_s=result.duration_s,
                        width=result.width,
                        height=result.height,
                        has_native_audio=result.has_native_audio,
                        elapsed_s=round(time.time() - started, 2),
                        cost_usd=result.cost_usd,
                        warnings=[*result.warnings, *row.get("missing_if_downgraded", [])],
                    )
                )
                emit({"type": "shot_done", "shot_id": shot_id, "provider": provider_id.value, "elapsed_s": assets[-1].elapsed_s})
                break
            except ProviderError as error:
                last_error = f"{provider_id.value}: {error}"
                emit({"type": "shot_failed", "shot_id": shot_id, "provider": provider_id.value, "error": str(error)})
                if error.retryable and retries > 0:
                    time.sleep(2.0)
                    try:
                        result = provider.generate(request)
                        assets.append(
                            RenderedAsset(
                                shot_id=shot_id,
                                uri=result.uri,
                                provider=result.provider,
                                duration_s=result.duration_s,
                                width=result.width,
                                height=result.height,
                                has_native_audio=result.has_native_audio,
                                cost_usd=result.cost_usd,
                                warnings=result.warnings,
                            )
                        )
                        break
                    except ProviderError as retry_error:
                        last_error = f"{provider_id.value} retry: {retry_error}"
                continue
        else:
            assets.append(
                RenderedAsset(
                    shot_id=shot_id,
                    uri="",
                    provider=ProviderId.LOCAL_STUDIO,
                    duration_s=float(row.get("duration_s", 4.0)),
                    width=0,
                    height=0,
                    warnings=[f"all providers failed: {last_error}"],
                )
            )
            emit({"type": "shot_unavailable", "shot_id": shot_id, "error": last_error})
    return assets


def plan_id() -> str:
    return new_id("plan")
