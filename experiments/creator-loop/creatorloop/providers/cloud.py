"""Cloud video providers: Veo 3 (Gemini API), Runway Gen-4, Kling AI, Sora 2.

Each adapter is split into pure functions (:meth:`build_request`,
:meth:`parse_response`) and a thin transport layer, so the request/response
contracts are testable offline from recorded fixtures — see
``tests/test_providers_contract.py``.  Credentials are read from the environment
per provider and are never persisted or logged.

Endpoint shapes follow the providers' public developer docs as of 2026-10; every
base URL is overridable via environment variables because these APIs are versioned
and region-split.
"""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Sequence

from ..contracts import CameraMove, ProviderId, Shot
from ..direction import compile_for_kling, compile_for_runway, compile_for_sora, compile_for_veo, expand_prompt
from .base import (
    Availability,
    Capability,
    ProviderAuthError,
    ProviderError,
    ProviderQuotaExceeded,
    ProviderRateLimited,
    ProviderRejected,
    ProviderTimeout,
    ProviderUnavailable,
    ShotRequest,
    ShotResult,
)

USER_AGENT = "creator-loop/0.1 (+local authenticity-first pipeline)"
DEFAULT_TIMEOUT_S = 60.0
DEFAULT_POLL_INTERVAL_S = 8.0
DEFAULT_POLL_DEADLINE_S = 900.0


def _read_file_b64(path: str) -> tuple[str, str]:
    target = Path(path)
    mime = mimetypes.guess_type(target.name)[0] or "image/jpeg"
    return base64.b64encode(target.read_bytes()).decode("ascii"), mime


def _http_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    payload: dict[str, Any] | None = None,
    timeout: float = DEFAULT_TIMEOUT_S,
    provider: ProviderId | None = None,
) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    for key, value in headers.items():
        request.add_header(key, value)
    if data is not None and "Content-Type" not in headers:
        request.add_header("Content-Type", "application/json")
    request.add_header("User-Agent", USER_AGENT)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:800]
        raise map_http_error(error.code, detail, provider) from error
    except urllib.error.URLError as error:
        raise ProviderUnavailable(f"network unreachable: {error.reason}", provider=provider) from error
    except TimeoutError as error:
        raise ProviderTimeout("request timed out", provider=provider) from error
    try:
        return json.loads(body)
    except json.JSONDecodeError as error:
        raise ProviderError(f"non-JSON response: {body[:200]}", provider=provider) from error


def _http_multipart(
    url: str,
    fields: dict[str, str],
    files: dict[str, str],
    headers: dict[str, str],
    *,
    timeout: float = DEFAULT_TIMEOUT_S,
    provider: ProviderId | None = None,
) -> dict[str, Any]:
    boundary = f"----creatorloop{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for key, value in fields.items():
        chunks += [f"--{boundary}\r\n".encode(), f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(), f"{value}\r\n".encode()]
    for key, path in files.items():
        filename = Path(path).name
        mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        chunks += [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode(),
            f"Content-Type: {mime}\r\n\r\n".encode(),
            Path(path).read_bytes(),
            b"\r\n",
        ]
    chunks += [f"--{boundary}--\r\n".encode()]
    request = urllib.request.Request(url, data=b"".join(chunks), method="POST")
    request.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    for key, value in headers.items():
        request.add_header(key, value)
    request.add_header("User-Agent", USER_AGENT)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:800]
        raise map_http_error(error.code, detail, provider) from error
    except urllib.error.URLError as error:
        raise ProviderUnavailable(f"network unreachable: {error.reason}", provider=provider) from error


def _download(url: str, destination: Path, headers: dict[str, str], *, timeout: float = 300.0, provider: ProviderId | None = None) -> Path:
    request = urllib.request.Request(url, method="GET")
    for key, value in headers.items():
        request.add_header(key, value)
    request.add_header("User-Agent", USER_AGENT)
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310
            destination.write_bytes(response.read())
    except urllib.error.HTTPError as error:
        raise map_http_error(error.code, error.read().decode("utf-8", "replace")[:400], provider) from error
    except urllib.error.URLError as error:
        raise ProviderUnavailable(f"download failed: {error.reason}", provider=provider) from error
    return destination


def map_http_error(status: int, detail: str, provider: ProviderId | None) -> ProviderError:
    lowered = detail.lower()
    if status in (401, 403):
        if "quota" in lowered or "exceeded" in lowered:
            return ProviderQuotaExceeded(f"{status}: quota/permission", provider=provider, detail=detail)
        return ProviderAuthError(f"{status}: auth or permission denied", provider=provider, detail=detail)
    if status == 429:
        return ProviderRateLimited("429: rate limited", provider=provider, detail=detail)
    if status == 400 and any(word in lowered for word in ("safety", "moderation", "policy", "blocked", "prohibited")):
        return ProviderRejected("400: prompt rejected by provider policy", provider=provider, detail=detail)
    if status == 408 or status >= 500:
        return ProviderTimeout(f"{status}: provider error", provider=provider, detail=detail)
    return ProviderError(f"{status}: request failed", provider=provider, detail=detail)


@dataclass(slots=True)
class CloudProvider:
    """Common transport/polling behaviour for the four paid backends."""

    poll_interval_s: float = DEFAULT_POLL_INTERVAL_S
    poll_deadline_s: float = DEFAULT_POLL_DEADLINE_S

    # -- subclass surface ---------------------------------------------------
    @property
    def provider_id(self) -> ProviderId:  # pragma: no cover - abstract
        raise NotImplementedError

    @property
    def capability(self) -> Capability:  # pragma: no cover - abstract
        raise NotImplementedError

    def availability(self) -> Availability:  # pragma: no cover - abstract
        raise NotImplementedError

    def generate(self, request: ShotRequest) -> ShotResult:  # pragma: no cover - abstract
        raise NotImplementedError

    # -- shared helpers -----------------------------------------------------
    def poll(
        self,
        fetch: Callable[[], dict[str, Any]],
        *,
        done: Callable[[dict[str, Any]], bool],
        succeeded: Callable[[dict[str, Any]], bool],
        extract_error: Callable[[dict[str, Any]], str],
    ) -> dict[str, Any]:
        deadline = time.time() + self.poll_deadline_s
        attempts = 0
        while True:
            payload = fetch()
            attempts += 1
            if done(payload):
                if succeeded(payload):
                    return payload
                raise ProviderRejected(extract_error(payload) or "task failed", provider=self.provider_id)
            if time.time() > deadline:
                raise ProviderTimeout(
                    f"task did not finish in {self.poll_deadline_s:.0f}s ({attempts} polls)", provider=self.provider_id
                )
            time.sleep(min(self.poll_interval_s * (1.25 ** min(attempts, 4)), 30.0))


class VeoProvider(CloudProvider):
    """Google Veo 3 / 3.1 through the Gemini API — native audio, 1080p, 9:16."""

    def __init__(
        self,
        api_key: str | None = None,
        *,
        model: str = "veo-3.0-generate-001",
        base_url: str | None = None,
    ) -> None:
        super().__init__()
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
        self.model = os.environ.get("VEO_MODEL", model)
        self.base_url = base_url or os.environ.get(
            "VEO_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"
        )

    @property
    def provider_id(self) -> ProviderId:
        return ProviderId.VEO

    @property
    def capability(self) -> Capability:
        fast = "fast" in self.model
        return Capability(
            provider=ProviderId.VEO,
            text_to_video=True,
            image_to_video=True,
            native_audio=True,
            native_audio_dialogue=True,
            max_clip_s=8.0,
            resolutions=("720p", "1080p"),
            aspects=("16:9", "9:16"),
            camera_control=False,  # direction is expressed in prompt language
            camera_vocabulary=tuple(CameraMove),
            reference_images=3,  # ingredients-to-video / asset references
            keyframes=True,
            motion_quality=4,
            realism=5,
            cost_per_second_usd=0.40 if not fast else 0.15,
            requires_key=True,
            env_key="GEMINI_API_KEY",
            latency_s=(60, 420),
            strengths=("native synchronized audio (dialogue+SFX+ambience)", "top-tier photorealism", "1080p and 9:16", "reference images"),
            limits=("8s max per clip", "no explicit camera_control API — direction must be prompt-encoded", "paid only"),
        )

    def availability(self) -> Availability:
        return Availability(
            provider=self.provider_id,
            available=bool(self.api_key),
            reason="" if self.api_key else "GEMINI_API_KEY not set",
            key_present=bool(self.api_key),
        )

    def build_request(self, shot: Shot, *, aspect: str, resolution: str, seed: int | None = None) -> dict[str, Any]:
        params = compile_for_veo(shot, aspect_ratio=aspect, resolution=resolution)
        params["durationSeconds"] = 8 if shot.duration_s > 6 else (6 if shot.duration_s > 4 else 4)
        if seed is not None:
            params["seed"] = seed
        instance: dict[str, Any] = {"prompt": params.pop("prompt")}
        references = [ref for ref in (shot.first_frame, shot.last_frame) if ref and Path(ref).exists()]
        if references:
            instance["referenceImages"] = []
            for ref in references[:3]:
                encoded, mime = _read_file_b64(ref)
                instance["referenceImages"].append(
                    {"image": {"bytesBase64Encoded": encoded, "mimeType": mime}, "referenceType": "asset"}
                )
        return {"instances": [instance], "parameters": params}

    def generate(self, request: ShotRequest) -> ShotResult:
        if not self.api_key:
            raise ProviderUnavailable("GEMINI_API_KEY not set", provider=self.provider_id)
        started = time.time()
        url = f"{self.base_url}/models/{self.model}:predictLongRunning?key={urllib.parse.quote(self.api_key)}"
        payload = request.params.get("payload") or {}
        if not payload:
            raise ProviderError("missing veo request payload", provider=self.provider_id)
        launched = _http_json("POST", url, headers={}, payload=dict(payload), provider=self.provider_id)
        operation = launched.get("name", "")
        if not operation:
            raise ProviderError("veo: no operation name in response", provider=self.provider_id, detail=json.dumps(launched)[:200])
        fetch_url = (
            f"{self.base_url}/models/{self.model}:fetchPredictOperation?key={urllib.parse.quote(self.api_key)}"
        )

        def fetch() -> dict[str, Any]:
            return _http_json(
                "POST", fetch_url, headers={}, payload={"operationName": operation}, provider=self.provider_id
            )

        final = self.poll(
            fetch,
            done=lambda payload: bool(payload.get("done")),
            succeeded=lambda payload: "response" in payload and not payload.get("error"),
            extract_error=lambda payload: json.dumps(payload.get("error", {}))[:400],
        )
        videos = final.get("response", {}).get("generateVideoResponse", {}).get("generatedSamples", [])
        if not videos:
            videos = final.get("response", {}).get("generatedVideos", [])
        first = videos[0] if videos else {}
        uri = first.get("video", {}).get("uri") or first.get("videoUri") or ""
        if not uri:
            raise ProviderError("veo: completed operation without video uri", provider=self.provider_id)
        destination = Path(request.output_path or f"veo_{request.shot_id}.mp4")
        download_url = uri if uri.startswith("http") else f"{self.base_url}/{uri.lstrip('/')}"
        if "key=" not in download_url:
            separator = "&" if "?" in download_url else "?"
            download_url = f"{download_url}{separator}key={urllib.parse.quote(self.api_key)}"
        _download(download_url, destination, headers={}, provider=self.provider_id)
        return ShotResult(
            shot_id=request.shot_id,
            provider=self.provider_id,
            uri=str(destination),
            duration_s=request.duration_s,
            width=1920 if request.resolution == "1080p" else 1280,
            height=1080 if request.resolution == "1080p" else 720,
            has_native_audio=True,
            elapsed_s=round(time.time() - started, 2),
            cost_usd=round(request.duration_s * self.capability.cost_per_second_usd, 4),
            task_id=operation,
            warnings=["native audio present: skip local narration for this shot or duck it"],
        )


class RunwayProvider(CloudProvider):
    """Runway Gen-4 (gen4_turbo) / Gen-4.5 — reference-driven image-to-video."""

    def __init__(self, api_secret: str | None = None, *, model: str = "gen4_turbo", base_url: str | None = None) -> None:
        super().__init__()
        self.api_secret = api_secret or os.environ.get("RUNWAYML_API_SECRET", "")
        self.model = os.environ.get("RUNWAY_MODEL", model)
        self.base_url = base_url or os.environ.get("RUNWAY_BASE_URL", "https://api.dev.runwayml.com/v1")
        self.version = os.environ.get("RUNWAY_VERSION", "2024-11-06")

    @property
    def provider_id(self) -> ProviderId:
        return ProviderId.RUNWAY

    @property
    def capability(self) -> Capability:
        return Capability(
            provider=ProviderId.RUNWAY,
            text_to_video=self.model.startswith("gen4.5"),
            image_to_video=True,
            native_audio=False,
            max_clip_s=10.0,
            resolutions=("720p", "1080p"),
            aspects=("16:9", "9:16", "1:1"),
            camera_control=True,
            camera_vocabulary=tuple(move for move in CameraMove if move not in (CameraMove.ORBIT_LEFT, CameraMove.ORBIT_RIGHT, CameraMove.HANDHELD)),
            reference_images=1,
            keyframes=True,
            motion_quality=5,
            realism=5,
            cost_per_second_usd=0.05,
            requires_key=True,
            env_key="RUNWAYML_API_SECRET",
            latency_s=(45, 300),
            strengths=(
                "director-grade control from a first frame",
                "explicit camera_control vocabulary",
                "consistent subjects via Gen-4 references",
                "credit pricing makes short inserts cheap",
            ),
            limits=("no native audio", "image-to-video for gen4_turbo (needs a first frame)", "10s max"),
        )

    def availability(self) -> Availability:
        return Availability(
            provider=self.provider_id,
            available=bool(self.api_secret),
            reason="" if self.api_secret else "RUNWAYML_API_SECRET not set",
            key_present=bool(self.api_secret),
        )

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_secret}", "X-Runway-Version": self.version}

    def build_request(self, shot: Shot, *, aspect: str = "1280:720", duration: int = 10) -> dict[str, Any]:
        params = compile_for_runway(shot, model=self.model, ratio=aspect, duration=duration)
        if not shot.first_frame:
            params.pop("promptImage", None)
            params["model"] = "gen4.5" if self.model.startswith("gen4_turbo") else self.model
        elif Path(shot.first_frame).exists():
            encoded, mime = _read_file_b64(shot.first_frame)
            params["promptImage"] = f"data:{mime};base64,{encoded}"
        return params

    def generate(self, request: ShotRequest) -> ShotResult:
        if not self.api_secret:
            raise ProviderUnavailable("RUNWAYML_API_SECRET not set", provider=self.provider_id)
        started = time.time()
        payload = request.params.get("payload") or {}
        endpoint = "image_to_video" if "promptImage" in payload else "text_to_video"
        launched = _http_json(
            "POST", f"{self.base_url}/{endpoint}", headers=self.headers(), payload=payload, provider=self.provider_id
        )
        task_id = launched.get("id", "")
        if not task_id:
            raise ProviderError("runway: no task id", provider=self.provider_id, detail=json.dumps(launched)[:200])

        final = self.poll(
            lambda: _http_json("GET", f"{self.base_url}/tasks/{task_id}", headers=self.headers(), provider=self.provider_id),
            done=lambda payload: payload.get("status") in {"SUCCEEDED", "FAILED", "CANCELLED"},
            succeeded=lambda payload: payload.get("status") == "SUCCEEDED",
            extract_error=lambda payload: str(payload.get("failure") or payload.get("failureCode") or "task failed"),
        )
        outputs = final.get("output") or []
        if not outputs:
            raise ProviderError("runway: succeeded without output", provider=self.provider_id)
        destination = Path(request.output_path or f"runway_{request.shot_id}.mp4")
        _download(outputs[0], destination, headers={}, provider=self.provider_id)
        return ShotResult(
            shot_id=request.shot_id,
            provider=self.provider_id,
            uri=str(destination),
            duration_s=float(request.duration_s),
            width=1280,
            height=720,
            elapsed_s=round(time.time() - started, 2),
            cost_usd=round(request.duration_s * self.capability.cost_per_second_usd, 4),
            task_id=task_id,
            warnings=["no native audio: local audio design provides narration/SFX"],
        )


class KlingProvider(CloudProvider):
    """Kling AI — natural motion, generous free tier, camera_control + lip-sync."""

    base_urls = {
        "global": "https://api.klingai.com",
        "singapore": "https://api-singapore.klingai.com",
        "beijing": "https://api-beijing.klingai.com",
    }

    def __init__(
        self,
        access_key: str | None = None,
        secret_key: str | None = None,
        *,
        model_name: str = "kling-v2-master",
        region: str = "global",
        base_url: str | None = None,
    ) -> None:
        super().__init__()
        self.access_key = access_key or os.environ.get("KLING_ACCESS_KEY", "")
        self.secret_key = secret_key or os.environ.get("KLING_SECRET_KEY", "")
        self.model_name = os.environ.get("KLING_MODEL", model_name)
        self.base_url = base_url or os.environ.get("KLING_BASE_URL") or self.base_urls.get(region, self.base_urls["global"])

    @property
    def provider_id(self) -> ProviderId:
        return ProviderId.KLING

    @property
    def capability(self) -> Capability:
        return Capability(
            provider=ProviderId.KLING,
            text_to_video=True,
            image_to_video=True,
            native_audio=False,
            max_clip_s=10.0,
            resolutions=("720p", "1080p"),
            aspects=("16:9", "9:16", "1:1"),
            camera_control=True,
            camera_vocabulary=tuple(CameraMove),
            reference_images=2,
            keyframes=True,
            lip_sync=True,
            motion_quality=5,
            realism=4,
            cost_per_second_usd=0.035,
            free_quota_units_per_day=66.0,  # daily free credits (std 5s ≈ 20 credits → ~3 free clips/day)
            requires_key=True,
            env_key="KLING_ACCESS_KEY/KLING_SECRET_KEY",
            latency_s=(60, 600),
            strengths=("most natural subject motion", "explicit 6-axis camera_control", "lip-sync endpoint", "daily free credits"),
            limits=("no native audio", "JWT auth from key pair", "queue times vary"),
        )

    def availability(self) -> Availability:
        ready = bool(self.access_key and self.secret_key)
        return Availability(
            provider=self.provider_id,
            available=ready,
            reason="" if ready else "KLING_ACCESS_KEY/KLING_SECRET_KEY not set",
            key_present=ready,
            free_quota_remaining=self.capability.free_quota_units_per_day if ready else None,
        )

    def token(self) -> str:
        """Kling auth is a self-signed HS256 JWT (no PyJWT dependency needed)."""

        import hashlib
        import hmac

        now = int(time.time())
        header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode()).rstrip(b"=")
        claims = {"iss": self.access_key, "exp": now + 1800, "nbf": now - 5, "iat": now}
        payload = base64.urlsafe_b64encode(json.dumps(claims, separators=(",", ":")).encode()).rstrip(b"=")
        signing_input = header + b"." + payload
        signature = hmac.new(self.secret_key.encode(), signing_input, hashlib.sha256).digest()
        return (signing_input + b"." + base64.urlsafe_b64encode(signature).rstrip(b"=")).decode()

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token()}"}

    def build_request(self, shot: Shot, *, aspect_ratio: str = "16:9", duration: str = "5", mode: str = "std") -> dict[str, Any]:
        params = compile_for_kling(
            shot, model_name=self.model_name, mode=mode, duration=duration, aspect_ratio=aspect_ratio
        )
        if shot.first_frame and Path(shot.first_frame).exists():
            encoded, _ = _read_file_b64(shot.first_frame)
            params["image"] = encoded
        return params

    def generate(self, request: ShotRequest) -> ShotResult:
        if not (self.access_key and self.secret_key):
            raise ProviderUnavailable("KLING_ACCESS_KEY/KLING_SECRET_KEY not set", provider=self.provider_id)
        started = time.time()
        payload = request.params.get("payload") or {}
        endpoint = "image2video" if "image" in payload else "text2video"
        launched = _http_json(
            "POST", f"{self.base_url}/v1/videos/{endpoint}", headers=self.headers(), payload=payload, provider=self.provider_id
        )
        task_id = launched.get("data", {}).get("task_id", "")
        if not task_id:
            raise ProviderError("kling: no task_id", provider=self.provider_id, detail=json.dumps(launched)[:300])

        def fetch() -> dict[str, Any]:
            return _http_json(
                "GET",
                f"{self.base_url}/v1/videos/{endpoint}/{task_id}",
                headers=self.headers(),
                provider=self.provider_id,
            )

        final = self.poll(
            fetch,
            done=lambda payload: payload.get("data", {}).get("task_status") in {"succeed", "failed"},
            succeeded=lambda payload: payload.get("data", {}).get("task_status") == "succeed",
            extract_error=lambda payload: str(payload.get("message") or payload.get("data", {}).get("task_status_msg")),
        )
        videos = final.get("data", {}).get("task_result", {}).get("videos", [])
        if not videos:
            raise ProviderError("kling: succeeded without videos", provider=self.provider_id)
        destination = Path(request.output_path or f"kling_{request.shot_id}.mp4")
        _download(videos[0].get("url", ""), destination, headers={}, provider=self.provider_id)
        return ShotResult(
            shot_id=request.shot_id,
            provider=self.provider_id,
            uri=str(destination),
            duration_s=float(videos[0].get("duration", request.duration_s)),
            width=1280,
            height=720,
            elapsed_s=round(time.time() - started, 2),
            cost_usd=round(request.duration_s * self.capability.cost_per_second_usd, 4),
            task_id=task_id,
            warnings=["free-tier credits consumed; check remaining quota before batch runs"],
        )


class SoraProvider(CloudProvider):
    """OpenAI Sora 2 — long narrative shots, character consistency, remix."""

    def __init__(self, api_key: str | None = None, *, model: str = "sora-2", base_url: str | None = None) -> None:
        super().__init__()
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.model = os.environ.get("SORA_MODEL", model)
        self.base_url = base_url or os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

    @property
    def provider_id(self) -> ProviderId:
        return ProviderId.SORA

    @property
    def capability(self) -> Capability:
        pro = self.model.endswith("pro")
        return Capability(
            provider=ProviderId.SORA,
            text_to_video=True,
            image_to_video=True,
            native_audio=True,
            native_audio_dialogue=True,
            max_clip_s=20.0 if pro else 12.0,
            resolutions=("720p", "1080p"),
            aspects=("16:9", "9:16"),
            camera_control=False,
            camera_vocabulary=tuple(CameraMove),
            reference_images=1,
            keyframes=True,
            character_consistency=True,
            motion_quality=4,
            realism=5,
            cost_per_second_usd=0.50 if pro else 0.10,
            requires_key=True,
            env_key="OPENAI_API_KEY",
            latency_s=(60, 600),
            strengths=("longest single-shot narrative (up to 20s on pro)", "character/reference consistency across shots", "synchronized dialogue and ambient audio", "remix of a previous generation"),
            limits=("camera direction is prompt-encoded", "paid only", "size/seconds enum-constrained"),
        )

    def availability(self) -> Availability:
        return Availability(
            provider=self.provider_id,
            available=bool(self.api_key),
            reason="" if self.api_key else "OPENAI_API_KEY not set",
            key_present=bool(self.api_key),
        )

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    def build_request(self, shot: Shot, *, size: str = "1280x720", seconds: str = "8", character_ids: Sequence[str] = ()) -> dict[str, Any]:
        params = compile_for_sora(shot, seconds=seconds, size=size)
        params["model"] = self.model
        params.pop("input_reference", None)
        if shot.with_native_audio and shot.audio_cue:
            params["prompt"] = f"{params['prompt']}. Audio: {shot.audio_cue}"
        if character_ids:
            params["characters"] = [{"id": cid} for cid in character_ids]
        return params

    def generate(self, request: ShotRequest) -> ShotResult:
        if not self.api_key:
            raise ProviderUnavailable("OPENAI_API_KEY not set", provider=self.provider_id)
        started = time.time()
        payload = dict(request.params.get("payload") or {})
        model = payload.pop("model", self.model)
        files: dict[str, str] = {}
        reference = payload.pop("input_reference", "")
        if reference and Path(reference).exists():
            files["input_reference"] = reference
        fields = {key: (json.dumps(value) if isinstance(value, (list, dict)) else str(value)) for key, value in payload.items()}
        fields["model"] = model
        launched = _http_multipart(
            f"{self.base_url}/videos", fields, files, self.headers(), provider=self.provider_id
        )
        video_id = launched.get("id", "")
        if not video_id:
            raise ProviderError("sora: no video id", provider=self.provider_id, detail=json.dumps(launched)[:200])

        final = self.poll(
            lambda: _http_json("GET", f"{self.base_url}/videos/{video_id}", headers=self.headers(), provider=self.provider_id),
            done=lambda payload: payload.get("status") in {"completed", "failed"},
            succeeded=lambda payload: payload.get("status") == "completed",
            extract_error=lambda payload: json.dumps(payload.get("error") or {})[:300],
        )
        destination = Path(request.output_path or f"sora_{request.shot_id}.mp4")
        _download(f"{self.base_url}/videos/{video_id}/content", destination, self.headers(), provider=self.provider_id)
        size = final.get("size", request.params.get("size", "1280x720"))
        width, _, height = str(size).partition("x")
        return ShotResult(
            shot_id=request.shot_id,
            provider=self.provider_id,
            uri=str(destination),
            duration_s=float(final.get("seconds", request.duration_s)),
            width=int(width or 1280),
            height=int(height or 720),
            has_native_audio=True,
            elapsed_s=round(time.time() - started, 2),
            cost_usd=round(float(final.get("seconds", request.duration_s)) * self.capability.cost_per_second_usd, 4),
            task_id=video_id,
            warnings=["native audio present: reconcile with local narration track before mixing"],
        )


def all_cloud_providers() -> list[CloudProvider]:
    return [VeoProvider(), RunwayProvider(), KlingProvider(), SoraProvider()]


def provider_from_env(provider_id: ProviderId) -> CloudProvider | None:
    mapping: dict[ProviderId, Callable[[], CloudProvider]] = {
        ProviderId.VEO: VeoProvider,
        ProviderId.RUNWAY: RunwayProvider,
        ProviderId.KLING: KlingProvider,
        ProviderId.SORA: SoraProvider,
    }
    factory = mapping.get(provider_id)
    return factory() if factory else None


def expand(shot: Shot) -> str:  # re-export for callers that only need prompt expansion
    return expand_prompt(shot)
