"""Domain contracts for the creator loop.

Everything the loop produces is a plain dataclass that round-trips through JSON,
so the CLI, the web studio and the MCP server share one representation and every
artifact on disk is inspectable evidence.

Layering: these types carry no engine, provider or ffmpeg knowledge.  Providers
and renderers consume them and never reinterpret raw strings of another layer.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, fields, is_dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Iterable


def utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def new_id(prefix: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")[:-3]
    return f"{prefix}_{stamp}"


class Stage(str, Enum):
    RESEARCH = "research"
    SCRIPT = "script"
    PRODUCE = "produce"
    PACKAGE = "package"
    PUBLISH = "publish"
    ANALYZE = "analyze"


class CameraMove(str, Enum):
    """One director vocabulary, compiled per backend by :mod:`creatorloop.direction`."""

    STATIC = "static"
    PAN_LEFT = "pan_left"
    PAN_RIGHT = "pan_right"
    TILT_UP = "tilt_up"
    TILT_DOWN = "tilt_down"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    DOLLY_IN = "dolly_in"
    DOLLY_OUT = "dolly_out"
    TRUCK_LEFT = "truck_left"
    TRUCK_RIGHT = "truck_right"
    PEDESTAL_UP = "pedestal_up"
    PEDESTAL_DOWN = "pedestal_down"
    ROLL_CW = "roll_cw"
    ROLL_CCW = "roll_ccw"
    ORBIT_LEFT = "orbit_left"
    ORBIT_RIGHT = "orbit_right"
    HANDHELD = "handheld"
    DOLLY_ZOOM = "dolly_zoom"
    CRANE_UP = "crane_up"


class ShotSize(str, Enum):
    ECU = "ecu"
    CU = "cu"
    MCU = "mcu"
    MS = "ms"
    MLS = "mls"
    LS = "ls"
    ELS = "els"


class ProviderId(str, Enum):
    VEO = "veo"
    RUNWAY = "runway"
    KLING = "kling"
    SORA = "sora"
    LOCAL_STUDIO = "local_studio"
    STOCK_MOSAIC = "stock_mosaic"


class Severity(str, Enum):
    BLOCK = "block"
    WARN = "warn"
    INFO = "info"


class ValueAddKind(str, Enum):
    """Kinds of original contribution YouTube's inauthentic-content guidance rewards."""

    PERSONAL_EXPERIENCE = "personal_experience"
    ORIGINAL_DATA = "original_data"
    EXPERT_COMMENTARY = "expert_commentary"
    ORIGINAL_RESEARCH = "original_research"
    CUSTOM_VISUAL = "custom_visual"
    HUMAN_VOICE = "human_voice"
    UNIQUE_FORMAT = "unique_format"


@dataclass(slots=True)
class HumanDecision:
    """Recorded human judgement.  The authenticity guard treats these as evidence."""

    stage: Stage
    question: str
    answer: str
    kind: str = "choice"  # choice | edit | approval | rejection | note
    decided_by: str = "human"
    decided_at: str = field(default_factory=utcnow)
    evidence: str = ""
    weight: float = 1.0

    def to_json(self) -> dict[str, Any]:
        data = asdict(self)
        data["stage"] = self.stage.value
        return data


@dataclass(slots=True)
class ValueAddClaim:
    kind: ValueAddKind
    evidence: str
    verified: bool = False

    def to_json(self) -> dict[str, Any]:
        return {"kind": self.kind.value, "evidence": self.evidence, "verified": self.verified}


@dataclass(slots=True)
class TopicBrief:
    """① human strategy desk output."""

    id: str
    niche_id: str
    working_title: str
    angle: str
    viewer_problem: str
    human_take: str
    target_audience: str = ""
    keywords: list[str] = field(default_factory=list)
    differentiation: str = ""
    value_add_claims: list[ValueAddClaim] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    format: str = "long_form"  # long_form | shorts | hybrid
    runtime_target_s: int = 300
    decisions: list[HumanDecision] = field(default_factory=list)
    created_at: str = field(default_factory=utcnow)
    niche_score: float = 0.0

    def record(self, decision: HumanDecision) -> None:
        self.decisions.append(decision)

    @property
    def human_value_adds(self) -> list[ValueAddClaim]:
        return [claim for claim in self.value_add_claims if claim.evidence.strip()]


@dataclass(slots=True)
class Shot:
    id: str
    prompt: str
    prompt_expanded: str = ""
    size: ShotSize = ShotSize.MS
    angle: str = "eye_level"
    lens_mm: int = 35
    move: CameraMove = CameraMove.STATIC
    move_intensity: float = 0.35  # 0..1, maps to per-backend units
    duration_s: float = 4.0
    subject: str = ""
    action: str = ""
    mood: str = ""
    palette: list[str] = field(default_factory=list)
    first_frame: str = ""  # path or provider image ref
    last_frame: str = ""
    entities: list[str] = field(default_factory=list)  # entity-bible ids for continuity
    provider_hint: ProviderId | None = None
    on_screen_text: str = ""
    negative_prompt: str = ""
    with_native_audio: bool = False
    audio_cue: str = ""
    asset_kind: str = "generated_still"  # generated_still | generated_clip | stock_clip | user_footage | screen_recording
    asset_uri: str = ""  # resolved media (clip or still) used by the render step


@dataclass(slots=True)
class Scene:
    id: str
    beat: str  # hook | promise | context | point | turn | takeaway | cta
    purpose: str
    narration: str = ""
    dialogue: list[dict[str, str]] = field(default_factory=list)  # [{"role","line"}]
    shots: list[Shot] = field(default_factory=list)
    transition: str = "cut"  # cut | xfade | dip_black | whip
    music_mood: str = "calm"
    sfx: list[str] = field(default_factory=list)
    ambience: str = "room_tone"
    caption_style: str = "standard"
    origin: str = "assistant"  # human | assistant | mixed — sentence-level provenance for the policy guard

    @property
    def duration_s(self) -> float:
        return sum(shot.duration_s for shot in self.shots)


@dataclass(slots=True)
class Entity:
    """Sora-2-style continuity bible entry (also Runway Gen-4 references)."""

    id: str
    kind: str  # character | location | prop | brand
    description: str
    wardrobe: str = ""
    palette: list[str] = field(default_factory=list)
    lighting: str = ""
    reference_image: str = ""
    seed: int | None = None


@dataclass(slots=True)
class AudioDesign:
    language: str = "ko-KR"
    narration_backend: str = ""
    music_mood: str = "calm"
    music_tempo: int = 92
    music_progression: str = "I-V-vi-IV"
    music_gain_db: float = -18.0
    duck_db: float = -9.0
    ambience: str = "room_tone"
    ambience_gain_db: float = -30.0
    sfx_gain_db: float = -12.0
    master_lufs: float = -14.0
    master_tp_db: float = -1.5
    master_lra: float = 11.0


@dataclass(slots=True)
class Screenplay:
    """② production blueprint: what to shoot, say, show and hear."""

    id: str
    brief_id: str
    logline: str
    hook_archetype: str
    scenes: list[Scene] = field(default_factory=list)
    entities: list[Entity] = field(default_factory=list)
    audio: AudioDesign = field(default_factory=AudioDesign)
    language: str = "ko-KR"
    aspect: str = "16:9"  # 16:9 | 9:16
    runtime_target_s: int = 300
    variation_seed: int = 0
    structure_signature: dict[str, Any] = field(default_factory=dict)
    ai_draft_text: str = ""
    final_text: str = ""
    human_edit_distance: float = 0.0
    human_edited: bool = False
    human_sourced_ratio: float = 0.0
    variation_lineage: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=utcnow)
    decisions: list[HumanDecision] = field(default_factory=list)

    @property
    def estimated_runtime_s(self) -> float:
        return sum(scene.duration_s for scene in self.scenes)

    @property
    def beat_plan(self) -> str:
        """Which narrative template this draft used (rotates with variation_index)."""

        profile = self.structure_signature.get("variation_profile") or {}
        return str(profile.get("beat_plan", ""))

    @property
    def shot_count(self) -> int:
        return sum(len(scene.shots) for scene in self.scenes)

    @property
    def narration_text(self) -> str:
        return "\n".join(scene.narration for scene in self.scenes if scene.narration)

    def record(self, decision: HumanDecision) -> None:
        self.decisions.append(decision)


@dataclass(slots=True)
class RenderPlan:
    screenplay_id: str
    provider: ProviderId
    reason: str
    shots: list[dict[str, Any]] = field(default_factory=list)  # compiled per-backend params
    estimated_cost_usd: float = 0.0
    estimated_quota_units: float = 0.0
    fallbacks: list[ProviderId] = field(default_factory=list)
    created_at: str = field(default_factory=utcnow)


@dataclass(slots=True)
class RenderedAsset:
    shot_id: str
    uri: str
    provider: ProviderId
    duration_s: float
    width: int
    height: int
    has_native_audio: bool = False
    elapsed_s: float = 0.0
    cost_usd: float = 0.0
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class CaptionCue:
    index: int
    start_s: float
    end_s: float
    text: str
    style: str = "standard"
    words: list[dict[str, Any]] = field(default_factory=list)


@dataclass(slots=True)
class Subtitles:
    language: str
    cues: list[CaptionCue] = field(default_factory=list)
    srt_path: str = ""
    ass_path: str = ""
    max_chars_per_line: int = 32
    max_cps: float = 16.0
    reading_speed_warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class TitleCandidate:
    title: str
    score: float
    breakdown: dict[str, float] = field(default_factory=dict)
    rationale: str = ""
    archetype: str = ""


@dataclass(slots=True)
class ThumbnailVariant:
    variant_id: str  # A | B | C  (YouTube Test & Compare accepts three)
    path: str
    headline: str
    score: float
    breakdown: dict[str, float] = field(default_factory=dict)
    legible_at_mobile: bool = True
    bytes: int = 0


@dataclass(slots=True)
class VideoPackage:
    """③ thumbnail + title optimization output."""

    id: str
    brief_id: str
    titles: list[TitleCandidate] = field(default_factory=list)
    thumbnails: list[ThumbnailVariant] = field(default_factory=list)
    description: str = ""
    chapters: list[dict[str, Any]] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    hashtags: list[str] = field(default_factory=list)
    synthetic_disclosure: bool = True
    disclosure_text: str = ""
    ab_plan: str = ""
    pinned_comment: str = ""
    created_at: str = field(default_factory=utcnow)

    @property
    def best_title(self) -> str:
        return self.titles[0].title if self.titles else ""


@dataclass(slots=True)
class PolicyFinding:
    code: str
    severity: Severity
    message: str
    evidence: str = ""
    remediation: str = ""

    def to_json(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "severity": self.severity.value,
            "message": self.message,
            "evidence": self.evidence,
            "remediation": self.remediation,
        }


@dataclass(slots=True)
class PolicyReport:
    """Authenticity gate for YouTube's 2025-07-15 inauthentic-content update."""

    id: str
    score: float
    ok: bool
    findings: list[PolicyFinding] = field(default_factory=list)
    human_decision_count: int = 0
    variation_vs_catalog: float = 1.0
    value_add_count: int = 0
    disclosure_required: bool = True
    disclosure_text: str = ""
    policy_reference: str = "YouTube YPP inauthentic content (renamed 2025-07-15)"
    generated_at: str = field(default_factory=utcnow)

    def blocking(self) -> list["PolicyFinding"]:
        """Findings that stop the pipeline (fail-closed gate)."""

        return [finding for finding in self.findings if finding.severity is Severity.BLOCK]

    def warnings(self) -> list["PolicyFinding"]:
        return [finding for finding in self.findings if finding.severity is Severity.WARN]

    def codes(self) -> list[str]:
        return [finding.code for finding in self.findings]

    def to_json(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "score": round(self.score, 3),
            "ok": self.ok,
            "findings": [f.to_json() for f in self.findings],
            "human_decision_count": self.human_decision_count,
            "variation_vs_catalog": round(self.variation_vs_catalog, 4),
            "value_add_count": self.value_add_count,
            "disclosure_required": self.disclosure_required,
            "disclosure_text": self.disclosure_text,
            "policy_reference": self.policy_reference,
            "generated_at": self.generated_at,
        }


@dataclass(slots=True)
class VideoMetrics:
    video_id: str
    title: str
    published_at: str
    views: int = 0
    impressions: int = 0
    ctr: float = 0.0
    avg_view_duration_s: float = 0.0
    avg_pct_viewed: float = 0.0
    watch_time_h: float = 0.0
    likes: int = 0
    comments: int = 0
    subscribers_gained: int = 0
    rpm: float = 0.0
    estimated_revenue: float = 0.0
    brief_id: str = ""
    niche_id: str = ""
    angle: str = ""
    hook_archetype: str = ""
    title_variant: str = ""
    thumbnail_variant: str = ""
    format: str = "long_form"
    runtime_s: float = 0.0

    def reliable(self, min_impressions: int = 1000, min_views: int = 100) -> bool:
        return self.impressions >= min_impressions or self.views >= min_views


@dataclass(slots=True)
class CohortStat:
    key: str
    dimension: str
    videos: int
    views: int
    median_ctr: float
    median_avd_s: float
    median_pct_viewed: float
    revenue_per_video: float
    subscribers_per_kview: float
    reliable: bool


@dataclass(slots=True)
class TopicRecommendation:
    rank: int
    niche_id: str
    working_title: str
    angle: str
    expected_value: float
    confidence: str  # high | medium | low
    rationale: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    required_value_add: list[str] = field(default_factory=list)


@dataclass(slots=True)
class AnalyticsReport:
    id: str
    window_days: int
    videos: int
    totals: dict[str, float] = field(default_factory=dict)
    cohorts: list[CohortStat] = field(default_factory=list)
    insights: list[str] = field(default_factory=list)
    weight_updates: dict[str, float] = field(default_factory=dict)
    recommendations: list[TopicRecommendation] = field(default_factory=list)
    guards: list[str] = field(default_factory=list)
    generated_at: str = field(default_factory=utcnow)


@dataclass(slots=True)
class ProducedVideo:
    id: str
    brief_id: str
    screenplay_id: str
    package_id: str
    path: str
    duration_s: float
    width: int
    height: int
    provider: ProviderId
    has_audio: bool
    subtitles_path: str = ""
    poster_path: str = ""
    policy_report_id: str = ""
    cost_usd: float = 0.0
    elapsed_s: float = 0.0
    created_at: str = field(default_factory=utcnow)


@dataclass(slots=True)
class LoopRun:
    """Ties ①→②→③→④ into one auditable record."""

    id: str
    brief_id: str = ""
    screenplay_id: str = ""
    produced_video_id: str = ""
    package_id: str = ""
    analytics_report_id: str = ""
    policy_report_id: str = ""
    stages: dict[str, str] = field(default_factory=dict)
    artifacts: dict[str, str] = field(default_factory=dict)
    decisions: list[HumanDecision] = field(default_factory=list)
    next_recommendations: list[TopicRecommendation] = field(default_factory=list)
    blocked: bool = False
    block_reason: str = ""
    created_at: str = field(default_factory=utcnow)
    finished_at: str = ""


def to_jsonable(value: Any) -> Any:
    """Structural JSON conversion that preserves enums, paths and nested dataclasses."""

    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, Path):
        return str(value)
    if is_dataclass(value) and not isinstance(value, type):
        return {name: to_jsonable(getattr(value, name)) for name in value.__dataclass_fields__}
    if isinstance(value, dict):
        return {str(k): to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_jsonable(v) for v in value]
    return str(value)


def dump_json(value: Any, path: Path | str) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(to_jsonable(value), ensure_ascii=False, indent=2) + "\n", "utf-8")
    return target


def loads_json(path: Path | str) -> Any:
    return json.loads(Path(path).read_text("utf-8"))


def _rebuild(cls: type, data: dict[str, Any]) -> Any:
    """Best-effort nested dataclass reconstruction (enums and lists included)."""

    kwargs: dict[str, Any] = {}
    known = {f.name: f for f in fields(cls)}
    for key, raw in data.items():
        if key not in known:
            continue
        kwargs[key] = _coerce(known[key].type, raw)
    return cls(**kwargs)


def _coerce(annotation: Any, raw: Any) -> Any:
    """Rebuild nested dataclasses, enums and lists of either from JSON payloads."""

    if raw is None:
        return None
    text = annotation if isinstance(annotation, str) else getattr(annotation, "__name__", "")
    text = text.replace("typing.", "").replace(" ", "")

    if isinstance(raw, dict):
        target = _DATACLASS_INDEX.get(text)
        if target is not None:
            return _rebuild(target, raw)
        return raw

    if isinstance(raw, (list, tuple)):
        inner = _inner_type(text)
        if inner:
            target = _DATACLASS_INDEX.get(inner)
            if target is not None:
                return [_rebuild(target, item) if isinstance(item, dict) else item for item in raw]
            enum_type = next((candidate for candidate in _ENUM_INDEX if candidate.__name__ == inner), None)
            if enum_type is not None:
                return [_coerce(inner, item) for item in raw]
        return list(raw)

    if isinstance(raw, str):
        enum_type = next((candidate for candidate in _ENUM_INDEX if candidate.__name__ == text), None)
        if enum_type is not None:
            try:
                return enum_type(raw)
            except ValueError:
                return raw
    return raw


def _inner_type(text: str) -> str:
    """``list[Scene]`` / ``tuple[Shot, ...]`` → ``Scene`` / ``Shot``."""

    for prefix in ("list[", "tuple[", "set[", "Sequence[", "Iterable["):
        if text.startswith(prefix) and text.endswith("]"):
            inner = text[len(prefix) : -1]
            return inner.split(",")[0].strip()
    return ""


_ENUM_INDEX: list[type] = [Stage, CameraMove, ShotSize, ProviderId, Severity, ValueAddKind]
_DATACLASS_INDEX: dict[str, type] = {}


def register_contracts() -> None:
    module = __import__(__name__, fromlist=["*"])
    for name in dir(module):
        obj = getattr(module, name)
        if is_dataclass(obj) and isinstance(obj, type):
            _DATACLASS_INDEX[name] = obj


register_contracts()


def load_contract(cls: type, data: dict[str, Any]) -> Any:
    return _rebuild(cls, data)


def iter_dataclasses() -> Iterable[type]:
    return _DATACLASS_INDEX.values()
