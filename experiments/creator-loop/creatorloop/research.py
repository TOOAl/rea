"""① Niche research desk — the human-owned stage.

The production pipeline is automated; *what to make* is not.  This module gives
the human a scored niche rubric, forces the questions whose answers cannot be
generated (personal advantage, original evidence, differentiation), and turns the
answers into a :class:`~creatorloop.contracts.TopicBrief` plus an append-only
decision log that the authenticity guard later reads as evidence.

Competition/demand signals can optionally come from the YouTube Data API v3.  With
no key the desk still works: signals fall back to the human's own numbers, and the
absence is recorded instead of being silently assumed.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

from .contracts import (
    HumanDecision,
    Stage,
    TopicBrief,
    ValueAddClaim,
    ValueAddKind,
    new_id,
    utcnow,
)
from .policy import text_similarity

PRESET_PATH = Path(__file__).resolve().parent.parent / "data" / "presets" / "niches_ko.json"

# Weights are deliberately biased toward things only a human can supply.
RUBRIC_WEIGHTS: dict[str, float] = {
    "demand": 0.20,
    "competition": 0.16,  # inverted: 5 = very little competition
    "monetization_fit": 0.18,
    "personal_advantage": 0.22,  # inverted-free: only the human can score this
    "production_cost": 0.10,  # inverted: 5 = cheap/fast for one person
    "authenticity_headroom": 0.14,
}
INVERTED = {"competition", "production_cost"}


@dataclass(slots=True)
class Niche:
    id: str
    name: str
    why: str
    audience: str
    viewer_problem: str
    default_rubric: dict[str, int]
    human_angle_questions: list[str]
    seed_topics: list[str]
    keyword_bank: list[str]
    differentiation_requirements: list[str]
    value_add_kinds: list[str]
    formats: list[str]
    risk_notes: list[str]
    monetization_notes: str
    personal_advantage_prompt: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Niche":
        return cls(
            id=data["id"],
            name=data["name"],
            why=data.get("why", ""),
            audience=data.get("audience", ""),
            viewer_problem=data.get("viewer_problem", ""),
            default_rubric=dict(data.get("default_rubric", {})),
            human_angle_questions=list(data.get("human_angle_questions", [])),
            seed_topics=list(data.get("seed_topics", [])),
            keyword_bank=list(data.get("keyword_bank", [])),
            differentiation_requirements=list(data.get("differentiation_requirements", [])),
            value_add_kinds=list(data.get("value_add_kinds", [])),
            formats=list(data.get("formats", ["long_form"])),
            risk_notes=list(data.get("risk_notes", [])),
            monetization_notes=data.get("monetization_notes", ""),
            personal_advantage_prompt=data.get("personal_advantage_prompt", ""),
        )


class NicheLibrary:
    def __init__(self, path: Path | str = PRESET_PATH) -> None:
        self.path = Path(path)
        payload = json.loads(self.path.read_text("utf-8"))
        self.language: str = payload.get("language", "ko-KR")
        self.niches: list[Niche] = [Niche.from_dict(item) for item in payload.get("niches", [])]

    def get(self, niche_id: str) -> Niche | None:
        return next((n for n in self.niches if n.id == niche_id), None)

    def ids(self) -> list[str]:
        return [n.id for n in self.niches]

    def score(self, niche: Niche, personal_advantage: int | None = None, overrides: dict[str, int] | None = None) -> dict[str, Any]:
        rubric = dict(niche.default_rubric)
        rubric.update(overrides or {})
        if personal_advantage is not None:
            rubric["personal_advantage"] = max(1, min(5, int(personal_advantage)))
        total = 0.0
        breakdown: dict[str, float] = {}
        for key, weight in RUBRIC_WEIGHTS.items():
            value = float(rubric.get(key, 3))
            effective = 6.0 - value if key in INVERTED else value
            contribution = (effective / 5.0) * weight * 5.0
            breakdown[key] = round(contribution, 3)
            total += contribution
        capped = personal_advantage is None
        return {
            "niche_id": niche.id,
            "score": round(total, 3),
            "max_score": round(sum(RUBRIC_WEIGHTS.values()) * 5.0, 3),
            "breakdown": breakdown,
            "rubric": rubric,
            "personal_advantage_supplied": not capped,
            "note": (
                "personal_advantage 미입력: 점수는 참고용이며, 이 값은 사람만 채울 수 있습니다."
                if capped
                else ""
            ),
        }

    def ranked(self, personal_advantage: dict[str, int] | None = None) -> list[dict[str, Any]]:
        rows = [self.score(n, (personal_advantage or {}).get(n.id)) for n in self.niches]
        return sorted(rows, key=lambda r: r["score"], reverse=True)


class BriefBuilder:
    """Turns human answers into a TopicBrief with recorded decisions."""

    def __init__(self, library: NicheLibrary | None = None) -> None:
        self.library = library or NicheLibrary()

    def questions(self, niche_id: str) -> list[str]:
        niche = self.library.get(niche_id)
        if not niche:
            return []
        return [niche.personal_advantage_prompt, *niche.human_angle_questions]

    def build(
        self,
        niche_id: str,
        working_title: str,
        answers: dict[str, str] | None = None,
        *,
        angle: str = "",
        viewer_problem: str = "",
        keywords: Sequence[str] = (),
        value_adds: Sequence[tuple[str, str]] = (),
        sources: Sequence[str] = (),
        video_format: str = "long_form",
        runtime_target_s: int = 300,
        personal_advantage: int | None = None,
        decided_by: str = "human",
        format_override: str = "",
    ) -> TopicBrief:
        niche = self.library.get(niche_id)
        if niche is None:
            raise ValueError(f"unknown niche: {niche_id} (available: {self.library.ids()})")
        answers = dict(answers or {})
        resolved_angle = angle or answers.get("angle") or self.suggest_angle(niche, answers)
        claims = [
            ValueAddClaim(kind=ValueAddKind(kind), evidence=evidence, verified=True)
            for kind, evidence in value_adds
            if kind in {k.value for k in ValueAddKind} and evidence.strip()
        ]
        if not claims:
            claims = [
                ValueAddClaim(kind=ValueAddKind(kind), evidence=answers.get(kind, ""), verified=False)
                for kind in niche.value_add_kinds
                if answers.get(kind, "").strip()
            ]
        brief = TopicBrief(
            id=new_id("brief"),
            niche_id=niche_id,
            working_title=working_title.strip(),
            angle=resolved_angle,
            viewer_problem=viewer_problem or niche.viewer_problem,
            human_take=answers.get("human_take", "") or answers.get("angle", ""),
            target_audience=niche.audience,
            keywords=[k.strip() for k in keywords if k.strip()] or niche.keyword_bank[:6],
            differentiation=answers.get("differentiation", "") or " / ".join(niche.differentiation_requirements[:2]),
            value_add_claims=claims,
            sources=[str(s) for s in sources],
            format=format_override or video_format,
            runtime_target_s=int(runtime_target_s),
            created_at=utcnow(),
        )
        scoring = self.library.score(niche, personal_advantage)
        brief.niche_score = float(scoring["score"])
        brief.record(
            HumanDecision(
                stage=Stage.RESEARCH,
                question=f"니치 선택: {niche.name}",
                answer=niche_id,
                kind="choice",
                decided_by=decided_by,
                evidence=f"niche_score={scoring['score']}",
            )
        )
        if personal_advantage is not None:
            brief.record(
                HumanDecision(
                    stage=Stage.RESEARCH,
                    question=niche.personal_advantage_prompt,
                    answer=str(personal_advantage),
                    kind="choice",
                    decided_by=decided_by,
                )
            )
        for question, answer in answers.items():
            if not str(answer).strip():
                continue
            brief.record(
                HumanDecision(
                    stage=Stage.RESEARCH,
                    question=question,
                    answer=str(answer),
                    kind="note" if len(str(answer)) > 40 else "choice",
                    decided_by=decided_by,
                )
            )
        brief.record(
            HumanDecision(
                stage=Stage.RESEARCH,
                question="작업 제목 확정",
                answer=brief.working_title,
                kind="choice",
                decided_by=decided_by,
            )
        )
        return brief

    def suggest_angle(self, niche: Niche, answers: dict[str, str] | None = None) -> str:
        answers = answers or {}
        seed = answers.get("human_take") or answers.get("experience") or niche.seed_topics[0]
        requirement = niche.differentiation_requirements[0] if niche.differentiation_requirements else ""
        return f"{seed} — {requirement}".strip(" —")

    def seed_topic_options(self, niche_id: str, catalog_titles: Sequence[str] = ()) -> list[dict[str, Any]]:
        """Seed topics ranked by distance from what the channel already published."""

        niche = self.library.get(niche_id)
        if not niche:
            return []
        scored: list[dict[str, Any]] = []
        for topic in niche.seed_topics:
            closest = max((text_similarity(topic, t) for t in catalog_titles), default=0.0)
            scored.append(
                {
                    "topic": topic,
                    "overlap_with_catalog": round(closest, 3),
                    "freshness": round(1.0 - closest, 3),
                    "keywords": [k for k in niche.keyword_bank if any(part in k or k in topic for part in topic.split())][:4],
                }
            )
        return sorted(scored, key=lambda row: row["freshness"], reverse=True)

    def gap_check(self, brief: TopicBrief, catalog: Sequence[dict[str, Any]]) -> dict[str, Any]:
        """How different is this project from the channel's recent uploads?"""

        rows: list[dict[str, Any]] = []
        for entry in catalog[-12:]:
            title = entry.get("title", "")
            narration = entry.get("narration_text", "")
            rows.append(
                {
                    "video_id": entry.get("video_id", "?"),
                    "title": title,
                    "title_similarity": round(text_similarity(brief.working_title, title), 3),
                    "angle_similarity": round(text_similarity(brief.angle, entry.get("angle", "")), 3),
                    "narration_similarity": round(text_similarity(brief.human_take, narration), 3),
                }
            )
        worst = max(rows, key=lambda r: r["title_similarity"], default=None)
        return {
            "compared": len(rows),
            "nearest": worst,
            "distinct": bool(worst is None or worst["title_similarity"] < 0.62),
            "advice": (
                "기존 영상과 충분히 다릅니다."
                if not worst or worst["title_similarity"] < 0.62
                else "제목·앵글이 기존 업로드와 겹칩니다. 대상/숫자/시점을 바꿔 다시 잡으세요."
            ),
        }


class DemandSignals:
    """Optional YouTube Data API v3 signals.  Never fabricates numbers."""

    endpoint = "https://www.googleapis.com/youtube/v3/search"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.environ.get("YOUTUBE_API_KEY", "")

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def search(self, query: str, max_results: int = 25, order: str = "relevance") -> dict[str, Any]:
        if not self.available:
            return {
                "available": False,
                "query": query,
                "reason": "YOUTUBE_API_KEY not set",
                "fallback": "human judgement required; competition score stays rubric-based",
            }
        params = urllib.parse.urlencode(
            {
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": max_results,
                "order": order,
                "relevanceLanguage": "ko",
                "regionCode": "KR",
                "key": self.api_key,
            }
        )
        with urllib.request.urlopen(f"{self.endpoint}?{params}", timeout=20) as response:  # noqa: S310
            payload = json.loads(response.read().decode("utf-8"))
        items = payload.get("items", [])
        return {
            "available": True,
            "query": query,
            "results": len(items),
            "titles": [item.get("snippet", {}).get("title", "") for item in items],
            "channel_titles": sorted({item.get("snippet", {}).get("channelTitle", "") for item in items}),
            "note": "view counts require videos.list; call video_stats() with the returned ids",
        }

    def video_stats(self, video_ids: Sequence[str]) -> dict[str, Any]:
        if not self.available or not video_ids:
            return {"available": False, "reason": "no key or no ids"}
        params = urllib.parse.urlencode(
            {"part": "statistics,snippet", "id": ",".join(video_ids), "key": self.api_key}
        )
        with urllib.request.urlopen(  # noqa: S310
            f"https://www.googleapis.com/youtube/v3/videos?{params}", timeout=20
        ) as response:
            payload = json.loads(response.read().decode("utf-8"))
        rows = []
        for item in payload.get("items", []):
            stats = item.get("statistics", {})
            rows.append(
                {
                    "video_id": item.get("id"),
                    "title": item.get("snippet", {}).get("title", ""),
                    "views": int(stats.get("viewCount", 0)),
                    "likes": int(stats.get("likeCount", 0) or 0),
                    "comments": int(stats.get("commentCount", 0) or 0),
                }
            )
        views = [row["views"] for row in rows] or [0]
        return {
            "available": True,
            "videos": rows,
            "median_views": sorted(views)[len(views) // 2],
            "competition_hint": "low" if sorted(views)[len(views) // 2] < 20_000 else "medium",
        }


def research_report(library: NicheLibrary, personal_advantage: dict[str, int] | None = None) -> dict[str, Any]:
    return {
        "language": library.language,
        "weights": RUBRIC_WEIGHTS,
        "ranked_niches": library.ranked(personal_advantage),
        "niches": [
            {
                "id": niche.id,
                "name": niche.name,
                "why": niche.why,
                "audience": niche.audience,
                "seed_topics": niche.seed_topics,
                "risk_notes": niche.risk_notes,
                "monetization_notes": niche.monetization_notes,
                "human_angle_questions": [niche.personal_advantage_prompt, *niche.human_angle_questions],
            }
            for niche in library.niches
        ],
        "generated_at": utcnow(),
    }
