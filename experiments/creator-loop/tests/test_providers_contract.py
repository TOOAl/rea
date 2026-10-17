"""Offline contract tests for the cloud adapters.

No network, no keys: every adapter is exercised through its pure ``build_request``
path plus recorded response shapes, and the router is checked for the free-only
fallback that makes this project usable without paid accounts.
"""

from __future__ import annotations

import base64
import json

import pytest

from creatorloop.contracts import CameraMove, ProviderId, RenderPlan, Shot
from creatorloop.providers.base import (
    Availability,
    Budget,
    Capability,
    ProviderAuthError,
    ProviderError,
    ProviderQuotaExceeded,
    ProviderRateLimited,
    ProviderRejected,
    ProviderTimeout,
    ShotRequest,
    ShotResult,
)
from creatorloop.providers.cloud import (
    KlingProvider,
    RunwayProvider,
    SoraProvider,
    VeoProvider,
    all_cloud_providers,
    map_http_error,
)
from creatorloop.providers.local import LocalStudioProvider
from creatorloop.providers.router import ProviderRegistry, QuotaLedger, execute_plan, plan_shots, route_shot

ENV_KEYS = (
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "RUNWAYML_API_SECRET",
    "KLING_ACCESS_KEY",
    "KLING_SECRET_KEY",
    "OPENAI_API_KEY",
    "PEXELS_API_KEY",
)


@pytest.fixture(autouse=True)
def _no_keys(monkeypatch):
    for key in ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


# --------------------------------------------------------------- capabilities --
def test_capability_matrix_matches_documented_products():
    capabilities = {provider.provider_id: provider.capability for provider in all_cloud_providers()}
    assert capabilities[ProviderId.VEO].native_audio is True, "Veo 3 generates synchronized audio"
    assert capabilities[ProviderId.VEO].camera_control is False, "Veo has no explicit camera API"
    assert capabilities[ProviderId.RUNWAY].camera_control is True
    assert capabilities[ProviderId.KLING].camera_control is True
    assert capabilities[ProviderId.KLING].free_quota_units_per_day > 0, "Kling's free tier drives the router"
    assert capabilities[ProviderId.SORA].native_audio is True
    assert capabilities[ProviderId.SORA].max_clip_s >= 12, "Sora 2 handles longer narrative shots"
    assert capabilities[ProviderId.VEO].reference_images >= 1, "ingredients-to-video needs reference images"
    assert capabilities[ProviderId.SORA].character_consistency is True


def test_availability_reports_missing_key_without_leaking_secrets():
    for provider in all_cloud_providers():
        availability = provider.availability()
        assert availability.available is False
        assert availability.key_present is False
        assert availability.reason, "the reason must tell the user which variable to set"
        for secret in ("sk-", "Bearer"):
            assert secret not in availability.reason


# ------------------------------------------------------------------ payloads --
def test_veo_request_shape(shot, tmp_path):
    reference = tmp_path / "ref.png"
    reference.write_bytes(base64.b64decode(PIXEL_PNG))
    shot.first_frame = str(reference)
    shot.duration_s = 7.0
    payload = VeoProvider(api_key="unused").build_request(shot, aspect="9:16", resolution="1080p", seed=42)
    assert payload["instances"][0]["prompt"]
    assert payload["parameters"]["aspectRatio"] == "9:16"
    assert payload["parameters"]["durationSeconds"] == 8, "Veo only accepts 4/6/8 second clips"
    assert payload["parameters"]["seed"] == 42
    image = payload["instances"][0]["referenceImages"][0]
    assert image["referenceType"] == "asset"
    assert image["image"]["mimeType"] == "image/png"
    base64.b64decode(image["image"]["bytesBase64Encoded"])


def test_runway_request_shape(shot):
    payload = RunwayProvider(api_secret="unused").build_request(shot, aspect="1280:720", duration=10)
    assert payload["model"] in {"gen4_turbo", "gen4.5"}
    assert payload["ratio"] == "1280:720"
    assert payload["duration"] == 10
    assert payload["promptText"]
    # gen4_turbo is image-to-video only: without a reference the adapter must switch models.
    assert "promptImage" not in payload
    assert payload["model"] == "gen4.5"


def test_kling_request_shape_and_camera_control(shot):
    shot.move = CameraMove.DOLLY_IN
    payload = KlingProvider(access_key="a", secret_key="b").build_request(
        shot, aspect_ratio="16:9", duration="10", mode="pro"
    )
    assert payload["model_name"].startswith("kling")
    assert payload["mode"] == "pro"
    assert payload["duration"] == "10"
    assert payload["aspect_ratio"] == "16:9"
    assert payload["negative_prompt"]
    control = payload["camera_control"]
    assert control["type"] == "dynamic", "compound moves must not use 'simple' (single-axis rule)"
    assert all(-10 <= value <= 10 for value in control["config"].values())


def test_sora_request_shape(shot):
    shot.with_native_audio = True
    shot.audio_cue = "warm room tone, soft keyboard clicks"
    payload = SoraProvider(api_key="unused").build_request(shot, size="1080x1920", seconds="12", character_ids=["host"])
    assert payload["model"] == "sora-2"
    assert payload["size"] == "1080x1920"
    assert payload["seconds"] == "12"
    assert "Audio:" in payload["prompt"], "native dialogue/SFX cues ride in the prompt"
    assert payload["characters"] == [{"id": "host"}]
    assert "input_reference" not in payload


def test_local_studio_provider_is_always_available():
    provider = LocalStudioProvider()
    availability = provider.availability()
    assert availability.available is True
    assert provider.capability.cost_per_second_usd == 0.0
    assert provider.capability.requires_key is False


# ----------------------------------------------------------------- responses --
def test_kling_poll_accepts_success_and_rejects_failure():
    provider = KlingProvider(access_key="a", secret_key="b")
    provider.poll_interval_s = 0.0
    provider.poll_deadline_s = 1.0
    ok = provider.poll(
        lambda: {"data": {"task_status": "succeed", "task_result": {"videos": [{"url": "https://example/v.mp4"}]}}},
        done=lambda payload: payload["data"]["task_status"] in {"succeed", "failed"},
        succeeded=lambda payload: payload["data"]["task_status"] == "succeed",
        extract_error=lambda payload: str(payload.get("message", "")),
    )
    assert ok["data"]["task_result"]["videos"][0]["url"]

    with pytest.raises(ProviderRejected):
        provider.poll(
            lambda: {"data": {"task_status": "failed", "task_status_msg": "policy"}},
            done=lambda payload: payload["data"]["task_status"] in {"succeed", "failed"},
            succeeded=lambda payload: payload["data"]["task_status"] == "succeed",
            extract_error=lambda payload: str(payload["data"].get("task_status_msg", "")),
        )


def test_poll_times_out_when_the_task_never_finishes():
    provider = SoraProvider(api_key="unused")
    provider.poll_interval_s = 0.0
    provider.poll_deadline_s = 0.05
    with pytest.raises(ProviderTimeout):
        provider.poll(
            lambda: {"status": "in_progress"},
            done=lambda payload: payload["status"] in {"completed", "failed"},
            succeeded=lambda payload: payload["status"] == "completed",
            extract_error=lambda payload: str(payload.get("error", "")),
        )


@pytest.mark.parametrize(
    "status,detail,expected",
    [
        (401, "invalid key", ProviderAuthError),
        (403, "permission denied", ProviderAuthError),
        (403, "quota exceeded", ProviderQuotaExceeded),
        (429, "rate limited", ProviderRateLimited),
        (400, "prompt blocked by policy", ProviderRejected),
        (500, "internal error", ProviderTimeout),
        (418, "teapot", ProviderError),
    ],
)
def test_http_error_mapping(status, detail, expected):
    error = map_http_error(status, detail, ProviderId.VEO)
    assert isinstance(error, expected)
    assert error.provider is ProviderId.VEO


# ------------------------------------------------------------------- routing --
def test_free_only_budget_routes_everything_to_local_studio(screenplay):
    registry = ProviderRegistry()
    plan = plan_shots(screenplay, registry, budget=Budget(max_usd=0.0, prefer_free=True))
    assert plan.provider is ProviderId.LOCAL_STUDIO
    assert plan.estimated_cost_usd == 0.0
    assert all(row["provider"] == "local_studio" for row in plan.shots)


def test_plan_rows_carry_a_prompt_and_compiled_params(screenplay):
    registry = ProviderRegistry()
    plan = plan_shots(screenplay, registry)
    for row in plan.shots:
        assert row["shot_id"] and row["scene_id"]
        assert row["duration_s"] > 0
        assert row["prompt"], "every plan row must carry a prompt for execute_plan"
        params = row["params"]
        assert params.get("prompt") or params.get("promptText"), "every backend needs a prompt field"


def test_native_audio_requirement_prefers_audio_capable_backends(shot):
    shot.move = CameraMove.STATIC  # camera control would exclude Veo, which has no camera API

    class AlwaysAvailableVeo(VeoProvider):
        def availability(self) -> Availability:
            return Availability(provider=self.provider_id, available=True, key_present=True)

    registry = ProviderRegistry(providers=[AlwaysAvailableVeo(api_key="k"), LocalStudioProvider()])
    assignment = route_shot(shot, registry, budget=Budget(max_usd=5.0, prefer_free=False), native_audio=True)
    assert assignment.provider is ProviderId.VEO
    assert assignment.estimated_cost_usd > 0


def test_prefer_free_keeps_paid_providers_out_even_with_budget(shot):
    shot.move = CameraMove.STATIC

    class PaidVeo(VeoProvider):
        def availability(self) -> Availability:
            return Availability(provider=self.provider_id, available=True, key_present=True)

    registry = ProviderRegistry(providers=[PaidVeo(api_key="k"), LocalStudioProvider()])
    assignment = route_shot(shot, registry, budget=Budget(max_usd=5.0, prefer_free=True))
    assert assignment.provider is ProviderId.LOCAL_STUDIO, "prefer_free=True means zero paid spend"
    assert assignment.estimated_cost_usd == 0.0


def test_unsupported_capability_degrades_with_an_explicit_warning(shot):
    shot.move = CameraMove.ORBIT_LEFT  # needs camera control

    class PaidVeo(VeoProvider):
        def availability(self) -> Availability:
            return Availability(provider=self.provider_id, available=True, key_present=True)

    registry = ProviderRegistry(providers=[PaidVeo(api_key="k"), LocalStudioProvider()])
    assignment = route_shot(
        shot,
        registry,
        budget=Budget(max_usd=0.0, prefer_free=True),
        requirement=None,
    )
    assert assignment.provider is ProviderId.LOCAL_STUDIO
    assert assignment.reason


def test_quota_ledger_tracks_and_persists_free_credits(tmp_path):
    ledger = QuotaLedger.load(tmp_path / "quota.json")
    capability = KlingProvider(access_key="a", secret_key="b").capability
    assert ledger.remaining(capability) == pytest.approx(capability.free_quota_units_per_day)
    ledger.consume(capability, 20.0)
    assert ledger.remaining(capability) == pytest.approx(capability.free_quota_units_per_day - 20.0)
    ledger.persist()
    reloaded = QuotaLedger.load(tmp_path / "quota.json")
    assert reloaded.remaining(capability) == pytest.approx(ledger.remaining(capability))


def test_exhausted_quota_removes_provider_from_routing(shot, tmp_path):
    class PaidKling(KlingProvider):
        def availability(self) -> Availability:
            return Availability(provider=self.provider_id, available=True, key_present=True)

    kling = PaidKling(access_key="a", secret_key="b")
    registry = ProviderRegistry(providers=[kling, LocalStudioProvider()], quota_path=tmp_path / "quota.json")
    registry.quota.consume(kling.capability, kling.capability.free_quota_units_per_day + 1)
    shot.provider_hint = ProviderId.KLING
    assignment = route_shot(shot, registry, budget=Budget(max_usd=0.0, prefer_free=True))
    assert assignment.provider is not ProviderId.KLING


class BrokenProvider:
    """A provider that always fails — the router must degrade, not explode."""

    def __init__(self) -> None:
        self.provider_id = ProviderId.VEO

    @property
    def capability(self) -> Capability:
        return Capability(provider=ProviderId.VEO, native_audio=True, requires_key=False, cost_per_second_usd=0.0)

    def availability(self) -> Availability:
        return Availability(provider=ProviderId.VEO, available=True)

    def generate(self, request: ShotRequest) -> ShotResult:
        raise ProviderRejected("prompt rejected", provider=ProviderId.VEO)


def test_execute_plan_never_leaves_a_hole_when_a_provider_fails(tmp_path):
    registry = ProviderRegistry(providers=[BrokenProvider()])
    plan = RenderPlan(
        screenplay_id="sp_test",
        provider=ProviderId.VEO,
        reason="test",
        shots=[{"shot_id": "s00_0", "provider": "veo", "duration_s": 3.0, "params": {"prompt": "x"}, "fallbacks": []}],
    )
    assets = execute_plan(plan, registry, output_dir=tmp_path)
    assert len(assets) == 1
    assert assets[0].uri == "", "no fake asset may be reported as rendered"
    assert assets[0].warnings and "failed" in assets[0].warnings[0]


def test_execute_plan_returns_rendered_asset_from_a_stub(tmp_path):
    class StubProvider:
        provider_id = ProviderId.RUNWAY

        @property
        def capability(self) -> Capability:
            return Capability(provider=ProviderId.RUNWAY, requires_key=False, cost_per_second_usd=0.05)

        def availability(self) -> Availability:
            return Availability(provider=ProviderId.RUNWAY, available=True)

        def generate(self, request: ShotRequest) -> ShotResult:
            path = tmp_path / f"{request.shot_id}.mp4"
            path.write_bytes(b"stub")
            return ShotResult(
                shot_id=request.shot_id,
                provider=ProviderId.RUNWAY,
                uri=str(path),
                duration_s=request.duration_s,
                width=1280,
                height=720,
                cost_usd=round(0.05 * request.duration_s, 4),
            )

    registry = ProviderRegistry(providers=[StubProvider()])
    plan = RenderPlan(
        screenplay_id="sp_test",
        provider=ProviderId.RUNWAY,
        reason="test",
        shots=[{"shot_id": "s01_0", "provider": "runway", "duration_s": 5.0, "params": {"promptText": "x"}, "fallbacks": []}],
    )
    assets = execute_plan(plan, registry, output_dir=tmp_path)
    assert assets[0].uri.endswith("s01_0.mp4")
    assert assets[0].cost_usd == pytest.approx(0.25)


def test_doctor_lists_every_backend_and_the_free_only_mode():
    report = ProviderRegistry().doctor()
    providers = {row["provider"]: row for row in report["providers"]}
    assert set(providers) >= {"veo", "runway", "kling", "sora", "local_studio"}
    assert report["free_only"] is True
    assert providers["local_studio"]["available"] is True
    assert providers["veo"]["available"] is False


PIXEL_PNG = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
