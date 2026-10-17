"""Provider contracts: declared capabilities, budgets, and fail-safe routing types.

A provider states what it can do; the router picks; the render pipeline executes.
Nothing here knows about ffmpeg, and no provider is allowed to silently change a
capability the shot depends on — degradation is always reported as a warning so the
authenticity guard and the human can see what actually happened.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Sequence

from ..contracts import CameraMove, ProviderId, Shot


@dataclass(slots=True)
class Capability:
    provider: ProviderId
    text_to_video: bool = True
    image_to_video: bool = False
    native_audio: bool = False  # dialogue + SFX + ambience generated with the clip
    native_audio_dialogue: bool = False
    max_clip_s: float = 8.0
    resolutions: tuple[str, ...] = ("720p",)
    aspects: tuple[str, ...] = ("16:9",)
    camera_control: bool = False
    camera_vocabulary: tuple[CameraMove, ...] = ()
    reference_images: int = 0  # ingredients / character references accepted per shot
    keyframes: bool = False  # first+last frame control
    lip_sync: bool = False
    character_consistency: bool = False
    motion_quality: int = 3  # documented 1..5 rating, see docs/tool-analysis.md
    realism: int = 3
    cost_per_second_usd: float = 0.0
    free_quota_units_per_day: float = 0.0
    requires_key: bool = True
    env_key: str = ""
    latency_s: tuple[int, int] = (30, 300)
    strengths: tuple[str, ...] = ()
    limits: tuple[str, ...] = ()

    def supports(self, requirement: "ShotRequirement") -> tuple[bool, list[str]]:
        missing: list[str] = []
        if requirement.native_audio and not self.native_audio:
            missing.append("native_audio")
        if requirement.image_to_video and not self.image_to_video:
            missing.append("image_to_video")
        if requirement.camera_move is not None and requirement.camera_move is not CameraMove.STATIC:
            if not self.camera_control:
                missing.append("camera_control")
            elif self.camera_vocabulary and requirement.camera_move not in self.camera_vocabulary:
                missing.append(f"camera_move:{requirement.camera_move.value}")
        if requirement.duration_s > self.max_clip_s + 0.01:
            missing.append(f"duration>{self.max_clip_s}s")
        if requirement.aspect not in self.aspects:
            missing.append(f"aspect:{requirement.aspect}")
        if requirement.resolution not in self.resolutions:
            missing.append(f"resolution:{requirement.resolution}")
        if requirement.references > self.reference_images:
            missing.append(f"references>{self.reference_images}")
        if requirement.lip_sync and not self.lip_sync:
            missing.append("lip_sync")
        if requirement.character_consistency and not self.character_consistency:
            missing.append("character_consistency")
        return (not missing, missing)


@dataclass(slots=True)
class ShotRequirement:
    duration_s: float = 5.0
    aspect: str = "16:9"
    resolution: str = "1080p"
    native_audio: bool = False
    image_to_video: bool = False
    camera_move: CameraMove | None = None
    references: int = 0
    lip_sync: bool = False
    character_consistency: bool = False
    motion: bool = True  # False = a still frame is acceptable (Ken Burns)

    @classmethod
    def from_shot(cls, shot: Shot, *, aspect: str = "16:9", resolution: str = "1080p", native_audio: bool = False) -> "ShotRequirement":
        return cls(
            duration_s=shot.duration_s,
            aspect=aspect,
            resolution=resolution,
            native_audio=native_audio or shot.with_native_audio,
            image_to_video=bool(shot.first_frame or shot.last_frame),
            camera_move=shot.move,
            references=sum(1 for ref in (shot.first_frame, shot.last_frame) if ref),
            lip_sync=False,  # set explicitly when a shot needs lip-sync (Kling endpoint)
            character_consistency=bool(shot.entities),
            motion=shot.move is not CameraMove.STATIC or shot.asset_kind != "generated_still",
        )


@dataclass(slots=True)
class ShotRequest:
    shot_id: str
    prompt: str
    params: dict[str, Any] = field(default_factory=dict)
    aspect: str = "16:9"
    resolution: str = "1080p"
    duration_s: float = 5.0
    negative_prompt: str = ""
    references: list[str] = field(default_factory=list)
    entities: list[str] = field(default_factory=list)
    seed: int | None = None
    output_path: str = ""
    native_audio: bool = False


@dataclass(slots=True)
class ShotResult:
    shot_id: str
    provider: ProviderId
    uri: str
    duration_s: float
    width: int
    height: int
    has_native_audio: bool = False
    elapsed_s: float = 0.0
    cost_usd: float = 0.0
    warnings: list[str] = field(default_factory=list)
    task_id: str = ""


class ProviderError(RuntimeError):
    """Base error. ``retryable`` drives the router's backoff decisions."""

    retryable = False

    def __init__(self, message: str, *, provider: ProviderId | None = None, detail: str = "") -> None:
        super().__init__(message)
        self.provider = provider
        self.detail = detail


class ProviderUnavailable(ProviderError):
    retryable = False


class ProviderAuthError(ProviderError):
    retryable = False


class ProviderQuotaExceeded(ProviderError):
    retryable = True


class ProviderTimeout(ProviderError):
    retryable = True


class ProviderRateLimited(ProviderError):
    retryable = True


class ProviderRejected(ProviderError):
    """Content moderation / policy refusal: retrying the same prompt will not help."""

    retryable = False


class ProviderUnsupported(ProviderError):
    retryable = False


@dataclass(slots=True)
class Availability:
    provider: ProviderId
    available: bool
    reason: str = ""
    key_present: bool = False
    free_quota_remaining: float | None = None


@dataclass(slots=True)
class Budget:
    max_usd: float = 0.0  # 0 = no paid spend allowed (offline/free-only mode)
    prefer_free: bool = True
    max_paid_shots: int | None = None
    spent_usd: float = 0.0

    def allows_paid(self) -> bool:
        return not self.prefer_free and self.max_usd > 0

    def can_spend(self, amount: float) -> bool:
        return self.max_usd <= 0 or (self.spent_usd + amount) <= self.max_usd

    def spend(self, amount: float) -> None:
        self.spent_usd += amount


@dataclass(slots=True)
class ShotAssignment:
    shot_id: str
    provider: ProviderId
    reason: str
    requirement: ShotRequirement
    missing_if_downgraded: list[str] = field(default_factory=list)
    fallbacks: list[ProviderId] = field(default_factory=list)
    estimated_cost_usd: float = 0.0
    params: dict[str, Any] = field(default_factory=dict)


def describe_capabilities(capabilities: Sequence[Capability]) -> list[dict[str, Any]]:
    return [
        {
            "provider": cap.provider.value,
            "native_audio": cap.native_audio,
            "camera_control": cap.camera_control,
            "max_clip_s": cap.max_clip_s,
            "resolutions": list(cap.resolutions),
            "aspects": list(cap.aspects),
            "reference_images": cap.reference_images,
            "lip_sync": cap.lip_sync,
            "character_consistency": cap.character_consistency,
            "motion_quality": cap.motion_quality,
            "cost_per_second_usd": cap.cost_per_second_usd,
            "free_quota_units_per_day": cap.free_quota_units_per_day,
            "requires_key": cap.requires_key,
            "strengths": list(cap.strengths),
            "limits": list(cap.limits),
        }
        for cap in capabilities
    ]
