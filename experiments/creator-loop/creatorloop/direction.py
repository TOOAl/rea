"""Director vocabulary: one camera language, compiled per backend.

Runway Gen-4's director mode, Kling's motion/camera controls, Veo's prompt-encoded
cinematography and Sora's shot continuity all express the same idea with different
parameter shapes.  This module owns *one* representation (:class:`CameraRig` plus
:class:`~creatorloop.contracts.CameraMove`) and compiles it to whatever a backend
accepts — including a real ffmpeg implementation for the free local renderer, so a
shot keeps its intended movement when no paid provider is reachable.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .contracts import CameraMove, ProviderId, Screenplay, Shot, ShotSize

SHOT_SIZE_PROMPT: dict[ShotSize, str] = {
    ShotSize.ECU: "extreme close-up",
    ShotSize.CU: "close-up",
    ShotSize.MCU: "medium close-up",
    ShotSize.MS: "medium shot",
    ShotSize.MLS: "medium long shot",
    ShotSize.LS: "wide shot",
    ShotSize.ELS: "extreme wide establishing shot",
}

LENS_PROMPT: dict[str, str] = {
    "14": "14mm ultra-wide lens, exaggerated perspective",
    "24": "24mm wide lens",
    "35": "35mm lens, natural perspective",
    "50": "50mm lens, documentary feel",
    "85": "85mm portrait lens, compressed background, shallow depth of field",
    "135": "135mm telephoto, strongly compressed planes",
}

MOVE_PHRASE: dict[CameraMove, str] = {
    CameraMove.STATIC: "locked-off static camera",
    CameraMove.PAN_LEFT: "smooth camera pan to the left",
    CameraMove.PAN_RIGHT: "smooth camera pan to the right",
    CameraMove.TILT_UP: "camera tilts upward",
    CameraMove.TILT_DOWN: "camera tilts downward",
    CameraMove.ZOOM_IN: "slow push-in zoom",
    CameraMove.ZOOM_OUT: "slow pull-out zoom",
    CameraMove.DOLLY_IN: "camera dollies forward toward the subject",
    CameraMove.DOLLY_OUT: "camera dollies backward away from the subject",
    CameraMove.TRUCK_LEFT: "camera trucks left, parallax across the foreground",
    CameraMove.TRUCK_RIGHT: "camera trucks right, parallax across the foreground",
    CameraMove.PEDESTAL_UP: "camera pedestals upward",
    CameraMove.PEDESTAL_DOWN: "camera pedestals downward",
    CameraMove.ROLL_CW: "slow clockwise camera roll",
    CameraMove.ROLL_CCW: "slow counter-clockwise camera roll",
    CameraMove.ORBIT_LEFT: "camera orbits left around the subject",
    CameraMove.ORBIT_RIGHT: "camera orbits right around the subject",
    CameraMove.HANDHELD: "handheld camera with subtle organic shake",
    CameraMove.DOLLY_ZOOM: "dolly zoom (vertigo effect), background stretches while subject stays the same size",
    CameraMove.CRANE_UP: "crane move rising and revealing the space",
}

# Runway camera_control vocabulary (type/direction/value where value is 0..3).
RUNWAY_CAMERA: dict[CameraMove, dict[str, Any]] = {
    CameraMove.STATIC: {"type": "static"},
    CameraMove.PAN_LEFT: {"type": "pan", "direction": "left"},
    CameraMove.PAN_RIGHT: {"type": "pan", "direction": "right"},
    CameraMove.TILT_UP: {"type": "tilt", "direction": "up"},
    CameraMove.TILT_DOWN: {"type": "tilt", "direction": "down"},
    CameraMove.ZOOM_IN: {"type": "zoom", "direction": "in"},
    CameraMove.ZOOM_OUT: {"type": "zoom", "direction": "out"},
    CameraMove.DOLLY_IN: {"type": "horizontal", "direction": "right"},
    CameraMove.DOLLY_OUT: {"type": "horizontal", "direction": "left"},
    CameraMove.ROLL_CW: {"type": "roll", "direction": "clockwise"},
    CameraMove.ROLL_CCW: {"type": "roll", "direction": "counterclockwise"},
    CameraMove.TRUCK_LEFT: {"type": "horizontal", "direction": "left"},
    CameraMove.TRUCK_RIGHT: {"type": "horizontal", "direction": "right"},
    CameraMove.PEDESTAL_UP: {"type": "vertical", "direction": "up"},
    CameraMove.PEDESTAL_DOWN: {"type": "vertical", "direction": "down"},
}

# Kling camera_control. Documented constraint: with ``type: "simple"`` only ONE
# config axis may be non-zero (range -10..10); compound moves therefore use
# ``type: "dynamic"`` (master shot), which accepts several axes at once.
KLING_AXES = ("horizontal", "vertical", "pan", "tilt", "roll", "zoom")
KLING_SIMPLE: dict[CameraMove, tuple[str, int]] = {
    CameraMove.PAN_LEFT: ("pan", -1),
    CameraMove.PAN_RIGHT: ("pan", 1),
    CameraMove.TILT_UP: ("tilt", 1),
    CameraMove.TILT_DOWN: ("tilt", -1),
    CameraMove.ZOOM_IN: ("zoom", 1),
    CameraMove.ZOOM_OUT: ("zoom", -1),
    CameraMove.TRUCK_LEFT: ("horizontal", -1),
    CameraMove.TRUCK_RIGHT: ("horizontal", 1),
    CameraMove.PEDESTAL_UP: ("vertical", 1),
    CameraMove.PEDESTAL_DOWN: ("vertical", -1),
    CameraMove.ROLL_CW: ("roll", 1),
    CameraMove.ROLL_CCW: ("roll", -1),
}
KLING_DYNAMIC: dict[CameraMove, dict[str, int]] = {
    CameraMove.DOLLY_IN: {"zoom": 1, "tilt": 1},
    CameraMove.DOLLY_OUT: {"zoom": -1, "tilt": -1},
    CameraMove.ORBIT_LEFT: {"pan": -1, "horizontal": -1},
    CameraMove.ORBIT_RIGHT: {"pan": 1, "horizontal": 1},
    CameraMove.HANDHELD: {"pan": 1, "tilt": 1},
    CameraMove.CRANE_UP: {"vertical": 1, "tilt": 1},
    CameraMove.DOLLY_ZOOM: {"zoom": 1, "vertical": -1},
}


def kling_camera_control(shot: Shot) -> dict[str, Any] | None:
    """Compile one shot's move into Kling's camera_control object (single-axis rule respected)."""

    magnitude = max(1, min(10, round(10 * max(shot.move_intensity, 0.1))))
    if shot.move is CameraMove.STATIC:
        return None
    if shot.move in KLING_SIMPLE:
        axis, sign = KLING_SIMPLE[shot.move]
        return {"type": "simple", "config": {name: (sign * magnitude if name == axis else 0) for name in KLING_AXES}}
    if shot.move in KLING_DYNAMIC:
        config = {name: 0 for name in KLING_AXES}
        for axis, sign in KLING_DYNAMIC[shot.move].items():
            config[axis] = sign * max(1, magnitude // 2)
        return {"type": "dynamic", "config": config}
    return None


@dataclass(slots=True)
class CameraRig:
    move: CameraMove = CameraMove.STATIC
    intensity: float = 0.35
    lens_mm: int = 35
    size: ShotSize = ShotSize.MS
    angle: str = "eye_level"
    duration_s: float = 4.0

    @classmethod
    def from_shot(cls, shot: Shot) -> "CameraRig":
        return cls(
            move=shot.move,
            intensity=shot.move_intensity,
            lens_mm=shot.lens_mm,
            size=shot.size,
            angle=shot.angle,
            duration_s=shot.duration_s,
        )

    def prompt_phrase(self) -> str:
        parts = [
            SHOT_SIZE_PROMPT.get(self.size, "medium shot"),
            LENS_PROMPT.get(str(self.lens_mm), f"{self.lens_mm}mm lens"),
            f"{self.angle.replace('_', ' ')} angle",
            MOVE_PHRASE.get(self.move, "static camera"),
        ]
        if self.move is not CameraMove.STATIC:
            parts.append(self._intensity_phrase())
        return ", ".join(parts)

    def _intensity_phrase(self) -> str:
        if self.intensity <= 0.2:
            return "very subtle movement"
        if self.intensity <= 0.45:
            return "gentle, controlled movement"
        if self.intensity <= 0.7:
            return "clear, deliberate movement"
        return "fast, energetic movement"


def describe_shot(shot: Shot) -> str:
    """Cinematography sentence appended to any provider prompt (Veo/Sora style)."""

    return CameraRig.from_shot(shot).prompt_phrase()


def compile_for_runway(shot: Shot, *, model: str = "gen4_turbo", ratio: str = "1280:720", duration: int = 10) -> dict[str, Any]:
    camera = RUNWAY_CAMERA.get(shot.move)
    params: dict[str, Any] = {
        "model": model,
        "promptText": expand_prompt(shot),
        "duration": duration,
        "ratio": ratio,
    }
    if camera:
        camera = dict(camera)
        if "value" not in camera and camera.get("type") != "static":
            camera["value"] = max(1, min(3, round(shot.move_intensity * 3)))
        params["camera_control"] = camera
    if shot.negative_prompt:
        params["negative_prompt"] = shot.negative_prompt
    if shot.first_frame:
        params["promptImage"] = shot.first_frame
    return params


def compile_for_kling(
    shot: Shot,
    *,
    model_name: str = "kling-v2-master",
    mode: str = "std",
    duration: str = "5",
    aspect_ratio: str = "16:9",
    cfg_scale: float = 0.5,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "model_name": model_name,
        "mode": mode,
        "duration": duration,
        "aspect_ratio": aspect_ratio,
        "cfg_scale": cfg_scale,
        "prompt": expand_prompt(shot),
    }
    camera = kling_camera_control(shot)
    if camera:
        params["camera_control"] = camera
    if shot.negative_prompt:
        params["negative_prompt"] = shot.negative_prompt
    if shot.first_frame:
        params["image"] = shot.first_frame
    return params


def compile_for_veo(shot: Shot, *, aspect_ratio: str = "16:9", resolution: str = "1080p") -> dict[str, Any]:
    """Veo has no camera_control field: direction lives in the prompt (+ native audio cues)."""

    prompt = expand_prompt(shot)
    if shot.with_native_audio and shot.audio_cue:
        prompt = f"{prompt}. Audio: {shot.audio_cue}"
    return {
        "prompt": prompt,
        "aspectRatio": aspect_ratio,
        "resolution": resolution,
        "negativePrompt": shot.negative_prompt or "text overlays, watermark, distorted hands, low quality",
        "personGeneration": "allow_adult",
        "durationSeconds": 8,
    }


def compile_for_sora(shot: Shot, *, seconds: str = "8", size: str = "1280x720") -> dict[str, Any]:
    params: dict[str, Any] = {"prompt": expand_prompt(shot), "seconds": seconds, "size": size}
    if shot.first_frame:
        params["input_reference"] = shot.first_frame
    return params


def expand_prompt(shot: Shot) -> str:
    """Veo-style prompt expansion: terse idea -> shootable description."""

    if shot.prompt_expanded:
        return shot.prompt_expanded
    fragments = [shot.prompt.strip().rstrip(".")]
    if shot.subject:
        fragments.append(f"subject: {shot.subject}")
    if shot.action:
        fragments.append(f"action: {shot.action}")
    fragments.append(describe_shot(shot))
    if shot.mood:
        fragments.append(f"mood: {shot.mood}")
    if shot.palette:
        fragments.append("palette: " + ", ".join(shot.palette))
    fragments.append("photoreal, natural light continuity, no on-screen text")
    return "; ".join(part for part in fragments if part)


# --------------------------------------------------------------------------- #
# local (free) implementation of the same vocabulary
# --------------------------------------------------------------------------- #
def ffmpeg_move_filter(shot: Shot, *, width: int, height: int, fps: int = 30) -> str:
    """Real camera movement applied to a still/clip with zoompan (+rotate for roll).

    ``zoompan`` runs with ``d=1`` over a looped input so ``on`` is the output frame
    index; every move is expressed as a function of ``on`` over the shot duration.
    """

    frames = max(int(round(shot.duration_s * fps)), 1)
    intensity = max(0.05, min(1.0, shot.move_intensity))
    zmax = 1.0 + 0.35 * intensity
    zmin = max(1.0, zmax - 0.30 * intensity)
    step = (zmax - 1.0) / frames
    move = shot.move

    if move in (CameraMove.ZOOM_IN, CameraMove.DOLLY_IN, CameraMove.CRANE_UP):
        z = f"min(1.0+{step:.6f}*on,{zmax:.4f})"
        x = "iw/2-(iw/zoom/2)"
        y = "ih/2-(ih/zoom/2)"
    elif move in (CameraMove.ZOOM_OUT, CameraMove.DOLLY_OUT):
        z = f"max({zmax:.4f}-{step:.6f}*on,1.0)"
        x = "iw/2-(iw/zoom/2)"
        y = "ih/2-(ih/zoom/2)"
    elif move in (CameraMove.PAN_LEFT, CameraMove.TRUCK_LEFT, CameraMove.ORBIT_LEFT):
        z = f"{min(1.18, 1.0 + 0.18 * intensity):.4f}"
        x = f"(iw-iw/zoom)*(1-on/{frames})"
        y = "ih/2-(ih/zoom/2)"
    elif move in (CameraMove.PAN_RIGHT, CameraMove.TRUCK_RIGHT, CameraMove.ORBIT_RIGHT):
        z = f"{min(1.18, 1.0 + 0.18 * intensity):.4f}"
        x = f"(iw-iw/zoom)*(on/{frames})"
        y = "ih/2-(ih/zoom/2)"
    elif move in (CameraMove.TILT_UP, CameraMove.PEDESTAL_UP):
        z = f"{min(1.18, 1.0 + 0.18 * intensity):.4f}"
        x = "iw/2-(iw/zoom/2)"
        y = f"(ih-ih/zoom)*(1-on/{frames})"
    elif move in (CameraMove.TILT_DOWN, CameraMove.PEDESTAL_DOWN):
        z = f"{min(1.18, 1.0 + 0.18 * intensity):.4f}"
        x = "iw/2-(iw/zoom/2)"
        y = f"(ih-ih/zoom)*(on/{frames})"
    elif move is CameraMove.HANDHELD:
        amp = 0.012 * intensity
        z = f"{1.0 + 0.10 * intensity:.4f}"
        x = f"iw/2-(iw/zoom/2)+{amp:.5f}*iw*sin(on/6.0)"
        y = f"ih/2-(ih/zoom/2)+{amp * 0.7:.5f}*ih*cos(on/7.5)"
    elif move is CameraMove.DOLLY_ZOOM:
        # Subject size constant, background stretches: zoom up while crop window grows.
        z = f"min(1.0+{step * 1.6:.6f}*on,{zmax + 0.12:.4f})"
        x = "iw/2-(iw/zoom/2)"
        y = "ih/2-(ih/zoom/2)"
    else:  # STATIC, ROLL_*
        z = "1.0"
        x = "iw/2-(iw/zoom/2)"
        y = "ih/2-(ih/zoom/2)"

    filters = [
        f"scale={width * 2}:{height * 2}:flags=lanczos",
        f"zoompan=z='{z}':x='{x}':y='{y}':d=1:s={width}x{height}:fps={fps}",
    ]
    if move in (CameraMove.ROLL_CW, CameraMove.ROLL_CCW):
        direction = 1 if move is CameraMove.ROLL_CW else -1
        amplitude = 0.06 * intensity * direction
        filters.append(f"rotate=a='{amplitude:.4f}*sin(on/{max(frames // 2, 1)})':fillcolor=black@0")
    if move is CameraMove.CRANE_UP:
        filters.append(f"crop={width}:{height}:0:'(ih-oh)*(on/{frames})*{0.4 * intensity:.3f}'")
    return ",".join(filters)


def motion_profile(shot: Shot, *, provider: ProviderId) -> dict[str, Any]:
    """Kling-style motion budget: how much movement the backend should invent."""

    base = {
        "move": shot.move.value,
        "intensity": shot.move_intensity,
        "duration_s": shot.duration_s,
        "negative_prompt": shot.negative_prompt or "static slideshow, jitter, warping text, extra fingers",
    }
    if provider is ProviderId.KLING:
        base.update({"mode": "std" if shot.move_intensity < 0.5 else "pro", "cfg_scale": round(0.35 + 0.3 * shot.move_intensity, 2)})
    elif provider is ProviderId.RUNWAY:
        base.update({"value": max(1, min(3, round(shot.move_intensity * 3)))})
    elif provider is ProviderId.VEO:
        base.update({"prompt_phrase": CameraRig.from_shot(shot)._intensity_phrase()})
    return base


def storyboard(screenplay: Screenplay) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for scene in screenplay.scenes:
        for shot in scene.shots:
            rows.append(
                {
                    "scene": scene.id,
                    "beat": scene.beat,
                    "shot": shot.id,
                    "size": shot.size.value,
                    "lens_mm": shot.lens_mm,
                    "angle": shot.angle,
                    "move": shot.move.value,
                    "intensity": shot.move_intensity,
                    "duration_s": shot.duration_s,
                    "asset_kind": shot.asset_kind,
                    "entities": shot.entities,
                    "prompt": shot.prompt,
                }
            )
    return rows


def continuity_report(screenplay: Screenplay) -> dict[str, Any]:
    """Sora-2-style multi-shot continuity: which shots share entities and where they break."""

    entities: dict[str, list[str]] = {}
    breaks: list[str] = []
    previous: Shot | None = None
    for scene in screenplay.scenes:
        for shot in scene.shots:
            for entity in shot.entities:
                entities.setdefault(entity, []).append(shot.id)
            if previous is not None:
                if previous.entities and shot.entities and not set(previous.entities) & set(shot.entities):
                    breaks.append(f"{previous.id}->{shot.id}: no shared entity (possible continuity jump)")
                if previous.palette and shot.palette and not set(previous.palette) & set(shot.palette):
                    breaks.append(f"{previous.id}->{shot.id}: palette break {previous.palette} -> {shot.palette}")
                if abs(previous.lens_mm - shot.lens_mm) >= 50 and previous.size == shot.size:
                    breaks.append(f"{previous.id}->{shot.id}: same shot size with {previous.lens_mm}->{shot.lens_mm}mm jump")
            previous = shot
    bible = {entity.id: entity for entity in screenplay.entities}
    unresolved = sorted({name for shots in entities.values() for name in shots} - {s.id for s in _iter_shots(screenplay)})
    return {
        "entity_usage": entities,
        "entities_without_bible_entry": [name for name in entities if name not in bible],
        "continuity_breaks": breaks[:20],
        "break_count": len(breaks),
        "unresolved_shot_refs": unresolved,
    }


def _iter_shots(screenplay: Screenplay):
    for scene in screenplay.scenes:
        for shot in scene.shots:
            yield shot


def degrees_to_zoom(angle_deg: float) -> float:
    """Utility used by the renderer when converting lens hints to crop factors."""

    return round(1.0 / max(math.cos(math.radians(min(abs(angle_deg), 60.0))), 0.2), 4)
