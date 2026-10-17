"""Rendering: ffmpeg orchestration, timeline composition, thumbnails.

Everything here is explicit about what it produced and what degraded: missing
assets become branded placeholder cards with a warning rather than a silent hole,
and every intermediate clip is normalized to one geometry so concatenation cannot
fail on parameter mismatch.
"""

from __future__ import annotations

import math
import os
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Sequence

from .art import DEFAULT_BRAND, render_scene_art
from .audio import MixTrack, audio_duration, generate_ambience, generate_music, generate_sfx, mix_tracks
from .contracts import CameraMove, Screenplay, Shot, ShotSize
from .direction import ffmpeg_move_filter

FPS_DEFAULT = 30
CRF = 18  # 1080p 마스터 품질: YouTube 재인코딩 후에도 디테일이 남도록 여유를 둔다
PRESET = "veryfast"
PIXEL_FORMAT = "yuv420p"
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}


def video_encode_args(*, fps: int | None = None, audio: bool = False) -> list[str]:
    """One x264 recipe for every stage, so intermediate clips are not compressed twice."""

    args = [
        "-c:v", "libx264",
        "-preset", PRESET,
        "-crf", str(CRF),
        "-profile:v", "high",
        "-level:v", "4.1",
        "-pix_fmt", PIXEL_FORMAT,
    ]
    if fps:
        args += ["-r", str(fps)]
    if not audio:
        args += ["-an"]
    return args


class RenderError(RuntimeError):
    def __init__(self, message: str, *, command: Sequence[str] = (), stderr: str = "") -> None:
        super().__init__(message)
        self.command = list(command)
        self.stderr = stderr


def ffmpeg_path() -> str:
    override = os.environ.get("CREATOR_LOOP_FFMPEG")
    if override and Path(override).exists():
        return override
    resolved = shutil.which("ffmpeg")
    if resolved:
        return resolved
    try:
        import imageio_ffmpeg  # type: ignore

        candidate = imageio_ffmpeg.get_ffmpeg_exe()
        if candidate and Path(candidate).exists():
            return candidate
    except Exception:
        pass
    return ""


def run_ffmpeg(args: Sequence[str], *, timeout: float = 900.0) -> str:
    ffmpeg = ffmpeg_path()
    if not ffmpeg:
        raise RenderError("ffmpeg not found — install imageio-ffmpeg or set CREATOR_LOOP_FFMPEG")
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", *args]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)
    except subprocess.TimeoutExpired as error:
        raise RenderError(f"ffmpeg timed out after {timeout:.0f}s", command=command) from error
    if completed.returncode != 0:
        tail = " | ".join(line.strip() for line in completed.stderr.strip().splitlines()[-4:])
        raise RenderError(
            f"ffmpeg failed ({completed.returncode}): {tail} :: {' '.join(args[:14])}",
            command=command,
            stderr=completed.stderr[-1200:],
        )
    return completed.stderr


_DURATION_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)")
_STREAM_RE = re.compile(r"Stream #\d+:\d+.*?:\s*(Video|Audio):\s*([a-z0-9_]+)")
_SIZE_RE = re.compile(r"Video:.*?,\s*(\d{2,5})x(\d{2,5})")


def probe(path: Path | str) -> dict[str, Any]:
    """Probe media without requiring ffprobe (parses ``ffmpeg -i``)."""

    ffmpeg = ffmpeg_path()
    if not ffmpeg or not Path(path).exists():
        return {"exists": False, "path": str(path)}
    completed = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path)], capture_output=True, text=True, check=False)
    text = completed.stderr
    duration = 0.0
    if match := _DURATION_RE.search(text):
        hours, minutes, seconds = match.groups()
        duration = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    streams = _STREAM_RE.findall(text)
    size = _SIZE_RE.search(text)
    return {
        "exists": True,
        "path": str(path),
        "duration_s": round(duration, 3),
        "width": int(size.group(1)) if size else 0,
        "height": int(size.group(2)) if size else 0,
        "has_video": any(kind == "Video" for kind, _ in streams),
        "has_audio": any(kind == "Audio" for kind, _ in streams),
        "video_codec": next((codec for kind, codec in streams if kind == "Video"), ""),
    }


def probe_duration(path: Path | str) -> float:
    return float(probe(path).get("duration_s", 0.0))


def transcode(source: Path | str, destination: Path | str, *, sample_rate: int = 44100) -> Path:
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(["-i", str(source), "-vn", "-ac", "2", "-ar", str(sample_rate), "-c:a", "pcm_s16le", str(destination)])
    return destination


def _escape_filter_path(path: Path | str) -> str:
    text = str(Path(path).resolve())
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def still_to_clip(still: Path | str, destination: Path, shot: Shot, *, width: int, height: int, fps: int = FPS_DEFAULT) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    duration = max(float(shot.duration_s), 0.4)
    move_filter = ffmpeg_move_filter(shot, width=width, height=height, fps=fps)
    run_ffmpeg(
        [
            "-loop", "1", "-framerate", str(fps), "-t", f"{duration:.3f}", "-i", str(still),
            "-vf", f"{move_filter},format=yuv420p",
            *video_encode_args(fps=fps),
            str(destination),
        ]
    )
    return destination


def normalize_clip(source: Path | str, destination: Path, *, width: int, height: int, fps: int, duration_s: float | None = None) -> Path:
    """Force any provider clip into the timeline geometry (and strip its audio)."""

    destination.parent.mkdir(parents=True, exist_ok=True)
    args: list[str] = []
    if duration_s:
        args += ["-stream_loop", "-1"]
    args += ["-i", str(source)]
    if duration_s:
        args += ["-t", f"{duration_s:.3f}"]
    args += [
        "-vf",
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps={fps},format=yuv420p",
        *video_encode_args(fps=fps),
        str(destination),
    ]
    run_ffmpeg(args)
    return destination


def concat_clips(clips: Sequence[Path], destination: Path) -> Path:
    if not clips:
        raise RenderError("no clips to concatenate")
    if len(clips) == 1:
        shutil.copyfile(clips[0], destination)
        return destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    list_file = destination.with_suffix(".txt")
    list_file.write_text("".join(f"file '{Path(clip).resolve()}'\n" for clip in clips), "utf-8")
    run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(list_file), "-c", "copy", str(destination)])
    list_file.unlink(missing_ok=True)
    return destination


def apply_fades(clip: Path, destination: Path, *, duration_s: float, transition: str, fps: int = FPS_DEFAULT) -> Path:
    if transition not in ("dip_black", "xfade"):
        shutil.copyfile(clip, destination)
        return destination
    fade = 0.28 if transition == "dip_black" else 0.45
    fade = min(fade, max(duration_s / 3.0, 0.1))
    out_start = max(duration_s - fade, 0.0)
    run_ffmpeg(
        [
            "-i", str(clip),
            "-vf", f"fade=t=in:st=0:d={fade:.3f},fade=t=out:st={out_start:.3f}:d={fade:.3f},format=yuv420p",
            *video_encode_args(),
            str(destination),
        ]
    )
    return destination


def burn_subtitles(video: Path, ass_path: Path, destination: Path, *, fontsdir: Path | None = None) -> Path:
    # fontsdir is an *option* of the subtitles filter, so it joins with ':' — a ','
    # would start a second (empty) filter and ffmpeg fails with "No such filter: ''".
    chain = f"subtitles={_escape_filter_path(ass_path)}"
    if fontsdir:
        chain += f":fontsdir={_escape_filter_path(fontsdir)}"
    run_ffmpeg(
        [
            "-i", str(video),
            "-vf", chain,
            *video_encode_args(),
            str(destination),
        ]
    )
    return destination


def mux_audio(video: Path, audio: Path, destination: Path, *, metadata: dict[str, str] | None = None, duration_s: float | None = None) -> Path:
    args = ["-i", str(video), "-i", str(audio), "-map", "0:v:0", "-map", "1:a:0"]
    if duration_s:
        args += ["-t", f"{duration_s:.3f}"]
    args += ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-shortest"]
    for key, value in (metadata or {}).items():
        args += ["-metadata", f"{key}={value}"]
    args.append(str(destination))
    run_ffmpeg(args)
    return destination


def extract_frames(video: Path, times: Sequence[float], out_dir: Path, *, width: int = 320) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for index, moment in enumerate(times):
        target = out_dir / f"frame_{index:03d}.png"
        try:
            run_ffmpeg(
                ["-ss", f"{max(moment, 0.0):.3f}", "-i", str(video), "-frames:v", "1", "-vf", f"scale={width}:-1", str(target)],
                timeout=120,
            )
            if target.exists():
                paths.append(target)
        except RenderError:
            continue
    return paths


def poster_frame(video: Path, destination: Path, *, at_ratio: float = 0.12) -> Path:
    duration = probe_duration(video)
    moment = max(duration * at_ratio, 0.5)
    destination.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(["-ss", f"{moment:.3f}", "-i", str(video), "-frames:v", "1", str(destination)], timeout=120)
    return destination


def encode_thumbnail_jpeg(source: Path, destination: Path, *, max_bytes: int = 2 * 1024 * 1024) -> Path:
    """YouTube thumbnails: 1280x720, under 2 MB.  JPEG quality is reduced until it fits."""

    from PIL import Image

    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        rgb = image.convert("RGB")
        if rgb.size != (1280, 720):
            rgb = rgb.resize((1280, 720), Image.LANCZOS)
        for quality in (94, 88, 82, 76, 70, 62, 55):
            rgb.save(destination, "JPEG", quality=quality, optimize=True)
            if destination.stat().st_size <= max_bytes:
                return destination
    return destination


@dataclass(slots=True)
class RenderedShot:
    path: Path
    duration_s: float
    width: int
    height: int
    warnings: list[str] = field(default_factory=list)


def render_shot_asset(request: Any, *, width: int = 1920, height: int = 1080, fps: int = FPS_DEFAULT) -> RenderedShot:
    """Local provider entry point: build one shot clip from a still (or a supplied asset)."""

    from .art import render_scene_art as _render_art  # local alias keeps imports explicit

    payload = dict((request.params or {}).get("payload", {}))
    shot = Shot(
        id=str(payload.get("shot_id", request.shot_id)),
        prompt=str(payload.get("prompt", request.prompt)),
        move=CameraMove(str(payload.get("move", "static"))),
        duration_s=float(payload.get("duration_s", request.duration_s)),
        palette=list(payload.get("palette", [])),
        on_screen_text=str(payload.get("on_screen_text", "")),
        asset_kind=str(payload.get("asset_kind", "generated_still")),
        size=ShotSize(str(payload.get("size", "ms"))),
        mood=str(payload.get("mood", "")),
    )
    warnings: list[str] = []
    destination = Path(request.output_path or f"local_{shot.id}.mp4")
    destination.parent.mkdir(parents=True, exist_ok=True)
    asset = str(payload.get("asset_uri", ""))
    if asset and Path(asset).exists():
        source = Path(asset)
    else:
        still = destination.with_suffix(".png")
        _render_art(shot, still, brand=payload.get("brand"), seed_text=str(payload.get("seed_text", "")))
        source = still
    if source.suffix.lower() in {".mp4", ".mov", ".webm", ".mkv"}:
        normalize_clip(source, destination, width=width, height=height, fps=fps, duration_s=shot.duration_s)
    else:
        still_to_clip(source, destination, shot, width=width, height=height, fps=fps)
    return RenderedShot(path=destination, duration_s=shot.duration_s, width=width, height=height, warnings=warnings)


def align_scene_durations(screenplay: Screenplay, segments: Sequence[dict[str, Any]], *, tail_pad_s: float = 0.55, min_scene_s: float = 2.4) -> dict[str, float]:
    """Make picture duration follow narration duration (never the other way round)."""

    targets: dict[str, float] = {}
    for index, scene in enumerate(screenplay.scenes):
        narration_s = float(segments[index]["duration_s"]) if index < len(segments) else 0.0
        current = scene.duration_s or 1.0
        target = max(narration_s + tail_pad_s, min_scene_s)
        if scene.shots:
            factor = target / current if current > 0 else 1.0
            for shot in scene.shots:
                shot.duration_s = round(max(shot.duration_s * factor, 1.1), 3)
            drift = target - sum(shot.duration_s for shot in scene.shots)
            if scene.shots and abs(drift) > 0.05:
                scene.shots[-1].duration_s = round(max(scene.shots[-1].duration_s + drift, 1.1), 3)
        targets[scene.id] = round(sum(shot.duration_s for shot in scene.shots), 3)
    return targets


@dataclass(slots=True)
class ComposeResult:
    path: Path
    duration_s: float
    width: int
    height: int
    poster: Path
    frames: list[Path]
    audio_path: Path
    warnings: list[str] = field(default_factory=list)
    scene_timings: list[dict[str, Any]] = field(default_factory=list)


def compose_video(
    screenplay: Screenplay,
    *,
    project_dir: Path,
    narration_segments: Sequence[dict[str, Any]],
    shot_assets: dict[str, str] | None = None,
    subtitles_ass: Path | None = None,
    fonts_dir: Path | None = None,
    brand: dict[str, Any] | None = None,
    width: int = 1920,
    height: int = 1080,
    fps: int = FPS_DEFAULT,
    seed_text: str = "",
    title: str = "",
    disclosure: str = "",
    audio_design: Any | None = None,
    on_event: Callable[[dict[str, Any]], None] | None = None,
    shot_notes: dict[str, list[str]] | None = None,
) -> ComposeResult:
    """Build the final MP4: shots -> scenes -> timeline -> audio -> subtitles -> mux."""

    emit = on_event or (lambda event: None)
    brand = {**DEFAULT_BRAND, **(brand or {})}
    shot_assets = shot_assets or {}
    shot_notes = shot_notes or {}
    warnings: list[str] = []
    work_dir = project_dir / "work"
    work_dir.mkdir(parents=True, exist_ok=True)
    scene_timings: list[dict[str, Any]] = []

    align_scene_durations(screenplay, narration_segments)

    def render_shot_clip(scene_id: str, shot: Shot) -> tuple[str, Path]:
        clip = work_dir / f"{shot.id}.mp4"
        asset = shot_assets.get(shot.id, "") or shot.asset_uri
        asset_path = Path(asset) if asset else None
        is_image = bool(asset_path and asset_path.suffix.lower() in IMAGE_SUFFIXES)
        if asset_path and asset_path.exists() and not is_image:
            normalize_clip(asset_path, clip, width=width, height=height, fps=fps, duration_s=shot.duration_s)
        else:
            # A still (provider image, procedural art plate or your own photo) gets real
            # camera movement via zoompan instead of being frozen on screen.
            still = asset_path if is_image and asset_path.exists() else None
            if still is None and shot.first_frame and Path(shot.first_frame).exists():
                still = Path(shot.first_frame)
            if still is None:
                still = work_dir / f"{shot.id}.png"
                if not still.exists():
                    render_scene_art(shot, still, brand=brand, seed_text=seed_text, size=(width, height))
            still_to_clip(still, clip, shot, width=width, height=height, fps=fps)
            if not asset:
                warnings.append(f"{shot.id}: no provider clip — rendered local art plate instead")
        for note in shot_notes.get(shot.id, []):
            warnings.append(f"{shot.id}: {note}")
        return scene_id, clip

    shot_jobs = [(scene.id, shot) for scene in screenplay.scenes for shot in scene.shots]
    clips_by_scene: dict[str, list[Path]] = {scene.id: [] for scene in screenplay.scenes}
    workers = max(1, min(4, (os.cpu_count() or 2)))
    if workers > 1 and len(shot_jobs) > 1:
        from concurrent.futures import ThreadPoolExecutor

        with ThreadPoolExecutor(max_workers=workers) as pool:
            for scene_id, clip in pool.map(lambda job: render_shot_clip(*job), shot_jobs):
                clips_by_scene[scene_id].append(clip)
                emit({"type": "shot_rendered", "scene_id": scene_id, "clip": str(clip)})
    else:
        for job in shot_jobs:
            scene_id, clip = render_shot_clip(*job)
            clips_by_scene[scene_id].append(clip)

    scene_clips: list[Path] = []
    cursor = 0.0
    for scene in screenplay.scenes:
        emit({"type": "scene_start", "scene_id": scene.id, "beat": scene.beat})
        shot_clips: list[Path] = clips_by_scene[scene.id]
        scene_clip = work_dir / f"scene_{scene.id}.mp4"
        concat_clips(shot_clips, scene_clip)
        scene_duration = probe_duration(scene_clip) or sum(shot.duration_s for shot in scene.shots)
        faded = work_dir / f"scene_{scene.id}_fade.mp4"
        apply_fades(scene_clip, faded, duration_s=scene_duration, transition=scene.transition, fps=fps)
        scene_clips.append(faded)
        scene_timings.append(
            {
                "scene_id": scene.id,
                "beat": scene.beat,
                "start_s": round(cursor, 3),
                "end_s": round(cursor + scene_duration, 3),
                "duration_s": round(scene_duration, 3),
                "shots": [shot.id for shot in scene.shots],
            }
        )
        cursor += scene_duration
        emit({"type": "scene_done", "scene_id": scene.id, "duration_s": round(scene_duration, 2)})

    timeline = work_dir / "timeline.mp4"
    concat_clips(scene_clips, timeline)
    total_duration = probe_duration(timeline) or cursor

    audio_path = project_dir / "audio_mix.wav"
    build_audio_mix(
        screenplay,
        narration_segments=narration_segments,
        scene_timings=scene_timings,
        destination=audio_path,
        duration_s=total_duration,
        audio_design=audio_design or screenplay.audio,
        work_dir=work_dir,
        seed_text=seed_text,
        warnings=warnings,
    )

    subtitled = work_dir / "subtitled.mp4"
    if subtitles_ass and Path(subtitles_ass).exists():
        burn_subtitles(timeline, Path(subtitles_ass), subtitled, fontsdir=fonts_dir)
    else:
        shutil.copyfile(timeline, subtitled)
        warnings.append("no ASS subtitles provided — captions not burned")

    final = project_dir / "video.mp4"
    mux_audio(
        subtitled,
        audio_path,
        final,
        metadata={
            "title": title or screenplay.logline[:80],
            "comment": disclosure[:200],
            "artist": str(brand.get("watermark", "")) or "creator-loop",
            "description": f"screenplay={screenplay.id}",
        },
        duration_s=total_duration,
    )
    poster = project_dir / "poster.png"
    try:
        poster_frame(final, poster)
    except RenderError as error:
        warnings.append(f"poster frame failed: {error}")
    frames = extract_frames(final, [total_duration * ratio for ratio in (0.1, 0.35, 0.6, 0.85)], work_dir / "frames")
    emit({"type": "compose_done", "path": str(final), "duration_s": round(total_duration, 2)})
    return ComposeResult(
        path=final,
        duration_s=round(probe_duration(final) or total_duration, 3),
        width=width,
        height=height,
        poster=poster,
        frames=frames,
        audio_path=audio_path,
        warnings=warnings[:24],
        scene_timings=scene_timings,
    )


def build_audio_mix(
    screenplay: Screenplay,
    *,
    narration_segments: Sequence[dict[str, Any]],
    scene_timings: Sequence[dict[str, Any]],
    destination: Path,
    duration_s: float,
    audio_design: Any,
    work_dir: Path,
    seed_text: str = "",
    warnings: list[str] | None = None,
) -> Path:
    """Veo-3-style layered audio: narration + ducked music + SFX cues + ambience bed."""

    warnings = warnings if warnings is not None else []
    tracks: list[MixTrack] = []
    scene_by_id = {scene.id: scene for scene in screenplay.scenes}
    timing_by_scene = {row["scene_id"]: row for row in scene_timings}
    duck_windows: list[tuple[float, float]] = []

    for index, segment in enumerate(narration_segments):
        path = segment.get("path", "")
        if not path or not Path(path).exists():
            continue
        if index < len(scene_timings):
            start = float(scene_timings[index]["start_s"])
        else:
            start = float(segment.get("start_s", 0.0))
        end = start + float(segment.get("duration_s", audio_duration(path)))
        duck_windows.append((start, end))
        tracks.append(MixTrack(path=path, start_s=start, gain_db=0.0, label="narration"))

    seed = abs(hash(seed_text)) % 10_000 if seed_text else 7
    music_path = work_dir / "music.wav"
    generate_music(
        max(duration_s, 2.0),
        mood=str(getattr(audio_design, "music_mood", "calm")),
        seed=seed,
        out_path=music_path,
        duck_windows=duck_windows,
        duck_db=float(getattr(audio_design, "duck_db", -9.0)),
    )
    tracks.append(
        MixTrack(
            path=str(music_path),
            start_s=0.0,
            gain_db=float(getattr(audio_design, "music_gain_db", -18.0)),
            fade_in_s=1.0,
            fade_out_s=2.0,
            label="music",
        )
    )

    sfx_path = work_dir / "sfx.wav"
    _render_sfx_bed(screenplay, timing_by_scene, scene_by_id, sfx_path, duration_s, float(getattr(audio_design, "sfx_gain_db", -12.0)), seed, work_dir)
    if sfx_path.exists():
        tracks.append(MixTrack(path=str(sfx_path), start_s=0.0, gain_db=0.0, label="sfx"))

    ambience_kind = str(getattr(audio_design, "ambience", "room_tone"))
    if ambience_kind and ambience_kind != "none":
        ambience_path = work_dir / "ambience.wav"
        generate_ambience(max(duration_s, 2.0), ambience_kind, seed=seed + 1, out_path=ambience_path)
        tracks.append(
            MixTrack(
                path=str(ambience_path),
                start_s=0.0,
                gain_db=float(getattr(audio_design, "ambience_gain_db", -30.0)),
                fade_in_s=0.8,
                fade_out_s=1.5,
                label="ambience",
            )
        )

    mix_tracks(
        tracks,
        destination,
        duration_s=duration_s,
        master_lufs=float(getattr(audio_design, "master_lufs", -14.0)),
        master_tp=float(getattr(audio_design, "master_tp_db", -1.5)),
        master_lra=float(getattr(audio_design, "master_lra", 11.0)),
    )
    if not duck_windows:
        warnings.append("no narration segments placed — audio bed has no ducking reference")
    return destination


def _render_sfx_bed(
    screenplay: Screenplay,
    timing_by_scene: dict[str, dict[str, Any]],
    scene_by_id: dict[str, Any],
    destination: Path,
    duration_s: float,
    gain_db: float,
    seed: int,
    work_dir: Path,
) -> Path | None:
    """Place per-scene SFX cues on one bed so the mix stays a fixed stem count."""

    import numpy as np

    cues: list[tuple[float, str]] = []
    for row in timing_by_scene.values():
        scene = scene_by_id.get(row["scene_id"])
        if scene is None:
            continue
        for offset_index, name in enumerate(scene.sfx):
            cues.append((float(row["start_s"]) + 0.15 + offset_index * 0.5, name))
        if scene.beat == "hook":
            cues.append((float(row["start_s"]) + 0.05, "whoosh"))
        if scene.beat == "cta":
            cues.append((float(row["start_s"]) + 0.1, "reveal"))
        if scene.transition in ("xfade", "dip_black"):
            cues.append((float(row["end_s"]) - 0.45, "swoosh"))
    if not cues:
        return None
    total = int(max(duration_s, 1.0) * 44100)
    bed = np.zeros((total, 2), dtype="float32")
    cache: dict[str, Any] = {}
    for moment, name in cues:
        if name not in cache:
            path = work_dir / f"sfx_{name}.wav"
            if not path.exists():
                generate_sfx(name, gain_db=gain_db, seed=seed, out_path=path)
            from .audio import _read_wav, _resample  # internal helpers shared with the mixer

            cache[name] = _resample(_read_wav(path)[0], _read_wav(path)[1])
        data = cache[name]
        start = int(moment * 44100)
        end = min(start + len(data), total)
        if end <= start:
            continue
        bed[start:end] += data[: end - start]
    peak = float(np.max(np.abs(bed)) or 1.0)
    if peak > 0.98:
        bed = bed / peak * 0.98
    from .audio import _write_wav

    _write_wav(destination, bed)
    return destination


def geometry(aspect: str, resolution: str) -> tuple[int, int]:
    heights = {"720p": 720, "1080p": 1080}
    if aspect == "9:16":
        width = int(heights.get(resolution, 1080) * 9 / 16)
        return (1080, 1920) if resolution == "1080p" else (width, heights.get(resolution, 1080))
    if aspect == "1:1":
        side = heights.get(resolution, 1080)
        return side, side
    return (1920, 1080) if resolution == "1080p" else (1280, 720)


def doctor() -> dict[str, Any]:
    ffmpeg = ffmpeg_path()
    capabilities: dict[str, bool] = {}
    if ffmpeg:
        try:
            completed = subprocess.run([ffmpeg, "-hide_banner", "-filters"], capture_output=True, text=True, check=False, timeout=60)
            text = completed.stdout
            for name in ("zoompan", "subtitles", "ass", "loudnorm", "amix", "xfade", "scale", "fade", "rotate", "adelay"):
                capabilities[name] = bool(re.search(rf"\b{name}\b", text))
        except Exception:
            pass
    return {
        "ffmpeg": ffmpeg or "",
        "ffmpeg_ok": bool(ffmpeg),
        "filters": capabilities,
        "drawtext": capabilities.get("drawtext", False),
        "libass": capabilities.get("ass", False) or capabilities.get("subtitles", False),
        "note": "captions are burned with libass (drawtext is absent in some static builds)",
    }


def shot_count(screenplay: Screenplay) -> int:
    return sum(len(scene.shots) for scene in screenplay.scenes)


def estimate_local_render_seconds(screenplay: Screenplay, *, width: int = 1920, fps: int = FPS_DEFAULT) -> float:
    """Rough planning number: stills encode far faster than realtime on x264 veryfast."""

    runtime = sum(shot.duration_s for scene in screenplay.scenes for shot in scene.shots)
    per_shot = 0.6 if width <= 1280 else 1.4
    return round(runtime * 0.18 + shot_count(screenplay) * per_shot + 6.0, 1)


def frames_for_duration(duration_s: float, fps: int = FPS_DEFAULT) -> int:
    return max(int(math.ceil(duration_s * fps)), 1)


def shot_is_static(shot: Shot) -> bool:
    return shot.move is CameraMove.STATIC and shot.asset_kind == "generated_still"
