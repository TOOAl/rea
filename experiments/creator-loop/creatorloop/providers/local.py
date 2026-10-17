"""Free local provider: the always-available fallback renderer.

It has no key, no quota and no per-second cost.  It cannot invent photoreal motion
the way Veo/Kling/Sora do, so it declares exactly what it *can* do — generated or
library stills with real camera movement (zoompan/dolly/roll compiled in
:mod:`creatorloop.direction`), plus a fully local audio design (narration, music,
SFX, ambience) that covers the role Veo's native audio plays.

Declaring this honestly is what lets the router degrade gracefully instead of
pretending a Ken-Burns still is a generated clip.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

from ..contracts import CameraMove, ProviderId, Shot
from .base import Availability, Capability, ShotRequest, ShotResult


@dataclass(slots=True)
class LocalStudioProvider:
    """Renders a shot with the local ffmpeg/PIL engine (see :mod:`creatorloop.render`)."""

    width: int = 1920
    height: int = 1080
    fps: int = 30
    output_dir: Path | None = None

    @property
    def provider_id(self) -> ProviderId:
        return ProviderId.LOCAL_STUDIO

    @property
    def capability(self) -> Capability:
        return Capability(
            provider=ProviderId.LOCAL_STUDIO,
            text_to_video=True,
            image_to_video=True,
            native_audio=False,
            max_clip_s=600.0,
            resolutions=("720p", "1080p"),
            aspects=("16:9", "9:16", "1:1"),
            camera_control=True,
            camera_vocabulary=tuple(CameraMove),
            reference_images=0,
            keyframes=True,
            motion_quality=2,
            realism=2,
            cost_per_second_usd=0.0,
            free_quota_units_per_day=float("inf"),
            requires_key=False,
            env_key="",
            latency_s=(1, 20),
            strengths=(
                "free and offline",
                "full camera vocabulary implemented in ffmpeg (pan/tilt/dolly/truck/pedestal/roll/handheld/dolly-zoom)",
                "unlimited duration and iteration speed",
                "local audio design: narration + music + SFX + ambience, mixed to -14 LUFS",
            ),
            limits=(
                "no generative photoreal motion — uses generated/library stills with camera movement",
                "declared motion_quality/realism are lower so the router prefers paid providers when a shot needs real movement",
            ),
        )

    def availability(self) -> Availability:
        from ..render import ffmpeg_path

        resolved = ffmpeg_path()
        return Availability(
            provider=self.provider_id,
            available=bool(resolved),
            reason="" if resolved else "no ffmpeg found (install imageio-ffmpeg or put ffmpeg on PATH)",
            key_present=False,
            free_quota_remaining=float("inf") if resolved else None,
        )

    def build_request(self, shot: Shot, *, aspect: str = "16:9", resolution: str = "1080p") -> dict[str, object]:
        return {
            "payload": {
                "shot_id": shot.id,
                "prompt": shot.prompt,
                "move": shot.move.value,
                "duration_s": shot.duration_s,
                "asset_kind": shot.asset_kind,
                "palette": shot.palette,
                "on_screen_text": shot.on_screen_text,
            }
        }

    def generate(self, request: ShotRequest) -> ShotResult:
        from ..render import render_shot_asset  # lazy: render owns ffmpeg details

        started = time.time()
        destination = Path(request.output_path or f"local_{request.shot_id}.mp4")
        destination.parent.mkdir(parents=True, exist_ok=True)
        rendered = render_shot_asset(request, width=self.width, height=self.height, fps=self.fps)
        return ShotResult(
            shot_id=request.shot_id,
            provider=self.provider_id,
            uri=str(rendered.path),
            duration_s=rendered.duration_s,
            width=rendered.width,
            height=rendered.height,
            has_native_audio=False,
            elapsed_s=round(time.time() - started, 2),
            cost_usd=0.0,
            warnings=rendered.warnings,
        )
