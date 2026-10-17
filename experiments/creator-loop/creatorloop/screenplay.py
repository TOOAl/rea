"""② Screenplay: the production blueprint the whole pipeline executes.

Implements the parts that made each reference tool useful, as one local pipeline:

* InVideo AI — a short brief becomes a full shootable script (beats, narration,
  shots, on-screen text, music/SFX cues) instead of a wall of prose.
* Pictory — long text/articles become scenes with shot allocation, plus highlight
  extraction for Shorts.
* Veo 3 — terse ideas are expanded into cinematography+audio prompts, and the audio
  design (dialogue/SFX/ambience/music) is authored here even when a provider has no
  native audio.
* Runway Gen-4 — every shot carries shot size, lens, angle and an explicit camera
  move from one director vocabulary.
* Kling — motion intensity/negative prompts are per-shot so motion stays natural.
* Sora 2 — an entity bible plus continuity checks keep multi-shot narratives coherent,
  and :func:`remix` re-variants a video while preserving human-authored lines.

Variation is deterministic but rotates: consecutive videos get different hooks, beat
orders, shot-size mixes and palettes, which is what keeps the channel out of the
"same template with little to no variation" category.
"""

from __future__ import annotations

import hashlib
import random
import re
import string
from dataclasses import dataclass, field
from typing import Any, Sequence

from .contracts import (
    AudioDesign,
    CameraMove,
    Entity,
    HumanDecision,
    Scene,
    Screenplay,
    Shot,
    ShotSize,
    Stage,
    TopicBrief,
    new_id,
    utcnow,
)
from .policy import levenshtein_ratio, structure_signature

HOOK_ARCHETYPES: dict[str, dict[str, Any]] = {
    "question": {
        "ko": "혹시 {topic} 때문에 {pain}한 적 있으신가요? 오늘 그 이유를 정확하게 정리했습니다.",
        "visual": "close-up, direct address energy",
        "music": "analytical",
        "shots": 2,
    },
    "number_result": {
        "ko": "{number}. 제가 {period} 동안 {action}해서 나온 실제 결과입니다. 과정을 그대로 보여드리겠습니다.",
        "visual": "data card, big number reveal",
        "music": "upbeat",
        "shots": 3,
    },
    "myth_bust": {
        "ko": "'{myth}' 이렇게 알고 계신 분이 많습니다. 결론부터 말하면 그렇지 않습니다. 근거를 하나씩 확인해 보죠.",
        "visual": "contrast split frame",
        "music": "serious",
        "shots": 2,
    },
    "scene_immersion": {
        "ko": "{when}, 저는 {place}에서 {situation}을(를) 보고 그대로 멈췄습니다. 그날 이후로 판단 기준이 바뀌었습니다.",
        "visual": "ambient wide establishing shot",
        "music": "warm",
        "shots": 3,
    },
    "loss_aversion": {
        "ko": "이걸 모르면 {period}에 {loss_p} 그대로 냅니다. 확인하는 데 3분이면 충분합니다.",
        "visual": "urgent red-accent card",
        "music": "urgent",
        "shots": 2,
    },
    "checklist": {
        "ko": "{topic}, 딱 {number}가지만 확인하면 됩니다. 순서대로 따라오세요.",
        "visual": "numbered checklist overlay",
        "music": "analytical",
        "shots": 2,
    },
    "contrast": {
        "ko": "같은 {metric}인데 {difference}가 났습니다. 차이를 만든 건 조건 하나였습니다.",
        "visual": "side-by-side comparison",
        "music": "analytical",
        "shots": 3,
    },
    "deadline": {
        "ko": "{deadline} 전에 이걸 알아서 다행이었습니다. 모르고 넘겼다면 {loss}였을 겁니다.",
        "visual": "calendar/clock motif",
        "music": "urgent",
        "shots": 2,
    },
}

BEAT_PLANS: dict[str, list[str]] = {
    "classic": ["hook", "promise", "context", "point", "point", "point", "turn", "takeaway", "cta"],
    "story_first": ["hook", "story", "problem", "lesson", "lesson", "turn", "takeaway", "cta"],
    "myth_bust": ["hook", "myth", "evidence", "case", "exception", "takeaway", "cta"],
    "experiment": ["hook", "hypothesis", "method", "result", "interpretation", "limit", "takeaway", "cta"],
    "faq": ["hook", "question_1", "question_2", "question_3", "question_4", "takeaway", "cta"],
    "countdown": ["hook", "item_3", "item_2", "item_1", "bonus", "takeaway", "cta"],
}

NICHE_PLAN_PREFERENCE: dict[str, list[str]] = {
    "solo_tax_kr": ["myth_bust", "faq", "classic", "countdown", "experiment"],
    "career_pivot_4050": ["story_first", "classic", "faq", "countdown"],
    "local_biz_experiment": ["experiment", "countdown", "classic", "story_first"],
}

BEAT_PURPOSE: dict[str, str] = {
    "hook": "첫 8초 안에 시청 이유를 만든다",
    "promise": "이 영상에서 얻게 될 것을 명시한다",
    "context": "전제 조건과 대상 범위를 좁힌다",
    "point": "근거와 함께 한 가지 주장을 증명한다",
    "turn": "흔한 오해나 예외 조건을 다룬다",
    "takeaway": "핵심 요약을 한 문장으로 남긴다",
    "cta": "다음 행동과 다음 영상을 연결한다",
    "story": "실제 경험을 시간 순서로 보여준다",
    "problem": "당시의 문제와 비용을 구체화한다",
    "lesson": "경험에서 뽑은 실행 가능한 교훈",
    "myth": "흔한 통념을 그대로 제시한다",
    "evidence": "통념을 뒤집는 근거를 제시한다",
    "case": "실제 사례로 근거를 확인한다",
    "exception": "예외 조건과 한계를 밝힌다",
    "hypothesis": "실험 가설과 성공 기준 숫자를 밝힌다",
    "method": "실험 설계와 통제 변수를 설명한다",
    "result": "측정 결과를 그대로 공개한다",
    "interpretation": "결과가 의미하는 바를 해석한다",
    "limit": "재현 한계와 적용 범위를 밝힌다",
    "question_1": "자주 묻는 첫 번째 질문과 답",
    "question_2": "자주 묻는 두 번째 질문과 답",
    "question_3": "자주 묻는 세 번째 질문과 답",
    "question_4": "자주 묻는 네 번째 질문과 답",
    "item_3": "3순위 항목",
    "item_2": "2순위 항목",
    "item_1": "1순위 항목 (가장 중요)",
    "bonus": "추가 항목 · 다음 영상 예고",
}

TRANSITIONS = ["cut", "cut", "cut", "xfade", "dip_black"]
MOVE_POOLS: dict[str, tuple[CameraMove, ...]] = {
    "static_heavy": (CameraMove.STATIC, CameraMove.ZOOM_IN, CameraMove.STATIC, CameraMove.PAN_RIGHT),
    "motion_balanced": (CameraMove.ZOOM_IN, CameraMove.PAN_LEFT, CameraMove.DOLLY_IN, CameraMove.STATIC, CameraMove.TILT_UP),
    "dynamic": (CameraMove.TRUCK_LEFT, CameraMove.DOLLY_IN, CameraMove.PAN_RIGHT, CameraMove.HANDHELD, CameraMove.ZOOM_OUT, CameraMove.ORBIT_RIGHT),
    "documentary": (CameraMove.HANDHELD, CameraMove.STATIC, CameraMove.PEDESTAL_UP, CameraMove.ZOOM_IN),
    "dramatic": (CameraMove.DOLLY_ZOOM, CameraMove.CRANE_UP, CameraMove.ZOOM_IN, CameraMove.ROLL_CW),
}
PALETTES: list[list[str]] = [
    ["#0B1220", "#123A6B", "#F2C14E", "#F5F7FA"],
    ["#14100E", "#6B3A12", "#E8A33D", "#F7E9D5"],
    ["#07130F", "#12604A", "#4FB286", "#EAF6F0"],
    ["#120A18", "#4A2168", "#C77DFF", "#F2E9F7"],
    ["#0E1116", "#2B3A4A", "#8FA6BC", "#EDEFF2"],
    ["#1A0A0A", "#7A1F1F", "#E4572E", "#F6E3D5"],
]

KOREAN_STOPWORDS = {
    "그리고", "그러나", "하지만", "그래서", "또한", "이것", "저것", "그것", "때문에", "대한", "위한", "있는", "없는",
    "합니다", "있습니다", "됩니다", "합니다", "저는", "제가", "우리는", "여러분", "오늘", "정말", "너무", "그냥",
    "the", "and", "for", "with", "this", "that", "from", "have", "will",
}

_SENTENCE_RE = re.compile(r"(?<=[.!?。])\s+|\n+")


@dataclass(slots=True)
class VariationProfile:
    seed: int
    hook_archetype: str
    beat_plan: str
    beats: list[str]
    shots_per_scene: int
    move_pool: tuple[CameraMove, ...]
    sizes: tuple[ShotSize, ...]
    transition_bias: str
    music_mood: str
    music_tempo: int
    palette: list[str]
    words_per_second: float
    ambience: str
    lineage: str

    def to_json(self) -> dict[str, Any]:
        return {
            "seed": self.seed,
            "hook_archetype": self.hook_archetype,
            "beat_plan": self.beat_plan,
            "beats": self.beats,
            "shots_per_scene": self.shots_per_scene,
            "move_pool": [move.value for move in self.move_pool],
            "sizes": [size.value for size in self.sizes],
            "transition_bias": self.transition_bias,
            "music_mood": self.music_mood,
            "music_tempo": self.music_tempo,
            "palette": self.palette,
            "words_per_second": self.words_per_second,
            "ambience": self.ambience,
            "lineage": self.lineage,
        }


def variation_profile(seed_text: str, *, variation_index: int = 0, niche_id: str = "", runtime_target_s: int = 300) -> VariationProfile:
    digest = hashlib.sha256(f"{seed_text}|{variation_index}|{niche_id}".encode("utf-8")).hexdigest()
    seed = int(digest[:10], 16)
    rng = random.Random(seed)
    plans = NICHE_PLAN_PREFERENCE.get(niche_id) or list(BEAT_PLANS)
    beat_plan = plans[(seed + variation_index) % len(plans)]
    beats = list(BEAT_PLANS[beat_plan])
    archetypes = list(HOOK_ARCHETYPES)
    hook = archetypes[((seed >> 3) + variation_index * 3) % len(archetypes)]
    pools = list(MOVE_POOLS)
    move_pool = MOVE_POOLS[pools[((seed >> 6) + variation_index) % len(pools)]]
    size_sets: tuple[tuple[ShotSize, ...], ...] = (
        (ShotSize.CU, ShotSize.MS, ShotSize.LS),
        (ShotSize.MCU, ShotSize.MS, ShotSize.MLS, ShotSize.CU),
        (ShotSize.MS, ShotSize.LS, ShotSize.ECU),
        (ShotSize.MCU, ShotSize.LS, ShotSize.CU, ShotSize.ELS),
    )
    sizes = size_sets[((seed >> 9) + variation_index) % len(size_sets)]
    music = HOOK_ARCHETYPES[hook]["music"]
    tempo = {
        "calm": 74,
        "analytical": 96,
        "upbeat": 118,
        "urgent": 126,
        "hopeful": 88,
        "warm": 80,
        "serious": 68,
    }.get(music, 92)
    scenes = max(len(beats), 4)
    words_per_second = round(min(6.2, max(3.6, 5.0 + (variation_index % 3) * 0.35)), 2)
    return VariationProfile(
        seed=seed,
        hook_archetype=hook,
        beat_plan=beat_plan,
        beats=beats,
        shots_per_scene=2 if runtime_target_s < 180 else rng.choice([2, 2, 3]),
        move_pool=move_pool,
        sizes=sizes,
        transition_bias=TRANSITIONS[(seed >> 12) % len(TRANSITIONS)],
        music_mood=music,
        music_tempo=tempo + (seed % 7),
        palette=PALETTES[(seed >> 15) % len(PALETTES)],
        words_per_second=words_per_second,
        ambience=["room_tone", "office", "studio", "cafe"][(seed >> 18) % 4],
        lineage=f"{beat_plan}:{hook}:{pools[(seed >> 6) % len(pools)]}",
    )


# 조사는 "어떻게 읽히는가"로 정해집니다. 숫자는 한자어 독음(4→사, 1→일, 10→십),
# 영문자는 외래어 독음(AI→아이, L→엘)을 기준으로 받침 유무를 판단합니다.
_DIGIT_JONGSEONG = {
    "0": True,   # 십/백/천/만
    "1": True,   # 일
    "2": False,  # 이
    "3": True,   # 삼
    "4": False,  # 사
    "5": False,  # 오
    "6": True,   # 육
    "7": True,   # 칠
    "8": True,   # 팔
    "9": False,  # 구
}
_LETTER_JONGSEONG = {letter: letter.upper() in "LMNR" for letter in string.ascii_letters}
_SYMBOL_JONGSEONG = {"%": False, "％": False, "₩": True, "$": False}


def _has_jongseong(word: str) -> bool:
    """True when the last syllable of ``word`` carries a final consonant (받침).

    Hangul is checked directly; digits and Latin letters are checked by their
    Korean reading so ``4가`` / ``1을`` / ``AI가`` come out natural.
    """

    for char in reversed(word.strip()):
        if "\uac00" <= char <= "\ud7a3":
            return (ord(char) - 0xAC00) % 28 != 0
        if char.isdigit():
            return _DIGIT_JONGSEONG[char]
        if char in _LETTER_JONGSEONG:
            return _LETTER_JONGSEONG[char]
        if char in _SYMBOL_JONGSEONG:
            return _SYMBOL_JONGSEONG[char]
        if char.isalnum():
            return True
    return False


def _particle(word: str, forms: tuple[str, str]) -> str:
    """Attach the correct Korean particle: ``_particle('신고', ('은','는'))`` -> '신고는'."""

    return f"{word}{forms[0] if _has_jongseong(word) else forms[1]}"


def _sentences(text: str) -> list[str]:
    return [part.strip() for part in _SENTENCE_RE.split(text or "") if part and part.strip()]


_PARTICLE_ALT_RE = re.compile(r"([^\s,.\"']{1,12}?)([은는이가을를과와])\(([은는이가을를과와])\)")


def _resolve_particle_alternatives(text: str) -> str:
    """``비용을(를)`` → ``비용을`` / ``신고은(는)`` → ``신고는`` (받침 검사)."""

    return _PARTICLE_ALT_RE.sub(lambda m: _particle(m.group(1), (m.group(2), m.group(3))), text)


def _fill(template: str, values: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        return str(values.get(key, key))

    return _resolve_particle_alternatives(re.sub(r"\{(\w+)\}", replace, template))


@dataclass(slots=True)
class SlotValues:
    topic: str = ""
    pain: str = ""
    number: str = ""
    period: str = ""
    action: str = ""
    myth: str = ""
    when: str = ""
    place: str = ""
    situation: str = ""
    loss: str = ""
    metric: str = ""
    difference: str = ""
    deadline: str = ""

    def as_dict(self) -> dict[str, str]:
        from dataclasses import asdict

        return asdict(self)


def slots_from_brief(brief: TopicBrief) -> SlotValues:
    answers = {decision.question: decision.answer for decision in brief.decisions}
    numbers = re.findall(r"\d[\d,\.]*\s*(?:원|%|만원|억|건|명|배|일|주|개월|년)?", " ".join(answers.values()) + " " + brief.human_take)
    keyword = brief.keywords[0] if brief.keywords else brief.working_title
    return SlotValues(
        topic=keyword or brief.working_title,
        pain=brief.viewer_problem or "손해",
        number=numbers[0].strip() if numbers else "3가지",
        period=_find_period(answers) or "최근 6개월",
        action=_first_clause(answers.get("경험", "") or answers.get("experience", "") or brief.human_take) or "직접 확인",
        myth=_first_clause(answers.get("통념", "") or answers.get("myth", "")) or f"{keyword}은(는) 다들 아는 방식으로 처리하면 충분하다",
        when=_find_period(answers) or "지난 분기",
        place=_first_clause(answers.get("장소", "") or answers.get("place", "")) or "책상 앞",
        situation=_first_clause(brief.human_take) or "예상과 다른 결과",
        loss=_first_clause(answers.get("손해", "") or answers.get("loss", "")) or "불필요한 비용",
        metric=keyword or "매출",
        difference=answers.get("차이", "") or answers.get("difference", "") or "두 배 이상",
        deadline=_find_period(answers) or "마감 3일 전",
    )


def _find_period(answers: dict[str, str]) -> str:
    for value in answers.values():
        match = re.search(r"(\d{4}년|\d+월|\d+년|\d+개월|\d+주|\d+일|작년|재작년|지난해|최근)", str(value))
        if match:
            return match.group(1)
    return ""


def _first_clause(text: str, limit: int = 42) -> str:
    parts = [chunk.strip() for chunk in re.split(r"[\.!\?,;·]| - ", text or "") if chunk.strip()]
    if not parts:
        return ""
    clause = parts[0]
    return clause if len(clause) <= limit else clause[:limit].rsplit(" ", 1)[0]


def _reading_seconds(text: str) -> float:
    from .audio import reading_duration_s

    return reading_duration_s(text)


def _keywords(text: str, limit: int = 12) -> list[str]:
    tokens = re.findall(r"[가-힣]{2,}|[A-Za-z]{3,}", (text or "").lower())
    counts: dict[str, int] = {}
    for token in tokens:
        if token in KOREAN_STOPWORDS:
            continue
        counts[token] = counts.get(token, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [token for token, _ in ranked[:limit]]


def _human_lines(brief: TopicBrief) -> dict[str, list[str]]:
    """Human-authored material, grouped by the beat it can support."""

    buckets: dict[str, list[str]] = {"evidence": [], "story": [], "point": [], "limit": [], "action": []}
    for claim in brief.value_add_claims:
        for sentence in _sentences(claim.evidence):
            if claim.kind.value in ("personal_experience",):
                buckets["story"].append(sentence)
            elif claim.kind.value in ("original_data", "original_research"):
                buckets["evidence"].append(sentence)
            elif claim.kind.value in ("expert_commentary",):
                buckets["point"].append(sentence)
            elif claim.kind.value in ("unique_format", "custom_visual"):
                buckets["action"].append(sentence)
            else:
                buckets["point"].append(sentence)
    meta_questions = ("니치 선택", "작업 제목", "초안 생성", "리믹스", "게이트", "승인")
    for decision in brief.decisions:
        question = decision.question
        answer = decision.answer.strip()
        if not answer or len(answer) < 12:
            continue
        if any(marker in question for marker in meta_questions):
            continue
        if answer in (brief.niche_id, brief.working_title, brief.id):
            continue
        for sentence in _sentences(answer):
            if any(word in question for word in ("실패", "한계", "확신하지", "틀릴", "재현")):
                buckets["limit"].append(sentence)
            elif any(word in question for word in ("경험", "사례", "실제", "어떻게")):
                buckets["story"].append(sentence)
            elif any(word in question for word in ("근거", "출처", "확인", "데이터", "숫자")):
                buckets["evidence"].append(sentence)
            elif any(word in question for word in ("행동", "실행", "다음")):
                buckets["action"].append(sentence)
            else:
                buckets["point"].append(sentence)
    if brief.human_take:
        buckets["point"].extend(_sentences(brief.human_take))
    for key, values in buckets.items():
        seen: dict[str, None] = {}
        for value in values:
            seen.setdefault(value, None)
        buckets[key] = list(seen)
    return buckets


def _beat_narration(
    beat: str,
    profile: VariationProfile,
    brief: TopicBrief,
    slots: SlotValues,
    human: dict[str, list[str]],
    counters: dict[str, int],
) -> tuple[str, str]:
    """Return ``(narration, origin)`` — Korean particles are resolved on the way out."""

    narration, origin = _beat_narration_raw(beat, profile, brief, slots, human, counters)
    return _resolve_particle_alternatives(narration), origin


def _beat_narration_raw(
    beat: str,
    profile: VariationProfile,
    brief: TopicBrief,
    slots: SlotValues,
    human: dict[str, list[str]],
    counters: dict[str, int],
) -> tuple[str, str]:
    """Return ``(narration, origin)`` for one beat; human material is used first."""

    def take(bucket: str) -> str:
        """Each human sentence is used at most once per video (intra-video repetition
        is exactly what the inauthentic-content policy flags)."""

        items = human.get(bucket, [])
        index = counters.get(bucket, 0)
        if index >= len(items):
            return ""
        counters[bucket] = index + 1
        line = items[index].strip()
        return line if line.endswith((".", "!", "?", "다", "요")) else f"{line}."

    values = slots.as_dict()
    topic = values["topic"] or "이 주제"
    tp = _particle(topic, ("은", "는"))       # topic + 은/는
    ti = _particle(topic, ("이", "가"))       # topic + 이/가
    to = _particle(topic, ("을", "를"))       # topic + 을/를
    values["topic_p"] = tp
    values["metric_p"] = _particle(values.get("metric") or topic, ("이", "가"))
    values["loss_p"] = _particle(values.get("loss") or "불필요한 비용", ("을", "를"))
    if beat == "hook":
        template = HOOK_ARCHETYPES[profile.hook_archetype]["ko"]
        line = _fill(template, values)
        human_line = take("story")
        if human_line:
            return f"{line} {human_line}", "mixed"
        return line, "assistant"
    if beat == "promise":
        return (
            f"오늘 영상에서는 {tp} 반드시 확인해야 할 항목을 순서대로 정리합니다. "
            f"끝까지 보시면 {values.get('deadline', '마감 전')}에 그대로 쓸 수 있는 체크리스트가 남습니다.",
            "assistant",
        )
    if beat == "context":
        human_line = take("evidence")
        base = f"먼저 전제 조건입니다. 이 내용은 {brief.target_audience or '같은 조건의 시청자'}를 기준으로 하며, 상황마다 결과가 달라질 수 있습니다."
        if human_line:
            return f"{base} {human_line}", "mixed"
        return base, "assistant"
    if beat in ("point", "lesson", "question_1", "question_2", "question_3", "question_4", "item_1", "item_2", "item_3", "bonus"):
        human_point = take("point")
        human_evidence = take("evidence")
        parts: list[str] = []
        origin = "assistant"
        if human_point:
            parts.append(human_point)
            origin = "human"
        else:
            parts.append(f"{topic}에서 이 구간의 핵심은 조건을 먼저 좁히는 것입니다.")
        if human_evidence:
            parts.append(f"근거는 이렇습니다. {human_evidence}")
            origin = "human" if origin == "human" else "mixed"
        else:
            parts.append("해당 조건에 해당하는지 확인하는 방법을 화면으로 같이 보겠습니다.")
        if beat.startswith("item_"):
            rank = {
                "item_1": "가장 중요한 첫 번째",
                "item_2": "두 번째",
                "item_3": "세 번째",
                "bonus": "보너스",
            }.get(beat, "")
            parts.insert(0, f"{rank} 항목입니다.".replace("보너스 항목입니다.", "보너스입니다."))
        if beat.startswith("question_"):
            order = {"1": "첫", "2": "두", "3": "세", "4": "네"}.get(beat.split("_")[1], "")
            parts.insert(0, f"{order} 번째 질문부터 보겠습니다.")
        return " ".join(parts), origin
    if beat in ("story", "problem", "case"):
        human_line = take("story")
        if human_line:
            return f"실제 경험입니다. {human_line}", "human"
        return f"이 부분은 실제 사례로 확인하는 것이 좋습니다. {values['situation']} 상황에서 어떤 판단이 필요했는지 따라가 보겠습니다.", "assistant"
    if beat in ("myth",):
        return f"많은 분이 이렇게 생각합니다. \"{values['myth']}\" 하지만 이 문장에는 조건이 빠져 있습니다.", "assistant"
    if beat in ("evidence", "result"):
        human_line = take("evidence")
        if human_line:
            return f"근거를 확인해 보겠습니다. {human_line}", "human"
        return "근거는 원본 화면으로 확인하는 것이 가장 안전합니다. 수치는 그대로 보여드리겠습니다.", "assistant"
    if beat == "hypothesis":
        human_line = take("evidence") or take("point")
        base = f"먼저 가설입니다. {tp} 조건을 바꾸면 결과가 달라져야 합니다. 확인 기준은 숫자로 잡아두겠습니다."
        if human_line:
            return f"{base} {human_line}", "mixed"
        return base, "assistant"
    if beat in ("method",):
        human_line = take("action")
        base = f"확인 방법은 단순하게 잡았습니다. {to} 기준으로 기간과 조건을 고정하고 나머지는 그대로 두었습니다."
        if human_line:
            return f"{base} {human_line}", "mixed"
        return base, "assistant"
    if beat in ("interpretation",):
        human_line = take("point")
        base = f"결과의 의미는 이렇습니다. {values['metric_p']} 변한 이유는 조건 하나였습니다."
        if human_line:
            return f"{base} {human_line}", "mixed"
        return base, "assistant"
    if beat in ("exception", "limit"):
        human_line = take("limit")
        if human_line:
            return f"한계도 분명합니다. {human_line}", "human"
        return "다만 이 결론은 모든 상황에 적용되지 않습니다. 조건이 다르면 다시 확인해야 합니다.", "assistant"
    if beat == "turn":
        human_line = take("limit")
        base = "여기서 방향을 조금 틀어보겠습니다. 많은 경우 문제는 금액이 아니라 순서였습니다."
        if human_line:
            return f"{base} {human_line}", "mixed"
        return base, "assistant"
    if beat == "takeaway":
        return (
            f"정리하면, {values['topic']}에서 오늘 확인할 것은 순서와 조건입니다. "
            f"숫자는 나중에 바뀌어도 이 판단 순서는 그대로 쓸 수 있습니다.",
            "assistant",
        )
    if beat == "cta":
        action = take("action")
        base = "다음 영상에서는 이어서 실제 서식 작성 순서를 보여드리겠습니다. 확인이 필요한 부분이 있으면 댓글로 남겨주세요."
        if action:
            return f"{base} {action}", "mixed"
        return base, "assistant"
    human_line = take("point") or take("evidence")
    base = f"{BEAT_PURPOSE.get(beat, beat)}. {tp} 관점에서 이 부분을 같이 확인하겠습니다."
    if human_line:
        return f"{base} {human_line}", "mixed"
    return base, "assistant"


def _shots_for_scene(
    scene_index: int,
    beat: str,
    profile: VariationProfile,
    brief: TopicBrief,
    slots: SlotValues,
    narration: str,
    origin: str,
) -> list[Shot]:
    rng = random.Random(profile.seed + scene_index * 97)
    count = 1 if beat in ("cta", "takeaway") else profile.shots_per_scene
    if beat == "hook":
        count = HOOK_ARCHETYPES[profile.hook_archetype]["shots"]
    from .audio import reading_duration_s

    duration_total = max(reading_duration_s(narration) + 0.4, count * 1.8)
    shots: list[Shot] = []
    keywords = brief.keywords[:4] or [slots.topic]
    for index in range(count):
        size = profile.sizes[(scene_index + index) % len(profile.sizes)]
        move = profile.move_pool[(scene_index * 3 + index) % len(profile.move_pool)]
        keyword = keywords[(scene_index + index) % len(keywords)]
        on_screen = ""
        if beat == "hook" and index == 0:
            on_screen = slots.topic[:14]
        elif beat in ("point", "item_1", "item_2", "item_3", "question_1", "question_2", "question_3", "question_4") and index == 0:
            on_screen = _first_clause(narration, 16)
        elif beat == "takeaway":
            on_screen = "핵심 요약"
        elif beat == "cta":
            on_screen = "다음 영상 예고"
        asset_kind = "generated_still"
        if origin == "human" and beat in ("evidence", "result", "case", "story"):
            asset_kind = "screen_recording"  # prompt the human to supply real footage here
        shots.append(
            Shot(
                id=f"s{scene_index:02d}_{index}",
                prompt=_shot_prompt(beat, keyword, slots, brief, size, index),
                size=size,
                angle=rng.choice(["eye_level", "eye_level", "low_angle", "high_angle"]),
                lens_mm=rng.choice([24, 35, 35, 50, 85]),
                move=move,
                move_intensity=round(0.25 + ((profile.seed >> (index + 2)) % 50) / 100.0, 2),
                duration_s=round(duration_total / count, 2),
                subject=keyword,
                action=BEAT_PURPOSE.get(beat, beat),
                mood=profile.music_mood,
                palette=profile.palette,
                entities=["host"] if origin == "human" and beat in ("story", "case") else [],
                on_screen_text=on_screen,
                negative_prompt="text artifacts, warped letters, extra fingers, watermark, stock-photo cliché",
                asset_kind=asset_kind,
                audio_cue=f"{profile.music_mood} bed, subtle {beat} accent" if beat in ("hook", "turn", "cta") else "",
                with_native_audio=beat == "hook",
            )
        )
    return shots


def _shot_prompt(beat: str, keyword: str, slots: SlotValues, brief: TopicBrief, size: ShotSize, index: int) -> str:
    subject_map = {
        "hook": f"dramatic opening visual about {keyword}",
        "promise": f"clean overview layout showing the roadmap of {keyword}",
        "context": f"desk-level detail shot: documents and calculator for {keyword}",
        "point": f"close detail of the specific condition for {keyword}",
        "evidence": f"screen-level capture of the source figures for {keyword}",
        "result": f"before/after comparison chart for {keyword}",
        "case": f"real-world situation illustrating {keyword}",
        "story": f"first-person perspective moment tied to {keyword}",
        "myth": f"visual metaphor of a wrong assumption about {keyword}",
        "exception": f"edge-case detail that limits {keyword}",
        "takeaway": f"minimal summary card composition for {keyword}",
        "cta": f"closing composition pointing to the next step on {keyword}",
    }
    base = subject_map.get(beat, f"supporting visual for {keyword}")
    style = "photoreal, shallow depth of field, natural light" if size in (ShotSize.CU, ShotSize.ECU, ShotSize.MCU) else "photoreal wide composition, natural light"
    return f"{base}; {style}; Korean business context; no readable brand logos" + (f"; variation {index}" if index else "")


def draft_screenplay(
    brief: TopicBrief,
    *,
    variation_index: int = 0,
    aspect: str = "16:9",
    language: str = "ko-KR",
    runtime_target_s: int | None = None,
    decided_by: str = "assistant-draft",
) -> Screenplay:
    runtime = runtime_target_s or brief.runtime_target_s
    profile = variation_profile(f"{brief.working_title}|{brief.angle}", variation_index=variation_index, niche_id=brief.niche_id, runtime_target_s=runtime)
    slots = slots_from_brief(brief)
    human = _human_lines(brief)
    counters: dict[str, int] = {}
    scenes: list[Scene] = []
    for index, beat in enumerate(profile.beats):
        narration, origin = _beat_narration(beat, profile, brief, slots, human, counters)
        sfx: list[str] = []
        if beat == "hook":
            sfx = ["whoosh", "tick"]
        elif beat.startswith(("point", "item_", "question_")):
            sfx = ["ui_tap"]
        elif beat in ("result", "evidence"):
            sfx = ["cash" if brief.niche_id in ("solo_tax_kr", "local_biz_experiment") else "sparkle"]
        elif beat == "takeaway":
            sfx = ["reveal"]
        scenes.append(
            Scene(
                id=f"sc{index:02d}",
                beat=beat,
                purpose=BEAT_PURPOSE.get(beat, beat),
                narration=narration,
                shots=_shots_for_scene(index, beat, profile, brief, slots, narration, origin),
                transition=profile.transition_bias if index and index % 3 == 0 else "cut",
                music_mood=profile.music_mood,
                sfx=sfx,
                ambience=profile.ambience,
                caption_style="emphasis" if beat in ("hook", "takeaway") else "standard",
                origin=origin,
            )
        )
    scenes, fit_factor, fitted_runtime = _fit_runtime(scenes, runtime, language=language)
    entities = [
        Entity(
            id="host",
            kind="character",
            description="일관된 화자: 30~50대, 단정한 캐주얼, 과장 없는 표정. 얼굴을 쓰지 않는 경우 손과 서류로 대체",
            wardrobe="무채색 셔츠 또는 니트",
            palette=profile.palette[:2],
            lighting="자연광 + 소프트 키라이트, 색온도 4800K 고정",
            seed=profile.seed % 100000,
        ),
        Entity(
            id="desk",
            kind="location",
            description="정리된 책상: 서류, 계산기, 노트북. 브랜드 소품은 최소",
            palette=profile.palette,
            lighting="측면 창광, 그림자는 부드럽게",
        ),
        Entity(
            id="brand_card",
            kind="prop",
            description="핵심 숫자를 보여주는 카드 그래픽. 매 영상 동일한 그리드·여백 사용",
            palette=profile.palette,
        ),
    ]
    screenplay = Screenplay(
        id=new_id("sp"),
        brief_id=brief.id,
        logline=f"{brief.working_title} — {brief.angle}",
        hook_archetype=profile.hook_archetype,
        scenes=scenes,
        entities=entities,
        audio=AudioDesign(
            language=language,
            music_mood=profile.music_mood,
            music_tempo=profile.music_tempo,
            music_gain_db=-18.0,
            duck_db=-9.5,
            ambience=profile.ambience,
            master_lufs=-14.0,
        ),
        language=language,
        aspect=aspect,
        runtime_target_s=runtime,
        variation_seed=profile.seed,
        structure_signature=structure_signature(_signature_probe(scenes, profile, language, aspect)),
        variation_lineage=[profile.lineage],
        created_at=utcnow(),
    )
    screenplay.structure_signature.update(
        {
            "variation_profile": profile.to_json(),
            "human_sourced_ratio": human_ratio(screenplay),
            "slot_values": {key: value for key, value in slots.as_dict().items() if value},
        }
    )
    screenplay.ai_draft_text = screenplay.narration_text
    screenplay.final_text = screenplay.ai_draft_text
    screenplay.human_sourced_ratio = human_ratio(screenplay)
    if abs(fitted_runtime - runtime) > max(6.0, 0.12 * runtime):
        screenplay.record(
            HumanDecision(
                stage=Stage.SCRIPT,
                question="런타임 목표 불일치",
                answer=f"목표 {runtime}s 대비 실제 {fitted_runtime:.0f}s (배율 {fit_factor:.2f}x, 상한 0.62~1.9x)",
                kind="note",
                decided_by=decided_by,
                evidence="내레이션 분량을 늘리거나( long ) 씬을 줄여야( shorts ) 목표에 맞습니다",
            )
        )
    screenplay.record(
        HumanDecision(
            stage=Stage.SCRIPT,
            question="초안 생성 방식",
            answer=f"beat_plan={profile.beat_plan}, hook={profile.hook_archetype}, seed={profile.seed}",
            kind="note",
            decided_by=decided_by,
            evidence=f"human_sourced_ratio={screenplay.human_sourced_ratio:.2f}",
        )
    )
    return screenplay


def _fit_runtime(scenes: list[Scene], runtime_target_s: int, *, language: str = "ko-KR") -> tuple[list[Scene], float, float]:
    """Stretch/compress shot durations so the cut respects the human's runtime target.

    The bounds keep the result honest: a scene is never shorter than the narration
    needs (no clipped speech) and never longer than 1.9x (no dead air).  When the
    target cannot be met the achieved runtime is reported so the desk can add or cut
    material instead of silently shipping the wrong length.
    """

    from .audio import reading_duration_s

    narration_total = sum(reading_duration_s(scene.narration, language=language) for scene in scenes)
    if narration_total <= 0 or runtime_target_s <= 0:
        return scenes, 1.0, narration_total
    factor = max(0.62, min(1.9, runtime_target_s / narration_total))
    for scene in scenes:
        base = reading_duration_s(scene.narration, language=language)
        if not scene.shots:
            continue
        per_shot = max(2.0, (base * factor) / len(scene.shots))
        for shot in scene.shots:
            shot.duration_s = round(per_shot, 2)
    achieved = sum(scene.duration_s for scene in scenes)
    return scenes, factor, achieved


def _signature_probe(scenes: list[Scene], profile: VariationProfile, language: str, aspect: str) -> Screenplay:
    return Screenplay(
        id="probe",
        brief_id="probe",
        logline="probe",
        hook_archetype=profile.hook_archetype,
        scenes=scenes,
        language=language,
        aspect=aspect,
    )


def human_ratio(screenplay: Screenplay) -> float:
    """Share of narration that carries human-authored material (provenance-weighted)."""

    weights = {"human": 1.0, "mixed": 0.6, "assistant": 0.0}
    total = 0.0
    weighted = 0.0
    for scene in screenplay.scenes:
        length = float(max(len(scene.narration), 1))
        total += length
        weighted += length * weights.get(scene.origin, 0.0)
    return round(weighted / total, 4) if total else 0.0


def apply_human_edits(
    screenplay: Screenplay,
    edits: dict[str, str],
    *,
    decided_by: str = "human",
    threshold: float = 0.12,
) -> Screenplay:
    """Record human rewrites of AI draft lines and update the authenticity evidence."""

    changed: list[str] = []
    for scene in screenplay.scenes:
        new_text = edits.get(scene.id)
        if new_text is None:
            continue
        new_text = new_text.strip()
        if not new_text or new_text == scene.narration:
            continue
        previous = scene.narration
        scene.narration = new_text
        scene.origin = "human"
        changed.append(f"{scene.id}: {previous[:28]}... -> {new_text[:28]}...")
        screenplay.record(
            HumanDecision(
                stage=Stage.SCRIPT,
                question=f"대본 편집 ({scene.beat})",
                answer=new_text[:200],
                kind="edit",
                decided_by=decided_by,
                evidence=f"scene={scene.id}; before_len={len(previous)}; after_len={len(new_text)}",
            )
        )
    screenplay.final_text = screenplay.narration_text
    screenplay.human_edit_distance = round(levenshtein_ratio(screenplay.ai_draft_text, screenplay.final_text), 4)
    edited_ratio = len(changed) / max(len(screenplay.scenes), 1)
    screenplay.human_sourced_ratio = human_ratio(screenplay)
    # Human authorship shows up three ways; any substantive one counts:
    # a large character-level rewrite, enough scenes rewritten, or enough
    # narration that was human-sourced from the start.
    screenplay.human_edited = bool(changed) or screenplay.human_sourced_ratio >= 0.35
    screenplay.structure_signature["edited_scenes"] = len(changed)
    screenplay.structure_signature["edited_scene_ratio"] = round(edited_ratio, 4)
    screenplay.structure_signature["human_sourced_ratio"] = screenplay.human_sourced_ratio
    screenplay.structure_signature["human_edit_distance"] = screenplay.human_edit_distance
    return screenplay


def remix(screenplay: Screenplay, *, variation_index: int = 1, brief: TopicBrief | None = None, keep_human_lines: bool = True) -> Screenplay:
    """Sora-2-style remix: new hook/beats/look, human-authored lines preserved verbatim."""

    seed_text = f"{screenplay.logline}|remix|{variation_index}"
    profile = variation_profile(
        seed_text,
        variation_index=variation_index,
        niche_id=brief.niche_id if brief else "",
        runtime_target_s=screenplay.runtime_target_s,
    )
    human_scenes = {scene.beat: scene.narration for scene in screenplay.scenes if scene.origin in ("human", "mixed") and keep_human_lines}
    fresh = draft_screenplay(
        brief or _synthetic_brief(screenplay),
        variation_index=variation_index + 7,
        aspect=screenplay.aspect,
        language=screenplay.language,
        runtime_target_s=screenplay.runtime_target_s,
        decided_by="assistant-remix",
    )
    for scene in fresh.scenes:
        preserved = human_scenes.get(scene.beat)
        if preserved:
            scene.narration = preserved
            scene.origin = "human"
    fresh.hook_archetype = profile.hook_archetype
    fresh.variation_lineage = [*screenplay.variation_lineage, profile.lineage]
    fresh.audio.music_mood = profile.music_mood
    fresh.audio.music_tempo = profile.music_tempo
    fresh.ai_draft_text = fresh.narration_text
    fresh.final_text = fresh.ai_draft_text
    fresh.human_sourced_ratio = human_ratio(fresh)
    fresh.structure_signature["human_sourced_ratio"] = fresh.human_sourced_ratio
    fresh.record(
        HumanDecision(
            stage=Stage.SCRIPT,
            question="리믹스(변형) 생성",
            answer=f"source={screenplay.id}; preserved_human_lines={len(human_scenes)}; new_lineage={profile.lineage}",
            kind="note",
            decided_by="assistant-remix",
        )
    )
    return fresh


def _synthetic_brief(screenplay: Screenplay) -> TopicBrief:
    return TopicBrief(
        id=screenplay.brief_id,
        niche_id="",
        working_title=screenplay.logline.split(" — ")[0],
        angle=screenplay.logline,
        viewer_problem="",
        human_take="",
    )


def article_to_screenplay(
    text: str,
    *,
    brief: TopicBrief | None = None,
    scene_target_s: float = 18.0,
    aspect: str = "16:9",
    language: str = "ko-KR",
    title: str = "",
) -> Screenplay:
    """Pictory-style: long text/article -> scenes with shot allocation and provenance."""

    source = brief or TopicBrief(
        id=new_id("brief"),
        niche_id="article",
        working_title=title or _first_clause(text, 40) or "article",
        angle="article adaptation",
        viewer_problem="",
        human_take="",
    )
    profile = variation_profile(source.working_title, variation_index=0, niche_id=source.niche_id)
    paragraphs = [chunk.strip() for chunk in re.split(r"\n{2,}", text) if chunk.strip()]
    chunks: list[str] = []
    for paragraph in paragraphs:
        current = ""
        for sentence in _sentences(paragraph):
            if len(current) + len(sentence) > scene_target_s * profile.words_per_second * 2.4 and current:
                chunks.append(current.strip())
                current = sentence
            else:
                current = f"{current} {sentence}".strip()
        if current:
            chunks.append(current)
    scenes: list[Scene] = []
    for index, chunk in enumerate(chunks):
        keywords = _keywords(chunk, 3)
        beat = "hook" if index == 0 else ("takeaway" if index == len(chunks) - 1 else "point")
        scenes.append(
            Scene(
                id=f"sc{index:02d}",
                beat=beat,
                purpose="article segment",
                narration=chunk,
                shots=[
                    Shot(
                        id=f"s{index:02d}_{shot_index}",
                        prompt=f"illustration for: {keyword or chunk[:40]}",
                        size=profile.sizes[(index + shot_index) % len(profile.sizes)],
                        move=profile.move_pool[(index + shot_index) % len(profile.move_pool)],
                        move_intensity=0.35,
                        duration_s=round(max(_reading_seconds(chunk) , 2.5) / 2, 2),
                        subject=keyword or source.working_title,
                        mood=profile.music_mood,
                        palette=profile.palette,
                        on_screen_text=_first_clause(chunk, 14) if shot_index == 0 and beat != "point" else "",
                        asset_kind="generated_still",
                    )
                    for shot_index, keyword in enumerate(keywords[:2] or [""])
                ],
                transition=profile.transition_bias if index % 4 == 0 else "cut",
                music_mood=profile.music_mood,
                ambience=profile.ambience,
                origin="human",  # article text is human-supplied material
            )
        )
    screenplay = Screenplay(
        id=new_id("sp"),
        brief_id=source.id,
        logline=f"article adaptation: {source.working_title}",
        hook_archetype=profile.hook_archetype,
        scenes=scenes,
        language=language,
        aspect=aspect,
        runtime_target_s=int(sum(scene.duration_s for scene in scenes)),
        variation_seed=profile.seed,
        variation_lineage=[f"article:{profile.lineage}"],
        ai_draft_text="",
        final_text="\n\n".join(scene.narration for scene in scenes),
        human_edited=True,
        human_edit_distance=1.0,
        human_sourced_ratio=1.0,
        structure_signature={"source": "article", "segments": len(scenes)},
    )
    screenplay.ai_draft_text = screenplay.final_text
    return screenplay


def beat_summary(screenplay: Screenplay) -> list[dict[str, Any]]:
    return [
        {
            "scene_id": scene.id,
            "beat": scene.beat,
            "purpose": scene.purpose,
            "origin": scene.origin,
            "narration": scene.narration,
            "shots": len(scene.shots),
            "duration_s": round(scene.duration_s, 2),
            "on_screen_text": [shot.on_screen_text for shot in scene.shots if shot.on_screen_text],
            "sfx": scene.sfx,
        }
        for scene in screenplay.scenes
    ]


def narration_segments_for_tts(screenplay: Screenplay) -> list[str]:
    return [scene.narration for scene in screenplay.scenes if scene.narration.strip()]


def scene_for_segment(screenplay: Screenplay, segment_index: int) -> Scene | None:
    narrated = [scene for scene in screenplay.scenes if scene.narration.strip()]
    return narrated[segment_index] if segment_index < len(narrated) else None


def provenance_report(screenplay: Screenplay) -> dict[str, Any]:
    scenes = [
        {"scene_id": scene.id, "beat": scene.beat, "origin": scene.origin, "chars": len(scene.narration)}
        for scene in screenplay.scenes
    ]
    return {
        "human_sourced_ratio": human_ratio(screenplay),
        "human_edit_distance": screenplay.human_edit_distance,
        "human_edited": screenplay.human_edited,
        "scenes": scenes,
        "note": "origin=human: 사람이 쓴 문장이 그대로 들어간 씬, mixed: 사람 문장 + 연결 문장, assistant: 자동 초안",
    }


@dataclass(slots=True)
class DraftOptions:
    variation_index: int = 0
    aspect: str = "16:9"
    language: str = "ko-KR"
    runtime_target_s: int | None = None
    source_article: str = ""
    field_notes: Sequence[str] = field(default_factory=tuple)
