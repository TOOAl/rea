"""Authenticity guard for YouTube's 2025-07-15 "inauthentic content" YPP update.

The policy keeps mass-produced or repetitive content out of monetization and is
enforced channel-wide.  It explicitly targets:

* template-built videos with little to no variation across uploads,
* slideshows / scrolling text with minimal narrative or commentary,
* the same narration reused across videos,
* synthetic voiceover over generic visuals with no human contribution,
* automated output with minimal human input.

It does **not** prohibit AI-assisted content: AI use stays monetizable when the
creator's own vision, commentary and value are present, and realistic synthetic
media must be disclosed.

This module therefore fails *closed*: a project cannot be finalized or handed to
a publisher while any ``block`` finding is open.  Every finding carries the
evidence behind it and a concrete remediation, because the point of the guard is
to push work back to the human strategy desk, not to silently mutate output.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence

from .contracts import (
    PolicyFinding,
    PolicyReport,
    Screenplay,
    Severity,
    TopicBrief,
    new_id,
    utcnow,
)

DEFAULT_MIN_DECISIONS = 3
DEFAULT_MIN_VALUE_ADDS = 2
DEFAULT_MIN_EDIT_DISTANCE = 0.12
DEFAULT_CATALOG_WINDOW = 12
BLOCK_SIMILARITY = 0.82
WARN_SIMILARITY = 0.62
TITLE_BLOCK_SIMILARITY = 0.86
TITLE_WARN_SIMILARITY = 0.72
MAX_UPLOADS_PER_WEEK = 14
MAX_UPLOADS_PER_DAY = 4
PASSING_SCORE = 60.0

_WORD_RE = re.compile(r"[0-9a-z가-힣]+")


# --------------------------------------------------------------------------- #
# similarity primitives
# --------------------------------------------------------------------------- #
KOREAN_PARTICLES = (
    "으로", "에서", "부터", "까지", "하고", "이나", "라도", "만큼",
    "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "도", "만", "로",
)


def strip_korean_particle(token: str) -> str:
    """``신고는`` → ``신고`` so Korean similarity is not defeated by 조사."""

    if not token or not any("\uac00" <= ch <= "\ud7a3" for ch in token):
        return token
    for particle in KOREAN_PARTICLES:
        if token.endswith(particle) and len(token) - len(particle) >= 2:
            return token[: -len(particle)]
    return token


def tokenize(text: str) -> list[str]:
    return [strip_korean_particle(token) for token in _WORD_RE.findall((text or "").lower())]


def shingles(text: str, k: int = 4) -> set[str]:
    words = tokenize(text)
    if len(words) < k:
        return {" ".join(words)} if words else set()
    return {" ".join(words[i : i + k]) for i in range(len(words) - k + 1)}


def jaccard(left: Iterable[str], right: Iterable[str]) -> float:
    a, b = set(left), set(right)
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def cosine_counts(left: Counter[str], right: Counter[str]) -> float:
    keys = set(left) | set(right)
    if not keys:
        return 1.0
    dot = sum(left[k] * right[k] for k in keys)
    na = math.sqrt(sum(v * v for v in left.values()))
    nb = math.sqrt(sum(v * v for v in right.values()))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def levenshtein_ratio(left: str, right: str) -> float:
    """Normalized edit distance in ``[0, 1]`` (0 = identical)."""

    a, b = list(left), list(right)
    if not a or not b:
        return 1.0 if (a or b) else 0.0
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        current = [i]
        for j, cb in enumerate(b, start=1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ca != cb)))
        previous = current
    return previous[-1] / max(len(a), len(b))


def text_similarity(left: str, right: str) -> float:
    """Blend of 4-gram overlap, 2-gram overlap and token overlap.

    Shingles catch copy-pasted narration (word order preserved).  The token term keeps
    short texts comparable — titles and one-liners are legitimately reordered, and a
    pure shingle score reports 0.0 for "부가세 신고 순서" vs "신고 순서 부가세".
    Long texts stay shingle-dominant so shared domain vocabulary does not create
    false repetition findings.
    """

    left_tokens, right_tokens = tokenize(left), tokenize(right)
    if not left_tokens or not right_tokens:
        return 0.0
    shingle_score = 0.65 * jaccard(shingles(left, 4), shingles(right, 4)) + 0.35 * jaccard(
        shingles(left, 2), shingles(right, 2)
    )
    token_score = cosine_counts(Counter(left_tokens), Counter(right_tokens))
    if min(len(left_tokens), len(right_tokens)) <= 10:
        return round(max(shingle_score, token_score), 4)
    return round(0.8 * shingle_score + 0.2 * token_score, 4)


def histogram_similarity(left: Counter[str], right: Counter[str]) -> float:
    return cosine_counts(left, right)


# --------------------------------------------------------------------------- #
# fingerprints
# --------------------------------------------------------------------------- #
def structure_signature(screenplay: Screenplay) -> dict[str, Any]:
    """Template fingerprint: what makes two videos 'made from the same template'."""

    beats = [scene.beat for scene in screenplay.scenes]
    sizes: Counter[str] = Counter()
    moves: Counter[str] = Counter()
    transitions: Counter[str] = Counter()
    moods: Counter[str] = Counter()
    words = 0
    shots = 0
    dialogue_lines = 0
    for scene in screenplay.scenes:
        transitions[scene.transition] += 1
        moods[scene.music_mood] += 1
        words += len(tokenize(scene.narration))
        dialogue_lines += len(scene.dialogue)
        for shot in scene.shots:
            shots += 1
            sizes[shot.size.value] += 1
            moves[shot.move.value] += 1
    runtime = max(screenplay.estimated_runtime_s, 1.0)
    return {
        "beat_sequence": beats,
        "beat_bigrams": [f"{a}>{b}" for a, b in zip(beats, beats[1:])],
        "shot_sizes": dict(sizes),
        "camera_moves": dict(moves),
        "transitions": dict(transitions),
        "music_moods": dict(moods),
        "hook_archetype": screenplay.hook_archetype,
        "scene_count": len(screenplay.scenes),
        "shot_count": shots,
        "words_per_second": round(words / runtime, 3),
        "words_per_shot": round(words / max(shots, 1), 2),
        "dialogue_lines": dialogue_lines,
        "runtime_s": round(runtime, 1),
        "language": screenplay.language,
        "aspect": screenplay.aspect,
    }


def signature_similarity(left: dict[str, Any], right: dict[str, Any]) -> float:
    """Weighted similarity between two structure signatures."""

    if not left or not right:
        return 0.0
    parts = [
        (0.30, jaccard(left.get("beat_bigrams", []), right.get("beat_bigrams", []))),
        (0.14, histogram_similarity(Counter(left.get("shot_sizes", {})), Counter(right.get("shot_sizes", {})))),
        (0.14, histogram_similarity(Counter(left.get("camera_moves", {})), Counter(right.get("camera_moves", {})))),
        (0.10, histogram_similarity(Counter(left.get("transitions", {})), Counter(right.get("transitions", {})))),
        (0.10, histogram_similarity(Counter(left.get("music_moods", {})), Counter(right.get("music_moods", {})))),
        (0.12, 1.0 if left.get("hook_archetype") == right.get("hook_archetype") else 0.0),
    ]
    for key, scale in (("words_per_second", 6.0), ("runtime_s", 240.0)):
        a, b = float(left.get(key, 0.0)), float(right.get(key, 0.0))
        parts.append((0.05, max(0.0, 1.0 - abs(a - b) / scale)))
    score = sum(weight * value for weight, value in parts)
    total = sum(weight for weight, _ in parts)
    return score / total if total else 0.0


def image_dhash(path: Path | str, size: int = 16) -> list[int] | None:
    """Difference hash of a frame; cheap visual-repetition detector."""

    try:
        from PIL import Image
    except Exception:  # pragma: no cover - Pillow is a hard dependency
        return None
    try:
        with Image.open(path) as image:
            grey = image.convert("L").resize((size + 1, size), Image.LANCZOS)
    except Exception:
        return None
    pixels = list(grey.getdata())
    bits: list[int] = []
    for row in range(size):
        for col in range(size):
            left = pixels[row * (size + 1) + col]
            right = pixels[row * (size + 1) + col + 1]
            bits.append(1 if left > right else 0)
    return bits


def hash_distance(left: Sequence[int], right: Sequence[int]) -> float:
    """Similarity in ``[0, 1]`` between two difference hashes."""

    if not left or not right or len(left) != len(right):
        return 0.0
    same = sum(1 for a, b in zip(left, right) if a == b)
    return same / len(left)


def audio_signature(path: Path | str, hop_s: float = 0.25) -> list[float] | None:
    """Rough per-frame audio signature (RMS, zero-crossing, centroid) for reuse checks."""

    try:
        import numpy as np
        import wave
    except Exception:  # pragma: no cover
        return None
    try:
        with wave.open(str(path), "rb") as handle:
            frames = handle.readframes(handle.getnframes())
            rate = handle.getframerate()
            channels = handle.getnchannels()
    except Exception:
        return None
    if not frames:
        return None
    audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)
    hop = max(int(rate * hop_s), 1)
    signature: list[float] = []
    for start in range(0, max(len(audio) - hop, hop), hop):
        chunk = audio[start : start + hop]
        rms = float(np.sqrt(np.mean(chunk**2) + 1e-12))
        zcr = float(np.mean(np.abs(np.diff(np.sign(chunk))) > 0))
        spectrum = np.abs(np.fft.rfft(chunk * np.hanning(len(chunk))))
        freqs = np.fft.rfftfreq(len(chunk), 1.0 / rate)
        centroid = float((spectrum * freqs).sum() / (spectrum.sum() + 1e-9)) / 4000.0
        signature.extend([round(rms, 4), round(zcr, 4), round(min(centroid, 1.0), 4)])
    return signature


def signature_cosine(left: Sequence[float], right: Sequence[float]) -> float:
    if not left or not right:
        return 0.0
    length = min(len(left), len(right))
    a, b = list(left[:length]), list(right[:length])
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


# --------------------------------------------------------------------------- #
# policy engine
# --------------------------------------------------------------------------- #
@dataclass(slots=True)
class PolicyInputs:
    brief: TopicBrief
    screenplay: Screenplay | None = None
    catalog: list[dict[str, Any]] | None = None
    title: str = ""
    narration_path: str = ""
    frame_paths: list[str] | None = None
    narration_backend: str = ""
    uploads_last_7_days: int = 0
    uploads_last_24h: int = 0
    batch_mode: bool = False
    approved_gates: list[str] | None = None
    min_decisions: int = DEFAULT_MIN_DECISIONS
    min_value_adds: int = DEFAULT_MIN_VALUE_ADDS
    min_edit_distance: float = DEFAULT_MIN_EDIT_DISTANCE
    catalog_window: int = DEFAULT_CATALOG_WINDOW
    disclosure_set: bool = False
    reused_sources: bool = False
    synthetic_media: bool = True


DISCLOSURE_KO = (
    "이 영상은 제작 과정에 AI 도구(영상·음성 생성)를 사용했으며, 사실적으로 보이는 "
    "장면은 합성·변형된 콘텐츠입니다. 주제 선정, 근거, 해석과 결론은 제작자가 직접 "
    "검증하고 작성했습니다."
)
DISCLOSURE_EN = (
    "This video uses AI tools in production (generated visuals/voice). Realistic scenes are "
    "altered or synthetic. Topic selection, evidence, analysis and conclusions are the "
    "creator's own work."
)


class PolicyEngine:
    """Evaluates one project against the channel's own history."""

    def evaluate(self, inputs: PolicyInputs) -> PolicyReport:
        findings: list[PolicyFinding] = []
        catalog = list(inputs.catalog or [])[-inputs.catalog_window :]
        decisions = list(inputs.brief.decisions)
        if inputs.screenplay:
            decisions.extend(inputs.screenplay.decisions)
        approvals = set(inputs.approved_gates or [])
        value_adds = inputs.brief.human_value_adds

        findings.extend(self._human_ownership(inputs, decisions, approvals, value_adds))
        findings.extend(self._variation(inputs, catalog))
        findings.extend(self._format_quality(inputs))
        findings.extend(self._cadence(inputs))
        findings.extend(self._metadata(inputs, catalog))
        findings.extend(self._disclosure(inputs))

        score = self._score(findings, inputs, decisions, value_adds)
        blocked = any(f.severity is Severity.BLOCK for f in findings)
        report = PolicyReport(
            id=new_id("policy"),
            score=score,
            ok=not blocked and score >= PASSING_SCORE,
            findings=findings,
            human_decision_count=len(decisions),
            variation_vs_catalog=self._worst_case_variation(inputs, catalog),
            value_add_count=len(value_adds),
            disclosure_required=inputs.synthetic_media,
            disclosure_text=DISCLOSURE_KO if inputs.brief.keywords else DISCLOSURE_EN,
            generated_at=utcnow(),
        )
        return report

    # -- checks -------------------------------------------------------------
    def _human_ownership(
        self,
        inputs: PolicyInputs,
        decisions: list[Any],
        approvals: set[str],
        value_adds: list[Any],
    ) -> list[PolicyFinding]:
        out: list[PolicyFinding] = []
        if len(decisions) < inputs.min_decisions:
            out.append(
                PolicyFinding(
                    code="HUMAN_DECISION_MISSING",
                    severity=Severity.BLOCK,
                    message=(
                        f"기록된 인간 결정이 {len(decisions)}건으로 최소 {inputs.min_decisions}건 미만입니다. "
                        "정책은 '사람의 입력이 최소인 자동 생성 콘텐츠'를 수익화 대상에서 제외합니다."
                    ),
                    evidence=f"decisions={len(decisions)}",
                    remediation="① 리서치 데스크에서 앵글·차별점·근거 질문에 직접 답하고 그 결정을 로그에 남기세요.",
                )
            )
        if inputs.batch_mode and not {"topic", "script"} <= approvals:
            out.append(
                PolicyFinding(
                    code="BATCH_WITHOUT_GATES",
                    severity=Severity.BLOCK,
                    message="일괄(batch) 실행인데 주제·대본 승인 게이트가 통과되지 않았습니다.",
                    evidence=f"approved_gates={sorted(approvals)}",
                    remediation="loop run 시 --gate topic,script 승인을 사람 이름으로 기록하거나 단건 실행으로 전환하세요.",
                )
            )
        if len(value_adds) < inputs.min_value_adds:
            out.append(
                PolicyFinding(
                    code="VALUE_ADD_MISSING",
                    severity=Severity.BLOCK,
                    message=(
                        f"근거가 첨부된 고유 가치(value-add)가 {len(value_adds)}건으로 {inputs.min_value_adds}건 미만입니다."
                    ),
                    evidence="; ".join(f"{c.kind.value}:{c.evidence[:40]}" for c in value_adds) or "none",
                    remediation=(
                        "개인 경험·직접 수집한 숫자·전문가 해석·커스텀 비주얼·본인 음성 중 2가지 이상을 "
                        "brief 에 증거 문장과 함께 기록하세요."
                    ),
                )
            )
        if inputs.screenplay and not inputs.screenplay.human_edited:
            distance = inputs.screenplay.human_edit_distance
            sourced = inputs.screenplay.human_sourced_ratio
            if distance < inputs.min_edit_distance and sourced < 0.35:
                out.append(
                    PolicyFinding(
                        code="SCRIPT_UNEDITED",
                        severity=Severity.BLOCK,
                        message=(
                            "AI 초안 대비 사람 편집량이 "
                            f"{distance:.1%} (임계 {inputs.min_edit_distance:.0%})이고 사람 작성 문장 비율도 "
                            f"{sourced:.0%} (< 35%)로 낮습니다. 'significant editing or originality' 요건 미충족."
                        ),
                        evidence=f"edit_distance={distance:.3f}; human_sourced_ratio={sourced:.3f}",
                        remediation=(
                            "script edit 로 훅·예시·결론 문장을 자신의 언어와 사례로 다시 쓰고, "
                            "그 편집은 자동으로 결정 로그에 기록됩니다."
                        ),
                    )
                )
        if inputs.reused_sources and not value_adds:
            out.append(
                PolicyFinding(
                    code="REUSED_WITHOUT_TRANSFORM",
                    severity=Severity.BLOCK,
                    message="외부 소스를 사용하면서 변환적 기여(논평·분석·부가 가치)가 기록되지 않았습니다.",
                    evidence=f"sources={inputs.brief.sources[:3]}",
                    remediation="reused content 정책: 원본에 대한 실질적 논평·수정·교육/오락 가치가 필요합니다.",
                )
            )
        return out

    def _variation(self, inputs: PolicyInputs, catalog: list[dict[str, Any]]) -> list[PolicyFinding]:
        out: list[PolicyFinding] = []
        if not catalog or not inputs.screenplay:
            return out
        signature = structure_signature(inputs.screenplay)
        narration = inputs.screenplay.narration_text
        worst_structure = 0.0
        worst_text = 0.0
        worst_visual = 0.0
        worst_audio = 0.0
        nearest = ""
        current_frames = [image_dhash(p) for p in (inputs.frame_paths or [])]
        current_frames = [f for f in current_frames if f]
        current_audio = audio_signature(inputs.narration_path) if inputs.narration_path else None

        for row in catalog:
            previous = row.get("structure") or {}
            structure_sim = signature_similarity(signature, previous)
            text_sim = text_similarity(narration, row.get("narration_text", ""))
            if structure_sim > worst_structure:
                worst_structure = structure_sim
                nearest = row.get("video_id", "?")
            worst_text = max(worst_text, text_sim)
            for prev_hash in row.get("frame_hashes", []) or []:
                for cur in current_frames:
                    worst_visual = max(worst_visual, hash_distance(cur, prev_hash))
            if current_audio and row.get("audio_signature"):
                worst_audio = max(worst_audio, signature_cosine(current_audio, row["audio_signature"]))

        if worst_structure >= BLOCK_SIMILARITY:
            out.append(
                PolicyFinding(
                    code="TEMPLATE_REPETITION",
                    severity=Severity.BLOCK,
                    message=(
                        f"최근 업로드({nearest})와 구조 유사도 {worst_structure:.0%}. "
                        "'same template with little to no variation'에 해당합니다."
                    ),
                    evidence=f"structure_similarity={worst_structure:.3f}",
                    remediation="비트 순서·샷 사이즈·카메라 무브·훅 아키타입 중 2가지 이상을 바꾸고 런타임을 다르게 설계하세요.",
                )
            )
        elif worst_structure >= WARN_SIMILARITY:
            out.append(
                PolicyFinding(
                    code="TEMPLATE_DRIFT_LOW",
                    severity=Severity.WARN,
                    message=f"구조 유사도 {worst_structure:.0%} — 포맷이 굳어지고 있습니다.",
                    evidence=f"structure_similarity={worst_structure:.3f}",
                    remediation="다음 영상에서 훅 아키타입과 씬 수를 바꾸세요 (screenplay variation seed 자동 분산 사용).",
                )
            )
        if worst_text >= 0.55:
            out.append(
                PolicyFinding(
                    code="NARRATION_REPETITION",
                    severity=Severity.BLOCK if worst_text >= 0.75 else Severity.WARN,
                    message=f"기존 영상과 내레이션 텍스트 유사도 {worst_text:.0%} (정책 명시: 동일한 내레이션 반복).",
                    evidence=f"text_similarity={worst_text:.3f}",
                    remediation="문장 구조와 사례를 교체하세요. 같은 근거를 쓰더라도 자기 문장으로 다시 씁니다.",
                )
            )
        if worst_visual >= 0.93:
            out.append(
                PolicyFinding(
                    code="VISUAL_REPETITION",
                    severity=Severity.WARN,
                    message=f"키 프레임 시각 지문 유사도 {worst_visual:.0%} — 거의 같은 화면입니다.",
                    evidence=f"visual_similarity={worst_visual:.3f}",
                    remediation="팔레트·구도·샷 사이즈를 바꾸거나 새 레퍼런스를 사용하세요.",
                )
            )
        if worst_audio >= 0.95:
            out.append(
                PolicyFinding(
                    code="AUDIO_REPETITION",
                    severity=Severity.WARN,
                    message=f"오디오 지문 유사도 {worst_audio:.0%} — 같은 보이스·템포 재사용.",
                    evidence=f"audio_similarity={worst_audio:.3f}",
                    remediation="보이스/템포/무드를 바꾸거나 사람 육성을 일부 구간에 넣으세요.",
                )
            )
        return out

    def _format_quality(self, inputs: PolicyInputs) -> list[PolicyFinding]:
        out: list[PolicyFinding] = []
        screenplay = inputs.screenplay
        if not screenplay:
            return out
        signature = structure_signature(screenplay)
        words_per_shot = float(signature["words_per_shot"])
        static_ratio = self._static_ratio(screenplay)
        has_dialogue = signature["dialogue_lines"] > 0
        narrative_density = words_per_shot
        if static_ratio >= 0.8 and narrative_density < 12 and not has_dialogue:
            out.append(
                PolicyFinding(
                    code="SLIDESHOW_LOW_NARRATIVE",
                    severity=Severity.BLOCK,
                    message=(
                        f"정지 화면 비율 {static_ratio:.0%}, 샷당 단어 {narrative_density:.1f}. "
                        "'image slideshows or scrolling text with minimal narrative' 유형입니다."
                    ),
                    evidence=f"static_ratio={static_ratio:.2f}; words_per_shot={narrative_density}",
                    remediation=(
                        "샷당 내레이션을 늘리고 카메라 무브·대화·실사 클립을 섞어 시각 변화율을 높이세요."
                    ),
                )
            )
        elif static_ratio >= 0.65:
            out.append(
                PolicyFinding(
                    code="LOW_VISUAL_CHANGE",
                    severity=Severity.WARN,
                    message=f"정지 화면 비율 {static_ratio:.0%} — 시각 변화가 적습니다.",
                    evidence=f"static_ratio={static_ratio:.2f}",
                    remediation="움직임이 있는 샷(motion/video provider) 비중을 40% 이상으로 높이세요.",
                )
            )
        if screenplay.human_sourced_ratio < 0.35:
            out.append(
                PolicyFinding(
                    code="LOW_HUMAN_SHARE",
                    severity=Severity.WARN,
                    message=(
                        f"사람이 제공한 문장 비율 {screenplay.human_sourced_ratio:.0%} (< 35%). "
                        "자동 초안 비중이 높아 '사람의 창작적 기여' 입증이 약해집니다."
                    ),
                    evidence=f"human_sourced_ratio={screenplay.human_sourced_ratio:.3f}",
                    remediation=(
                        "brief 답변과 value-add 증거를 늘리거나 script edit로 핵심 씬(훅·근거·결론)을 직접 다시 쓰세요."
                    ),
                )
            )
        synthetic_voice = inputs.narration_backend.startswith(("espeak", "edge", "openai", "elevenlabs", "google", "azure"))
        if synthetic_voice and not any(str(c.kind.value) in {"human_voice", "custom_visual"} for c in inputs.brief.human_value_adds):
            out.append(
                PolicyFinding(
                    code="SYNTHETIC_VOICE_GENERIC_VISUAL",
                    severity=Severity.WARN,
                    message=(
                        "합성 음성 + 일반 비주얼 조합은 정책 집행에서 주요 트리거로 지목된 패턴입니다."
                    ),
                    evidence=f"narration_backend={inputs.narration_backend}",
                    remediation="일부 구간 본인 육성 녹음, 혹은 직접 촬영/제작 비주얼을 value-add로 추가하세요.",
                )
            )
        return out

    def _cadence(self, inputs: PolicyInputs) -> list[PolicyFinding]:
        out: list[PolicyFinding] = []
        if inputs.uploads_last_24h > MAX_UPLOADS_PER_DAY:
            out.append(
                PolicyFinding(
                    code="MASS_PRODUCTION_CADENCE",
                    severity=Severity.BLOCK,
                    message=f"24시간 내 {inputs.uploads_last_24h}건 업로드 — 대량 생산 패턴입니다.",
                    evidence=f"uploads_last_24h={inputs.uploads_last_24h}",
                    remediation="업로드를 분산하고 각 영상에 고유 기여를 추가하세요 (정책은 채널 단위로 집행됩니다).",
                )
            )
        elif inputs.uploads_last_7_days > MAX_UPLOADS_PER_WEEK:
            out.append(
                PolicyFinding(
                    code="HIGH_CADENCE",
                    severity=Severity.WARN,
                    message=f"최근 7일 {inputs.uploads_last_7_days}건 업로드 — 변동성 없는 대량 업로드 위험.",
                    evidence=f"uploads_last_7_days={inputs.uploads_last_7_days}",
                    remediation="주간 3~5건으로 낮추고 남는 시간은 리서치·검증에 쓰세요.",
                )
            )
        return out

    def _metadata(self, inputs: PolicyInputs, catalog: list[dict[str, Any]]) -> list[PolicyFinding]:
        out: list[PolicyFinding] = []
        title = (inputs.title or inputs.brief.working_title).strip()
        if not title:
            return out
        for row in reversed(catalog):
            previous_title = row.get("title", "")
            similarity = text_similarity(title, previous_title)
            if similarity >= TITLE_BLOCK_SIMILARITY:
                out.append(
                    PolicyFinding(
                        code="TITLE_DUPLICATION",
                        severity=Severity.BLOCK,
                        message=f"기존 제목과 유사도 {similarity:.0%}: '{previous_title[:40]}'.",
                        evidence=f"title_similarity={similarity:.3f}",
                        remediation="숫자·대상·약속을 바꿔 제목을 재작성하세요.",
                    )
                )
                break
            if similarity >= TITLE_WARN_SIMILARITY:
                out.append(
                    PolicyFinding(
                        code="TITLE_NEAR_DUPLICATE",
                        severity=Severity.WARN,
                        message=f"제목 유사도 {similarity:.0%} — 제목 패턴이 반복됩니다.",
                        evidence=f"title_similarity={similarity:.3f}",
                        remediation="훅 단어와 구조를 바꾸세요.",
                    )
                )
                break
        if inputs.screenplay:
            congruence = self._title_content_congruence(title, inputs.screenplay)
            if congruence < 0.25:
                out.append(
                    PolicyFinding(
                        code="MISLEADING_METADATA",
                        severity=Severity.BLOCK,
                        message=f"제목과 본문 일치도 {congruence:.0%} — 오해 유발 메타데이터 위험.",
                        evidence=f"congruence={congruence:.3f}",
                        remediation="제목의 약속이 영상에서 실제로 다뤄지도록 대본을 보강하거나 제목을 바꾸세요.",
                    )
                )
        return out

    def _disclosure(self, inputs: PolicyInputs) -> list[PolicyFinding]:
        if not inputs.synthetic_media:
            return []
        if inputs.disclosure_set:
            return [
                PolicyFinding(
                    code="DISCLOSURE_SET",
                    severity=Severity.INFO,
                    message="합성·변형 콘텐츠 공개가 설정되었습니다.",
                    remediation="업로드 시 YouTube Studio의 'Altered or synthetic content' 옵션을 유지하세요.",
                )
            ]
        return [
            PolicyFinding(
                code="DISCLOSURE_MISSING",
                severity=Severity.WARN,
                message="사실적으로 보이는 AI 생성 콘텐츠는 공개(disclosure)가 필요합니다.",
                remediation="package 단계가 자동 생성한 disclosure 문구를 설명란에 넣고 Studio 토글을 켜세요.",
            )
        ]

    # -- helpers ------------------------------------------------------------
    @staticmethod
    def _static_ratio(screenplay: Screenplay) -> float:
        total = 0
        static = 0
        for scene in screenplay.scenes:
            for shot in scene.shots:
                total += 1
                if shot.move.value == "static":
                    static += 1
        return static / total if total else 1.0

    @staticmethod
    def _title_content_congruence(title: str, screenplay: Screenplay) -> float:
        title_terms = set(tokenize(title))
        if not title_terms:
            return 0.0
        body_terms = set(tokenize(screenplay.narration_text))
        for scene in screenplay.scenes:
            for shot in scene.shots:
                body_terms.update(tokenize(shot.prompt))
                body_terms.update(tokenize(shot.on_screen_text))
        stop = {"그", "이", "저", "것", "수", "the", "a", "an", "of", "to", "for"}
        meaningful = {t for t in title_terms if t not in stop and len(t) > 1}
        if not meaningful:
            return 0.0
        return len(meaningful & body_terms) / len(meaningful)

    @staticmethod
    def _worst_case_variation(inputs: PolicyInputs, catalog: list[dict[str, Any]]) -> float:
        """1.0 = fully distinct from catalog; lower means more repetitive."""

        if not catalog or not inputs.screenplay:
            return 1.0
        signature = structure_signature(inputs.screenplay)
        worst = max(
            (signature_similarity(signature, row.get("structure") or {}) for row in catalog),
            default=0.0,
        )
        worst = max(
            worst,
            max((text_similarity(inputs.screenplay.narration_text, row.get("narration_text", "")) for row in catalog), default=0.0),
        )
        return round(1.0 - worst, 4)

    @staticmethod
    def _score(
        findings: list[PolicyFinding],
        inputs: PolicyInputs,
        decisions: list[Any],
        value_adds: list[Any],
    ) -> float:
        score = 100.0
        for finding in findings:
            if finding.severity is Severity.BLOCK:
                score -= 30.0
            elif finding.severity is Severity.WARN:
                score -= 12.0
        score += min(len(decisions), 8) * 1.5
        score += min(len(value_adds), 5) * 3.0
        if inputs.screenplay and inputs.screenplay.human_edited:
            score += 6.0 + min(inputs.screenplay.human_edit_distance, 0.6) * 10.0
        if inputs.disclosure_set:
            score += 3.0
        return round(max(0.0, min(100.0, score)), 1)


def summarize(report: PolicyReport) -> str:
    lines = [
        f"Authenticity score: {report.score:.1f}/100  ->  {'PASS' if report.ok else 'BLOCKED'}",
        f"Human decisions: {report.human_decision_count} | value-adds: {report.value_add_count} "
        f"| variation vs catalog: {report.variation_vs_catalog:.2f}",
    ]
    for finding in report.findings:
        lines.append(f"  [{finding.severity.value.upper():5}] {finding.code}: {finding.message}")
        if finding.remediation:
            lines.append(f"          fix: {finding.remediation}")
    if not report.findings:
        lines.append("  no findings")
    return "\n".join(lines)
