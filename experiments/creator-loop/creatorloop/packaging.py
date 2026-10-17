"""③ Packaging: titles, thumbnails, description and the A/B plan.

The optimizer is deliberately constrained by policy, not just by CTR: a title that
promises something the video does not deliver is scored down (misleading metadata is
its own monetization risk), and every thumbnail variant is checked for mobile
legibility before it is offered as a Test & Compare candidate.

Scores combine fixed heuristics with weights learned from the channel's own analytics
(:mod:`creatorloop.analytics`), shrunk toward the prior so a handful of videos cannot
swing the optimizer.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

from .art import ThumbnailSpec, legibility_report, render_thumbnail
from .screenplay import _resolve_particle_alternatives
from .contracts import (
    Screenplay,
    Shot,
    ShotSize,
    ThumbnailVariant,
    TitleCandidate,
    TopicBrief,
    VideoPackage,
    new_id,
    utcnow,
)
from .policy import tokenize
from .render import encode_thumbnail_jpeg

MAX_TITLE_CHARS = 60
SWEET_SPOT_CHARS = (32, 48)
KEYWORD_FRONT_CHARS = 22

DEFAULT_WEIGHTS: dict[str, float] = {
    "length": 0.16,
    "keyword_front": 0.18,
    "specificity": 0.18,
    "curiosity": 0.16,
    "congruence": 0.20,
    "clickbait_penalty": 0.12,
}
PRIOR_SAMPLE_SIZE = 12.0

CURIOSITY_MARKERS = ("이유", "차이", "왜", "모르면", "몰랐", "함정", "순서", "방법", "기준", "착각", "뒤늦게", "결국")
CLICKBAIT_MARKERS = ("충격", "경악", "소름", "대박", "무조건", "100%", "완벽", "최고", "긴급", "충격적", "미친", "절대 손해")
SPECIFICITY_UNITS = ("원", "%", "만원", "억", "건", "명", "배", "일", "주", "개월", "년", "시간", "분", "번", "개", "회")
PERIOD_WORDS = ("2024", "2025", "2026", "올해", "작년", "최근", "분기", "반기", "확정신고", "마감")

TITLE_ARCHETYPES: dict[str, list[str]] = {
    "number_result": [
        "{number} 차이가 난 {topic}, 원인은 하나였습니다",
        "{topic}에서 {number}을(를) 되돌려받은 실제 순서",
        "{period} {topic}: {number}이(가) 사라진 이유",
    ],
    "question": [
        "{topic}, 왜 {pain}이(가) 생길까?",
        "{topic} 전에 이 {count}가지를 확인하셨나요?",
        "{keyword} {pain}, 이유가 뭘까요?",
    ],
    "myth_bust": [
        "{topic}에 대한 흔한 착각 {count}가지",
        "'{myth}' — {topic}에서는 다릅니다",
        "{topic}, 다들 아는 방법이 틀린 이유",
    ],
    "checklist": [
        "{topic} 체크리스트 {count}가지 ({period} 기준)",
        "{topic} 전 확인할 {count}가지",
        "{keyword} {count}가지만 보면 끝납니다",
    ],
    "loss_aversion": [
        "{topic} 모르면 {number} 그대로 냅니다",
        "{period} {topic}, 놓치면 {loss}",
        "{topic}에서 {number} 손해 본 이유",
    ],
    "contrast": [
        "같은 {metric}인데 {difference}: {topic}의 차이",
        "{topic} 결과 갈린 조건 하나",
        "{metric} {difference}, {topic}에서 벌어진 일",
    ],
    "how_to": [
        "{topic} 직접 하는 순서 ({period} 기준)",
        "{keyword} {count}단계로 끝내기",
        "{topic} 처음이라면 이 순서로",
    ],
    "story": [
        "{period}에 {topic}으로 {number} 날린 이야기",
        "{topic} 실패 후 바꾼 것 {count}가지",
        "제가 {topic}에서 {loss}을(를) 낸 이유",
    ],
}

ARCHETYPE_BY_HOOK: dict[str, str] = {
    "question": "question",
    "number_result": "number_result",
    "myth_bust": "myth_bust",
    "scene_immersion": "story",
    "loss_aversion": "loss_aversion",
    "checklist": "checklist",
    "contrast": "contrast",
    "deadline": "loss_aversion",
}


@dataclass(slots=True)
class PackagingInputs:
    brief: TopicBrief
    screenplay: Screenplay | None = None
    scene_timings: Sequence[dict[str, Any]] = ()
    poster: Path | None = None
    brand: dict[str, Any] | None = None
    weights: dict[str, float] | None = None
    video_path: Path | None = None


def title_content_congruence(title: str, screenplay: Screenplay | None) -> float:
    if not screenplay:
        return 0.6
    title_terms = {term for term in tokenize(title) if len(term) > 1}
    if not title_terms:
        return 0.0
    body_terms = set(tokenize(screenplay.narration_text))
    for scene in screenplay.scenes:
        for shot in scene.shots:
            body_terms.update(tokenize(shot.prompt))
            body_terms.update(tokenize(shot.on_screen_text))
    return len(title_terms & body_terms) / len(title_terms)


def _slot_values(inputs: PackagingInputs) -> dict[str, str]:
    brief = inputs.brief
    answers = {decision.question: decision.answer for decision in brief.decisions}
    signature = (inputs.screenplay.structure_signature if inputs.screenplay else {}) or {}
    slots = dict(signature.get("slot_values", {}))
    numbers = re.findall(r"\d[\d,\.]*\s*(?:원|%|만원|억|건|명|배|일|주|개월|년)?", " ".join(answers.values()) + " " + brief.human_take)
    keyword = brief.keywords[0] if brief.keywords else brief.working_title
    values = {
        "topic": slots.get("topic") or keyword,
        "keyword": keyword,
        "number": numbers[0].strip() if numbers else slots.get("number", "3가지"),
        "count": re.sub(r"\D", "", slots.get("number", "3")) or "3",
        "period": slots.get("period", "2025년"),
        "pain": brief.viewer_problem[:18] or "손해",
        "loss": slots.get("loss", "불필요한 비용"),
        "metric": slots.get("metric", keyword),
        "difference": slots.get("difference", "두 배 차이"),
        "myth": slots.get("myth", "다들 아는 방법"),
    }
    return {key: str(value) for key, value in values.items()}


def _fill(template: str, values: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        return str(values.get(match.group(1), match.group(1)))

    text = re.sub(r"\{(\w+)\}", replace, template)
    # 받침 검사로 조사를 확정합니다 ("4을(를)" -> "4를", "비용을(를)" -> "비용을").
    text = _resolve_particle_alternatives(text)
    return text.strip()


def score_title(
    title: str,
    inputs: PackagingInputs,
    *,
    weights: dict[str, float] | None = None,
) -> tuple[float, dict[str, float]]:
    resolved = _blend_weights(weights or inputs.weights or {})
    length = len(title)
    if length <= SWEET_SPOT_CHARS[0]:
        length_score = 0.55 + 0.45 * (length / max(SWEET_SPOT_CHARS[0], 1))
    elif length <= SWEET_SPOT_CHARS[1]:
        length_score = 1.0
    elif length <= MAX_TITLE_CHARS:
        length_score = 1.0 - 0.5 * (length - SWEET_SPOT_CHARS[1]) / max(MAX_TITLE_CHARS - SWEET_SPOT_CHARS[1], 1)
    else:
        length_score = max(0.0, 0.5 - 0.06 * (length - MAX_TITLE_CHARS))

    keyword = inputs.brief.keywords[0] if inputs.brief.keywords else ""
    keyword_front = 0.0
    if keyword:
        position = title.find(keyword)
        if position == 0:
            keyword_front = 1.0
        elif 0 < position <= KEYWORD_FRONT_CHARS:
            keyword_front = 0.7
        elif position > 0:
            keyword_front = 0.35
        else:
            keyword_front = 0.1

    specificity = 0.0
    if any(ch.isdigit() for ch in title):
        specificity += 0.55
    if any(unit in title for unit in SPECIFICITY_UNITS):
        specificity += 0.25
    if any(word in title for word in PERIOD_WORDS):
        specificity += 0.2
    specificity = min(specificity, 1.0)

    curiosity = min(sum(0.34 for marker in CURIOSITY_MARKERS if marker in title), 1.0)
    if "?" in title:
        curiosity = min(curiosity + 0.25, 1.0)

    congruence = title_content_congruence(title, inputs.screenplay)
    clickbait = sum(1 for marker in CLICKBAIT_MARKERS if marker in title)
    clickbait_penalty = max(0.0, 1.0 - 0.4 * clickbait)
    if congruence < 0.25:
        clickbait_penalty *= 0.4

    parts = {
        "length": round(length_score, 3),
        "keyword_front": round(keyword_front, 3),
        "specificity": round(specificity, 3),
        "curiosity": round(curiosity, 3),
        "congruence": round(congruence, 3),
        "clickbait_penalty": round(clickbait_penalty, 3),
    }
    total = sum(resolved[key] * value for key, value in parts.items())
    normalizer = sum(resolved.values()) or 1.0
    return round(total / normalizer * 100, 2), parts


def _blend_weights(learned: dict[str, float]) -> dict[str, float]:
    """Bayesian shrinkage between learned weights and the documented prior."""

    if not learned:
        return dict(DEFAULT_WEIGHTS)
    samples = float(learned.get("_samples", 0.0))
    blend = samples / (samples + PRIOR_SAMPLE_SIZE)
    out = {}
    for key, prior in DEFAULT_WEIGHTS.items():
        observed = float(learned.get(key, prior))
        out[key] = round(prior * (1 - blend) + observed * blend, 4)
    return out


def title_candidates(inputs: PackagingInputs, *, limit: int = 8) -> list[TitleCandidate]:
    values = _slot_values(inputs)
    hook = inputs.screenplay.hook_archetype if inputs.screenplay else "checklist"
    primary = ARCHETYPE_BY_HOOK.get(hook, "checklist")
    order = [primary, *[key for key in TITLE_ARCHETYPES if key != primary]]
    seen: set[str] = set()
    candidates: list[TitleCandidate] = []
    for archetype in order:
        for template in TITLE_ARCHETYPES.get(archetype, []):
            title = _fill(template, values)
            title = re.sub(r"\s{2,}", " ", title).strip()
            if title in seen or len(title) > MAX_TITLE_CHARS + 14:
                continue
            seen.add(title)
            score, breakdown = score_title(title, inputs)
            candidates.append(
                TitleCandidate(
                    title=title,
                    score=score,
                    breakdown=breakdown,
                    archetype=archetype,
                    rationale=_rationale(breakdown, archetype),
                )
            )
    if inputs.brief.working_title and inputs.brief.working_title not in seen:
        score, breakdown = score_title(inputs.brief.working_title, inputs)
        candidates.append(
            TitleCandidate(
                title=inputs.brief.working_title,
                score=score,
                breakdown=breakdown,
                archetype="human",
                rationale="사람이 작성한 작업 제목 (항상 후보로 유지)",
            )
        )
    candidates.sort(key=lambda item: item.score, reverse=True)
    return candidates[:limit]


def _rationale(breakdown: dict[str, float], archetype: str) -> str:
    strong = sorted(breakdown.items(), key=lambda kv: kv[1], reverse=True)[:2]
    weak = sorted(breakdown.items(), key=lambda kv: kv[1])[:1]
    return (
        f"{archetype}: 강점 {', '.join(key for key, _ in strong)}"
        + (f" / 보강 {weak[0][0]}" if weak and weak[0][1] < 0.5 else "")
    )


def headline_from_title(title: str, max_chars: int = 16) -> str:
    """Thumbnail headline: 3-5 words, numbers first, no particles."""

    tokens = [token for token in re.split(r"[\s,:·\-]+", title) if token]
    picked: list[str] = []
    length = 0
    for token in sorted(tokens, key=lambda item: (not any(ch.isdigit() for ch in item), len(item))):
        cleaned = re.sub(r"[은는이을를과도만]", "", token) if not any(ch.isdigit() for ch in token) else token
        if not cleaned:
            continue
        if length + len(cleaned) > max_chars:
            continue
        picked.append(cleaned)
        length += len(cleaned)
        if len(picked) >= 4:
            break
    return " ".join(picked) or title[:max_chars]


def thumbnail_specs(inputs: PackagingInputs, titles: Sequence[TitleCandidate]) -> list[ThumbnailSpec]:
    best = titles[0].title if titles else inputs.brief.working_title
    second = titles[1].title if len(titles) > 1 else best
    third = titles[2].title if len(titles) > 2 else inputs.brief.working_title
    values = _slot_values(inputs)
    badge = re.sub(r"\D", "", values.get("number", "")) or "3"
    reference_shot: Shot | None = None
    if inputs.screenplay and inputs.screenplay.scenes:
        for shot in inputs.screenplay.scenes[0].shots:
            if shot.size in (ShotSize.MS, ShotSize.LS, ShotSize.MCU):
                reference_shot = shot
                break
        reference_shot = reference_shot or inputs.screenplay.scenes[0].shots[0]
    return [
        ThumbnailSpec(variant_id="A", layout="big_word", headline=headline_from_title(best), kicker=inputs.brief.keywords[0] if inputs.brief.keywords else "", badge=badge, background_shot=reference_shot),
        ThumbnailSpec(variant_id="B", layout="split", headline=headline_from_title(second, 12), kicker=values.get("period", ""), background_shot=reference_shot),
        ThumbnailSpec(variant_id="C", layout="question", headline=headline_from_title(third, 14) + "?", kicker="", badge=badge, background_shot=reference_shot),
    ]


def score_thumbnail(variant: ThumbnailVariant, legibility: dict[str, Any]) -> tuple[float, dict[str, float]]:
    parts = {
        "legibility": 1.0 if legibility["legible_at_mobile"] else 0.35,
        "contrast": min(legibility["contrast"] / 0.45, 1.0),
        "dynamic_range": min(legibility["dynamic_range"] / 0.55, 1.0),
        "headline_length": 1.0 if len(variant.headline) <= 16 else max(0.3, 1.0 - 0.06 * (len(variant.headline) - 16)),
        "file_size": 1.0 if 0 < variant.bytes <= 2 * 1024 * 1024 else 0.2,
    }
    weights = {"legibility": 0.30, "contrast": 0.20, "dynamic_range": 0.16, "headline_length": 0.20, "file_size": 0.14}
    return round(sum(parts[key] * weight for key, weight in weights.items()) * 100, 2), {key: round(value, 3) for key, value in parts.items()}


def render_thumbnails(inputs: PackagingInputs, titles: Sequence[TitleCandidate]) -> list[ThumbnailVariant]:
    brief = inputs.brief
    project_dir = Path(inputs.video_path).parent if inputs.video_path else Path("out/projects") / brief.id
    thumb_dir = project_dir / "thumbnails"
    thumb_dir.mkdir(parents=True, exist_ok=True)
    seed_text = f"{brief.working_title}|{brief.niche_id}"
    variants: list[ThumbnailVariant] = []
    for spec in thumbnail_specs(inputs, titles):
        png_path = thumb_dir / f"thumb_{spec.variant_id}.png"
        render_thumbnail(spec, png_path, brand=inputs.brand, seed_text=seed_text)
        jpeg_path = thumb_dir / f"thumb_{spec.variant_id}.jpg"
        encode_thumbnail_jpeg(png_path, jpeg_path)
        png_path.unlink(missing_ok=True)
        legibility = legibility_report(jpeg_path, spec.headline)
        variant = ThumbnailVariant(
            variant_id=spec.variant_id,
            path=str(jpeg_path),
            headline=spec.headline,
            score=0.0,
            legible_at_mobile=bool(legibility["legible_at_mobile"]),
            bytes=jpeg_path.stat().st_size,
        )
        variant.score, variant.breakdown = score_thumbnail(variant, legibility)
        variants.append(variant)
    variants.sort(key=lambda item: item.score, reverse=True)
    return variants


def build_description(inputs: PackagingInputs, package_title: str) -> tuple[str, list[dict[str, Any]], list[str], str]:
    brief = inputs.brief
    screenplay = inputs.screenplay
    lines: list[str] = []
    hook = brief.human_take or brief.angle
    if hook:
        lines.append(hook.strip())
    lines.append("")
    lines.append(f"■ {package_title}")
    lines.append("")
    chapters: list[dict[str, Any]] = []
    if screenplay:
        timings = list(inputs.scene_timings)
        for index, scene in enumerate(screenplay.scenes):
            start = float(timings[index]["start_s"]) if index < len(timings) else 0.0
            label = _chapter_label(scene.beat, scene.narration)
            chapters.append({"start_s": round(start, 2), "label": label})
            lines.append(f"{_timestamp(start)} {label}")
        lines.append("")
    if brief.human_value_adds:
        lines.append("■ 이 영상에 담은 직접 근거")
        for claim in brief.human_value_adds[:5]:
            lines.append(f"- [{claim.kind.value}] {claim.evidence}")
        lines.append("")
    if brief.differentiation:
        lines.append(f"■ 차별점: {brief.differentiation}")
        lines.append("")
    if brief.sources:
        lines.append("■ 출처/확인")
        for source in brief.sources[:6]:
            lines.append(f"- {source}")
        lines.append("")
    if brief.niche_id == "solo_tax_kr":
        lines.append("※ 일반 정보이며 개별 세무·법률 조언이 아닙니다. 적용 전 전문가 확인을 권합니다.")
        lines.append("")
    disclosure = (
        "※ AI 고지: 이 영상은 제작 과정에 AI 도구(영상·음성 생성, 자막 배치)를 사용했으며, "
        "사실적으로 보이는 장면은 합성·변형된 콘텐츠입니다. 주제 선정과 근거 확인, 해석과 결론은 제작자가 직접 수행했습니다."
    )
    lines.append(disclosure)
    hashtags = [f"#{tag.replace(' ', '')}" for tag in brief.keywords[:3]]
    return "\n".join(lines), chapters, hashtags, disclosure


def _chapter_label(beat: str, narration: str) -> str:
    first = narration.strip().split(".")[0] if narration else beat
    return first[:34] if first else beat


def _timestamp(seconds: float) -> str:
    total = int(seconds)
    return f"{total // 60:02d}:{total % 60:02d}"


def ab_plan(variants: Sequence[ThumbnailVariant], titles: Sequence[TitleCandidate]) -> str:
    ordered = ", ".join(variant.variant_id for variant in variants)
    best_title = titles[0].title if titles else "(제목 미정)"
    return (
        "YouTube Studio → 콘텐츠 → 'Test & Compare'에 썸네일 3종을 등록하세요 "
        f"(추천 순서: {ordered}). 최소 판단 기준: 누적 노출 3,000회 또는 7일. "
        f"승자 판정은 노출 대비 CTR 차이가 ±0.3%p 이상일 때만 인정하고, 그 미만이면 유지 후 다음 변형을 테스트합니다. "
        f"기본 제목: {best_title}"
    )


def pinned_comment(inputs: PackagingInputs, package_title: str) -> str:
    brief = inputs.brief
    correction = "정정 정책: 영상 내용 중 수치·기준이 바뀌면 이 댓글에 날짜와 함께 정정합니다."
    question = f"'{package_title}' 관련해서 여러분 상황에서 막힌 지점은 어디인가요? 댓글로 남겨주시면 다음 영상 순서에 반영합니다."
    source_note = f"근거: {', '.join(brief.sources[:3])}" if brief.sources else "근거는 설명란 '출처/확인'에 정리했습니다."
    return "\n".join(part for part in (question, source_note, correction) if part)


def tags_for(brief: TopicBrief, limit: int = 18) -> list[str]:
    tags: list[str] = []
    for keyword in brief.keywords:
        tags.append(keyword)
        for word in tokenize(keyword):
            if len(word) > 1 and word not in tags:
                tags.append(word)
    for word in tokenize(f"{brief.working_title} {brief.angle}"):
        if len(word) > 1 and word not in tags:
            tags.append(word)
    return tags[:limit]


def optimize_package(inputs: PackagingInputs) -> VideoPackage:
    titles = title_candidates(inputs)
    thumbnails = render_thumbnails(inputs, titles)
    best_title = titles[0].title if titles else inputs.brief.working_title
    description, chapters, hashtags, disclosure = build_description(inputs, best_title)
    package = VideoPackage(
        id=new_id("pkg"),
        brief_id=inputs.brief.id,
        titles=titles,
        thumbnails=thumbnails,
        description=description,
        chapters=chapters,
        tags=tags_for(inputs.brief),
        hashtags=hashtags,
        synthetic_disclosure=True,
        disclosure_text=disclosure,
        ab_plan=ab_plan(thumbnails, titles),
        pinned_comment=pinned_comment(inputs, best_title),
        created_at=utcnow(),
    )
    return package
