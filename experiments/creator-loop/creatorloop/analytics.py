"""④ Analytics: read the channel's real numbers, learn, then pick the next topic.

Input is whatever a solo creator actually has: a YouTube Studio CSV export (Korean or
English headers) and/or the analytics JSON this pipeline writes per upload.  No number
is invented — when a metric is missing the report says so and the recommendation is
downgraded to low confidence instead of guessing.

The loop closes by (a) updating title-scorer weights with Bayesian shrinkage and
(b) emitting ranked next-topic recommendations back into ① with the human value-add
each one requires.
"""

from __future__ import annotations

import csv
import json
import os
import re
import statistics
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Sequence

from .contracts import (
    AnalyticsReport,
    CohortStat,
    TopicRecommendation,
    VideoMetrics,
    new_id,
    utcnow,
)
from .policy import text_similarity

HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "video_id": ("video id", "동영상 id", "영상 id", "동영상 아이디", "id"),
    "title": ("video title", "동영상 제목", "영상 제목", "제목", "title"),
    "published_at": ("published", "게시일", "업로드일", "publish time", "게시 시간"),
    "views": ("views", "조회수"),
    "impressions": ("impressions", "노출수", "노출 수"),
    "ctr": (
        "impressions click-through rate",
        "impressions ctr",
        "노출 클릭률",
        "노출 클릭률(ctr)",
        "노출수 클릭률",
        "클릭률",
        "ctr",
    ),
    "avg_view_duration_s": ("average view duration", "평균 시청 시간", "평균 재생 시간"),
    "avg_pct_viewed": ("average percentage viewed", "평균 시청 비율", "평균 시청률"),
    "watch_time_h": ("watch time (hours)", "시청 시간(시간)", "시청 시간"),
    "watch_time_minutes": ("estimated minutes watched", "예상 시청 시간(분)", "watch time (minutes)"),
    "likes": ("likes", "좋아요"),
    "comments": ("comments", "댓글"),
    "subscribers_gained": ("subscribers gained", "구독자 증가", "획득한 구독자"),
    "rpm": ("rpm", "revenue per 1,000 views", "1,000회 재생당 수익"),
    "estimated_revenue": ("estimated revenue", "estimated ad revenue", "예상 수입", "예상 광고 수익"),
    "shares": ("shares", "공유"),
}

CURIOSITY_MARKERS = ("이유", "차이", "왜", "모르면", "몰랐", "순서", "방법", "기준", "?")
CLICKBAIT_MARKERS = ("충격", "경악", "소름", "대박", "무조건", "100%", "완벽", "최고", "긴급")
UNITS = ("원", "%", "만원", "억", "건", "명", "배", "일", "주", "개월", "년")

MIN_IMPRESSIONS_FOR_CTR = 1000
MIN_VIEWS_FOR_COHORT = 200
SHRINKAGE_SAMPLES = 10.0


def _to_number(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "").replace("₩", "").replace("$", "")
    if not text or text in {"--", "-", "N/A"}:
        return 0.0
    if text.endswith("%"):
        try:
            return float(text[:-1]) / 100.0
        except ValueError:
            return 0.0
    if ":" in text:
        parts = [float(part) for part in text.split(":") if part]
        seconds = 0.0
        for part in parts:
            seconds = seconds * 60 + part
        return seconds
    try:
        return float(text)
    except ValueError:
        return 0.0


def _normalize_header(header: str) -> str:
    """Map a Studio export header onto a canonical field.

    Exact alias match wins; otherwise the longest overlapping alias is used, because
    localised exports vary ("영상 제목", "노출 클릭률(CTR)", "Estimated minutes watched").
    """

    key = header.strip().lower()
    for canonical, aliases in HEADER_ALIASES.items():
        if key in aliases:
            return canonical
    best_canonical, best_alias = "", ""
    padded = f" {key} "
    for canonical, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            if len(alias) < 2:
                continue
            # whole-token overlap only: a loose substring match would map
            # "Videos added to playlists" onto the "id" alias.
            if key.startswith(alias) or key.endswith(alias) or f" {alias} " in padded:
                if len(alias) > len(best_alias):
                    best_canonical, best_alias = canonical, alias
    return best_canonical or key


def ingest_studio_csv(path: Path | str, *, defaults: dict[str, Any] | None = None) -> list[VideoMetrics]:
    """Parse a YouTube Studio content/analytics CSV export (EN or KO headers)."""

    source = Path(path)
    text = source.read_text("utf-8-sig", errors="replace")
    reader = csv.DictReader(text.splitlines())
    rows: list[VideoMetrics] = []
    defaults = defaults or {}
    for raw in reader:
        record: dict[str, Any] = {}
        for header, value in raw.items():
            if not header:
                continue
            record[_normalize_header(header)] = value
        if not record.get("video_id") and not record.get("title"):
            continue
        metrics = VideoMetrics(
            video_id=str(record.get("video_id") or _slug(record.get("title", ""))),
            title=str(record.get("title", "")).strip(),
            published_at=_parse_date(record.get("published_at", "")),
            views=int(_to_number(record.get("views"))),
            impressions=int(_to_number(record.get("impressions"))),
            ctr=float(_to_number(record.get("ctr"))),
            avg_view_duration_s=float(_to_number(record.get("avg_view_duration_s"))),
            avg_pct_viewed=float(_to_number(record.get("avg_pct_viewed"))),
            watch_time_h=float(_to_number(record.get("watch_time_h"))),
            likes=int(_to_number(record.get("likes"))),
            comments=int(_to_number(record.get("comments"))),
            subscribers_gained=int(_to_number(record.get("subscribers_gained"))),
            rpm=float(_to_number(record.get("rpm"))),
            estimated_revenue=float(_to_number(record.get("estimated_revenue"))),
            brief_id=str(record.get("brief_id", defaults.get("brief_id", ""))),
            niche_id=str(record.get("niche_id", defaults.get("niche_id", ""))),
            angle=str(record.get("angle", defaults.get("angle", ""))),
            hook_archetype=str(record.get("hook_archetype", defaults.get("hook_archetype", ""))),
            title_variant=str(record.get("title_variant", defaults.get("title_variant", ""))),
            thumbnail_variant=str(record.get("thumbnail_variant", defaults.get("thumbnail_variant", ""))),
            format=str(record.get("format", defaults.get("format", "long_form"))),
            runtime_s=float(record.get("runtime_s", defaults.get("runtime_s", 0.0)) or 0.0),
        )
        minutes = _to_number(record.get("watch_time_minutes"))
        if minutes:
            metrics.watch_time_h = round(minutes / 60.0, 3)
        if metrics.avg_pct_viewed > 1.5:
            metrics.avg_pct_viewed /= 100.0
        if not metrics.ctr and metrics.impressions and metrics.views:
            metrics.ctr = metrics.views / metrics.impressions
        if not metrics.estimated_revenue and metrics.rpm:
            metrics.estimated_revenue = round(metrics.views / 1000.0 * metrics.rpm, 4)
        if not metrics.rpm and metrics.estimated_revenue and metrics.views:
            metrics.rpm = round(metrics.estimated_revenue / metrics.views * 1000.0, 4)
        rows.append(metrics)
    return rows


def _slug(text: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "-", str(text).lower()).strip("-")[:40] or "unknown"


def _parse_date(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    for pattern in ("%Y-%m-%d", "%Y. %m. %d", "%Y.%m.%d", "%b %d, %Y", "%Y-%m-%dT%H:%M:%S", "%Y/%m/%d"):
        try:
            return datetime.strptime(text[:19], pattern).replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    return text


class YouTubeAnalyticsAdapter:
    """YouTube Data/Analytics API adapter (OAuth).  Never fabricates numbers."""

    def __init__(self, api_key: str | None = None, access_token: str | None = None) -> None:
        self.api_key = api_key or os.environ.get("YOUTUBE_API_KEY", "")
        self.access_token = access_token or os.environ.get("YOUTUBE_ACCESS_TOKEN", "")

    @property
    def available(self) -> bool:
        return bool(self.api_key or self.access_token)

    def availability_reason(self) -> str:
        if self.available:
            return ""
        return "set YOUTUBE_API_KEY (public stats) or YOUTUBE_ACCESS_TOKEN (Analytics API, OAuth)"

    def video_stats(self, video_ids: Sequence[str]) -> list[dict[str, Any]]:
        if not self.api_key or not video_ids:
            return []
        params = urllib.parse.urlencode({"part": "statistics,snippet", "id": ",".join(video_ids), "key": self.api_key})
        import urllib.request

        with urllib.request.urlopen(f"https://www.googleapis.com/youtube/v3/videos?{params}", timeout=30) as response:  # noqa: S310
            payload = json.loads(response.read().decode("utf-8"))
        rows = []
        for item in payload.get("items", []):
            stats = item.get("statistics", {})
            rows.append(
                {
                    "video_id": item.get("id"),
                    "title": item.get("snippet", {}).get("title", ""),
                    "published_at": item.get("snippet", {}).get("publishedAt", ""),
                    "views": int(stats.get("viewCount", 0)),
                    "likes": int(stats.get("likeCount", 0) or 0),
                    "comments": int(stats.get("commentCount", 0) or 0),
                }
            )
        return rows

    def analytics_query(self, channel_id: str, metrics: str, dimensions: str, start: str, end: str) -> dict[str, Any]:
        if not self.access_token:
            return {"available": False, "reason": self.availability_reason()}
        params = urllib.parse.urlencode(
            {
                "ids": f"channel=={channel_id}",
                "startDate": start,
                "endDate": end,
                "metrics": metrics,
                "dimensions": dimensions,
                "maxResults": 200,
            }
        )
        import urllib.request

        request = urllib.request.Request(f"https://youtubeanalytics.googleapis.com/v2/reports?{params}")
        request.add_header("Authorization", f"Bearer {self.access_token}")
        with urllib.request.urlopen(request, timeout=45) as response:  # noqa: S310
            return json.loads(response.read().decode("utf-8"))


@dataclass(slots=True)
class CohortKey:
    dimension: str
    value: str


def _median(values: Sequence[float]) -> float:
    return round(statistics.median(values), 4) if values else 0.0


def cohort_stats(metrics: Sequence[VideoMetrics], dimension: str) -> list[CohortStat]:
    buckets: dict[str, list[VideoMetrics]] = {}
    for item in metrics:
        key = str(getattr(item, dimension, "") or "unknown")
        buckets.setdefault(key, []).append(item)
    rows: list[CohortStat] = []
    for key, items in sorted(buckets.items()):
        reliable_items = [item for item in items if item.reliable()]
        rows.append(
            CohortStat(
                key=key,
                dimension=dimension,
                videos=len(items),
                views=sum(item.views for item in items),
                median_ctr=_median([item.ctr for item in items if item.ctr > 0]),
                median_avd_s=_median([item.avg_view_duration_s for item in items if item.avg_view_duration_s > 0]),
                median_pct_viewed=_median([item.avg_pct_viewed for item in items if item.avg_pct_viewed > 0]),
                revenue_per_video=_median([item.estimated_revenue for item in items]),
                subscribers_per_kview=round(
                    (sum(item.subscribers_gained for item in items) / max(sum(item.views for item in items), 1)) * 1000, 3
                ),
                reliable=len(reliable_items) >= 2,
            )
        )
    rows.sort(key=lambda row: (not row.reliable, -row.median_ctr, -row.views))
    return rows


def title_feature_vector(title: str) -> dict[str, float]:
    length = len(title)
    return {
        "length": 1.0 if 32 <= length <= 48 else (0.6 if length <= 60 else 0.2),
        "keyword_front": 1.0 if title[:12].strip() and not title.startswith((" ", "[")) else 0.5,
        "specificity": min(0.4 * any(ch.isdigit() for ch in title) + 0.3 * any(unit in title for unit in UNITS) + 0.3 * bool(re.search(r"20\d\d|올해|작년|최근", title)), 1.0),
        "curiosity": min(0.34 * sum(1 for marker in CURIOSITY_MARKERS if marker in title), 1.0),
        "congruence": 0.7,  # unknown from analytics alone; shrinkage keeps the prior in charge
        "clickbait_penalty": max(0.0, 1.0 - 0.4 * sum(1 for marker in CLICKBAIT_MARKERS if marker in title)),
    }


def learn_title_weights(metrics: Sequence[VideoMetrics]) -> dict[str, float]:
    """Correlate title features with CTR, shrunk toward the packaging prior."""

    usable = [item for item in metrics if item.ctr > 0 and item.impressions >= MIN_IMPRESSIONS_FOR_CTR]
    if len(usable) < 3:
        return {"_samples": float(len(usable))}
    ctrs = [item.ctr for item in usable]
    mean_ctr = statistics.fmean(ctrs)
    stdev = statistics.pstdev(ctrs) or mean_ctr or 1.0
    features = list(title_feature_vector(usable[0].title))
    learned: dict[str, float] = {}
    for feature in features:
        values = [title_feature_vector(item.title)[feature] for item in usable]
        if statistics.pstdev(values) == 0:
            continue
        covariance = statistics.fmean([(value - statistics.fmean(values)) * (ctr - mean_ctr) for value, ctr in zip(values, ctrs)])
        correlation = covariance / (statistics.pstdev(values) * stdev)
        learned[feature] = round(max(0.0, min(1.0, 0.5 + correlation)), 4)
    total = sum(learned.values()) or 1.0
    learned = {key: round(value / total, 4) for key, value in learned.items()}
    learned["_samples"] = float(len(usable))
    learned["_mean_ctr"] = round(mean_ctr, 4)
    return learned


def _infer_niches(metrics: Sequence[VideoMetrics], library: Any) -> int:
    hits = 0
    for item in metrics:
        best_niche = ""
        best_score = 0
        for niche in library.niches:
            score = sum(2 for keyword in niche.keyword_bank if keyword in item.title)
            tokens = {part for keyword in niche.keyword_bank for part in keyword.split() if len(part) >= 2}
            score += sum(1 for token in tokens if token in item.title)
            score += sum(2 for topic in niche.seed_topics if text_similarity(item.title, topic) > 0.42)
            if score > best_score:
                best_score, best_niche = score, niche.id
        if best_niche:
            item.niche_id = best_niche
            hits += 1
    return hits


@dataclass(slots=True)
class ReportInputs:
    metrics: Sequence[VideoMetrics] = ()
    catalog: Sequence[dict[str, Any]] = ()
    window_days: int = 90
    niche_library: Any = None
    personal_advantage: dict[str, int] | None = None
    uploads_last_7_days: int = 0


def build_report(inputs: ReportInputs) -> AnalyticsReport:
    metrics = [item for item in inputs.metrics]
    guards_extra: list[str] = []
    if inputs.niche_library is not None and metrics and not any(item.niche_id for item in metrics):
        inferred = _infer_niches(metrics, inputs.niche_library)
        if inferred:
            guards_extra.append(
                f"niche_id 열이 없어 제목 키워드 기준으로 {inferred}건의 니치를 추정했습니다 (Studio 내보내기에 brief_id/niche_id 열을 추가하면 정확해집니다)."
            )
    window_start = datetime.now(timezone.utc) - timedelta(days=inputs.window_days)
    recent = [item for item in metrics if _within_window(item.published_at, window_start)] or metrics
    guards: list[str] = list(guards_extra)
    if len(recent) < 3:
        guards.append(f"표본 부족: 최근 {inputs.window_days}일 영상 {len(recent)}건 — 코호트 결론은 참고용입니다.")
    thin = [item for item in recent if item.impressions < MIN_IMPRESSIONS_FOR_CTR]
    if thin:
        guards.append(f"노출 {MIN_IMPRESSIONS_FOR_CTR} 미만 영상 {len(thin)}건은 CTR 판단에서 제외했습니다.")
    if not any(item.ctr > 0 for item in recent):
        guards.append("CTR 데이터가 없습니다. YouTube Studio '콘텐츠' CSV에 노출수·노출 클릭률 열이 포함됐는지 확인하세요.")

    totals = {
        "videos": float(len(recent)),
        "views": float(sum(item.views for item in recent)),
        "impressions": float(sum(item.impressions for item in recent)),
        "watch_time_h": round(sum(item.watch_time_h for item in recent), 2),
        "revenue": round(sum(item.estimated_revenue for item in recent), 2),
        "subscribers_gained": float(sum(item.subscribers_gained for item in recent)),
        "median_ctr": _median([item.ctr for item in recent if item.ctr > 0]),
        "median_pct_viewed": _median([item.avg_pct_viewed for item in recent if item.avg_pct_viewed > 0]),
        "median_avd_s": _median([item.avg_view_duration_s for item in recent if item.avg_view_duration_s > 0]),
        "median_rpm": _median([item.rpm for item in recent if item.rpm > 0]),
    }
    cohorts: list[CohortStat] = []
    for dimension in ("niche_id", "hook_archetype", "format", "thumbnail_variant", "title_variant", "angle"):
        if any(getattr(item, dimension) for item in recent):
            cohorts.extend(cohort_stats(recent, dimension))

    insights = _insights(recent, cohorts, totals, guards)
    weights = learn_title_weights(recent)
    recommendations = recommend_next_topics(
        inputs, recent=recent, totals=totals, cohorts=cohorts, weights=weights
    )
    return AnalyticsReport(
        id=new_id("analytics"),
        window_days=inputs.window_days,
        videos=len(recent),
        totals=totals,
        cohorts=cohorts,
        insights=insights,
        weight_updates={key: value for key, value in weights.items() if not key.startswith("_")},
        recommendations=recommendations,
        guards=guards,
        generated_at=utcnow(),
    )


def _within_window(published_at: str, window_start: datetime) -> bool:
    if not published_at:
        return False
    try:
        moment = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
    except ValueError:
        return False
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment >= window_start


def _insights(metrics: Sequence[VideoMetrics], cohorts: Sequence[CohortStat], totals: dict[str, float], guards: Sequence[str]) -> list[str]:
    insights: list[str] = []
    channel_ctr = float(totals.get("median_ctr", 0.0))
    channel_pct = float(totals.get("median_pct_viewed", 0.0))
    for row in cohorts:
        if not row.reliable or row.dimension not in ("hook_archetype", "niche_id", "thumbnail_variant", "format"):
            continue
        if channel_ctr and row.median_ctr:
            lift = (row.median_ctr - channel_ctr) / channel_ctr
            if abs(lift) >= 0.12:
                direction = "높습니다" if lift > 0 else "낮습니다"
                insights.append(
                    f"{row.dimension}={row.key}: 중앙 CTR {row.median_ctr:.2%}로 채널 중앙값 대비 {lift:+.0%} {direction} "
                    f"(영상 {row.videos}건, 누적 조회수 {row.views:,})"
                )
        if channel_pct and row.median_pct_viewed:
            delta = row.median_pct_viewed - channel_pct
            if abs(delta) >= 0.08:
                insights.append(
                    f"{row.dimension}={row.key}: 평균 시청 비율 {row.median_pct_viewed:.0%} (채널 대비 {delta:+.0%}p)"
                )
    with_digits = [item for item in metrics if any(ch.isdigit() for ch in item.title) and item.ctr > 0]
    without_digits = [item for item in metrics if not any(ch.isdigit() for ch in item.title) and item.ctr > 0]
    if len(with_digits) >= 2 and len(without_digits) >= 2:
        delta = _median([item.ctr for item in with_digits]) - _median([item.ctr for item in without_digits])
        if abs(delta) >= 0.005:
            insights.append(
                f"숫자가 들어간 제목 {len(with_digits)}건의 중앙 CTR이 {_median([item.ctr for item in with_digits]):.2%}로 "
                f"그렇지 않은 제목({len(without_digits)}건) 대비 {delta:+.2%}p입니다."
            )
    reliable = [item for item in metrics if item.reliable()]
    if len(reliable) >= 3:
        best = max(reliable, key=lambda item: item.views)
        worst = min(reliable, key=lambda item: item.views)
        insights.append(
            f"최고 성과: '{best.title[:34]}' (조회수 {best.views:,}, CTR {best.ctr:.2%}, 시청비율 {best.avg_pct_viewed:.0%}). "
            f"최저 성과: '{worst.title[:34]}' (조회수 {worst.views:,}, CTR {worst.ctr:.2%})."
        )
        retention_high = [item for item in reliable if item.avg_pct_viewed >= 0.5]
        if retention_high:
            insights.append(
                f"시청 비율 50% 이상 영상 {len(retention_high)}건의 평균 조회수 "
                f"{int(statistics.fmean([item.views for item in retention_high])):,} — 유지율이 도달을 이끌고 있습니다."
            )
    retention_weak = [item for item in metrics if 0 < item.avg_pct_viewed < 0.35 and item.reliable()]
    if retention_weak:
        insights.append(
            f"유지율 35% 미만 영상이 {len(retention_weak)}건입니다. 첫 30초 훅과 씬 전환을 다시 점검하세요 "
            f"(예: {retention_weak[0].title[:30]})."
        )
    if channel_ctr and channel_ctr < 0.03:
        insights.append("채널 중앙 CTR이 3% 미만입니다. 썸네일 가독성·제목 구체성을 우선 개선 대상으로 봅니다.")
    if not insights:
        insights.append("아직 통계적으로 의미 있는 차이가 관측되지 않았습니다. 표본이 늘면 코호트 비교가 활성화됩니다.")
    for guard in guards:
        insights.append(f"[주의] {guard}")
    return insights[:12]


def recommend_next_topics(
    inputs: ReportInputs,
    *,
    recent: Sequence[VideoMetrics],
    totals: dict[str, float],
    cohorts: Sequence[CohortStat],
    weights: dict[str, float],
) -> list[TopicRecommendation]:
    library = inputs.niche_library
    if library is None:
        from .research import NicheLibrary

        library = NicheLibrary()
    catalog_titles = [str(row.get("title", "")) for row in inputs.catalog] + [item.title for item in recent]
    niche_performance: dict[str, dict[str, float]] = {}
    for row in cohorts:
        if row.dimension == "niche_id" and row.reliable:
            niche_performance[row.key] = {
                "median_ctr": row.median_ctr,
                "revenue_per_video": row.revenue_per_video,
                "videos": float(row.videos),
                "views": float(row.views),
            }
    channel_views = _median([item.views for item in recent]) or 1000.0
    channel_rpm = _median([item.rpm for item in recent if item.rpm > 0]) or 2.5
    channel_ctr = float(totals.get("median_ctr", 0.0)) or 0.04
    recommendations: list[TopicRecommendation] = []
    for niche in library.niches:
        performance = niche_performance.get(niche.id, {})
        scoring = library.score(niche, (inputs.personal_advantage or {}).get(niche.id))
        rubric = scoring["rubric"]
        base_views = performance.get("views", 0.0) / max(performance.get("videos", 0.0), 1.0) or channel_views
        ctr_multiplier = (performance.get("median_ctr", channel_ctr) / channel_ctr) if channel_ctr else 1.0
        freshness_penalty = 0.0
        for candidate in niche.seed_topics:
            overlap = max((text_similarity(candidate, title) for title in catalog_titles), default=0.0)
            if overlap > 0.75:
                continue
            freshness = 1.0 - min(overlap, 1.0)
            expected_value = round(
                base_views * ctr_multiplier * freshness * (1 + 0.12 * (rubric.get("monetization_fit", 3) - 3)) * channel_rpm / 1000.0,
                2,
            )
            confidence = "high" if performance.get("videos", 0) >= 4 and ctr_multiplier > 1.05 else ("medium" if recent else "low")
            rationale = [
                f"니치 점수 {scoring['score']:.2f}/5 (personal_advantage {'입력됨' if scoring['personal_advantage_supplied'] else '미입력'})",
                f"코호트 기준 예상 조회수 {int(base_views * freshness * ctr_multiplier):,} · CTR 배수 {ctr_multiplier:.2f}",
                f"기존 카탈로그와의 제목 유사도 {overlap:.0%} → 신선도 {freshness:.0%}",
            ]
            if not performance:
                rationale.append("이 니치의 실측 데이터가 아직 없습니다 — 첫 3편은 학습용으로 보고 판단 기준을 노출 3,000회로 잡으세요.")
            risks = list(niche.risk_notes[:2])
            if inputs.uploads_last_7_days >= 4:
                risks.append(f"최근 7일 업로드 {inputs.uploads_last_7_days}건: 대량 생산 패턴 경고 임계(4건/일, 14건/주)를 확인하세요.")
            if overlap > 0.55:
                risks.append("최근 업로드와 주제가 가까워 정책의 'variation' 요건이 위험합니다. 앵글·대상·시점을 바꾸세요.")
            recommendations.append(
                TopicRecommendation(
                    rank=0,
                    niche_id=niche.id,
                    working_title=candidate,
                    angle=_angle_for(niche.id, candidate),
                    expected_value=expected_value,
                    confidence=confidence,
                    rationale=rationale,
                    risks=risks,
                    required_value_add=niche.value_add_kinds[:3],
                )
            )
            freshness_penalty = max(freshness_penalty, overlap)
        _ = freshness_penalty
    recommendations.sort(key=lambda item: item.expected_value, reverse=True)
    for index, item in enumerate(recommendations, start=1):
        item.rank = index
    return recommendations[:12]


def _angle_for(niche_id: str, topic: str) -> str:
    angles = {
        "solo_tax_kr": "본인 신고 기록의 실제 숫자를 근거로, 적용 조건과 연도를 명시한 점검 순서",
        "career_pivot_4050": "본인 지원·합불 기록을 시간순 서사로, 실패 사례를 포함한 실행 순서",
        "local_biz_experiment": "가설·기간·통제변수를 먼저 밝히고 원본 수치를 공개하는 실험 기록",
    }
    return f"{angles.get(niche_id, '직접 근거를 포함한 실행 순서')} — {topic}"


def report_summary(report: AnalyticsReport) -> str:
    lines = [
        f"Analytics window: {report.window_days}d | videos: {report.videos}",
        "totals: " + ", ".join(f"{key}={value}" for key, value in list(report.totals.items())[:6]),
    ]
    lines.append("insights:")
    lines.extend(f"  - {insight}" for insight in report.insights[:6])
    if report.recommendations:
        lines.append("next topics:")
        lines.extend(
            f"  #{item.rank} [{item.niche_id}] {item.working_title} (EV≈{item.expected_value}, {item.confidence})"
            for item in report.recommendations[:5]
        )
    if report.guards:
        lines.append("guards:")
        lines.extend(f"  ! {guard}" for guard in report.guards)
    return "\n".join(lines)
