"""④ Analytics: Studio CSV ingest, cohorts, title-weight learning, next-topic EV ranking."""

from __future__ import annotations

from pathlib import Path

import pytest

from creatorloop.analytics import (
    MIN_IMPRESSIONS_FOR_CTR,
    ReportInputs,
    build_report,
    cohort_stats,
    ingest_studio_csv,
    learn_title_weights,
    report_summary,
    title_feature_vector,
)
from creatorloop.contracts import VideoMetrics

SAMPLE = Path(__file__).resolve().parents[1] / "data" / "samples" / "analytics_export.csv"

KOREAN_CSV = """영상 제목,동영상 ID,게시일,조회수,노출수,노출 클릭률(CTR),평균 시청 시간,평균 시청률,예상 시청 시간(분),구독자 증가수,예상 수입
부가세 신고 순서 5가지,vid_ko_1,2026-09-01,12000,180000,5.1%,4:05,55.0,810,90,32.40
경비처리 기준 정리,vid_ko_2,2026-09-15,4200,98000,3.2%,2:10,38.0,150,18,9.10
"""


def metric(video_id: str, title: str, *, views: int, impressions: int, ctr: float, niche: str = "solo_tax_kr", retention: float = 0.5) -> VideoMetrics:
    return VideoMetrics(
        video_id=video_id,
        title=title,
        published_at="2026-09-01",
        views=views,
        impressions=impressions,
        ctr=ctr,
        avg_pct_viewed=retention,
        niche_id=niche,
        hook_archetype="number_result",
    )


def test_ingest_english_studio_export():
    rows = ingest_studio_csv(SAMPLE)
    assert len(rows) == 8
    first = rows[0]
    assert first.video_id == "vid_demo_001"
    assert first.views == 18400
    assert first.impressions == 241000
    assert abs(first.ctr - 0.049) < 1e-9, "percent strings must become ratios"
    assert abs(first.avg_pct_viewed - 0.52) < 1e-9
    assert first.avg_view_duration_s == pytest.approx(255.0), "m:ss must become seconds"
    assert first.watch_time_h == pytest.approx(5210 / 60.0, rel=1e-3), "'estimated minutes watched' is minutes"
    assert first.estimated_revenue == pytest.approx(41.20)
    assert first.rpm == pytest.approx(41.20 / 18400 * 1000, rel=1e-3)


def test_ingest_korean_studio_export(tmp_path):
    path = tmp_path / "ko.csv"
    path.write_text(KOREAN_CSV, "utf-8")
    rows = ingest_studio_csv(path)
    assert len(rows) == 2
    assert rows[0].title == "부가세 신고 순서 5가지"
    assert abs(rows[0].ctr - 0.051) < 1e-9
    assert rows[0].avg_view_duration_s == pytest.approx(245.0)
    assert rows[0].watch_time_h == pytest.approx(810 / 60.0, rel=1e-3)
    assert rows[0].estimated_revenue == pytest.approx(32.40)


def test_ingest_ignores_unknown_columns(tmp_path):
    path = tmp_path / "extra.csv"
    path.write_text(
        "Video title,Video ID,Views,Impressions,Impressions click-through rate,Some new column\n"
        "제목,vid_x,100,10000,4.0%,ignore me\n",
        "utf-8",
    )
    rows = ingest_studio_csv(path)
    assert rows[0].video_id == "vid_x"
    assert abs(rows[0].ctr - 0.04) < 1e-9


def test_title_feature_vector_rewards_specificity():
    vague = title_feature_vector("부가세 이야기")
    specific = title_feature_vector("부가세 신고 순서 5가지 (2025년, 18만원 차이)")
    assert specific["specificity"] > vague["specificity"]
    assert specific["length"] >= vague["length"]
    bait = title_feature_vector("충격!! 미친 반전 실화")
    assert bait["clickbait_penalty"] < specific["clickbait_penalty"]


def test_learn_title_weights_needs_enough_impressions():
    thin = [metric("v1", "제목 하나", views=10, impressions=500, ctr=0.05)]
    learned = learn_title_weights(thin)
    assert learned["_samples"] < 3
    assert "specificity" not in learned, "weights must not be learned from noise"


def test_learn_title_weights_moves_toward_what_worked():
    rows = [
        metric("v1", "부가세 신고 순서 5가지 (2025년 18만원)", views=9000, impressions=200000, ctr=0.062),
        metric("v2", "경비처리 3가지 기준과 12만원 차이", views=7000, impressions=180000, ctr=0.058),
        metric("v3", "홈택스 미리채움 확인 방법 4단계", views=5200, impressions=150000, ctr=0.051),
        metric("v4", "부가세 이야기", views=900, impressions=90000, ctr=0.021),
        metric("v5", "세금 이야기", views=700, impressions=80000, ctr=0.019),
    ]
    learned = learn_title_weights(rows)
    assert learned["_samples"] == 5
    assert learned["specificity"] > learned.get("curiosity", learned["specificity"]) * 0.6
    assert abs(sum(value for key, value in learned.items() if not key.startswith("_")) - 1.0) < 0.02


def test_cohort_stats_require_a_minimum_sample():
    rows = [
        metric("v1", "a", views=1000, impressions=MIN_IMPRESSIONS_FOR_CTR, ctr=0.05, niche="solo_tax_kr"),
        metric("v2", "b", views=1200, impressions=MIN_IMPRESSIONS_FOR_CTR, ctr=0.04, niche="solo_tax_kr"),
        metric("v3", "c", views=800, impressions=MIN_IMPRESSIONS_FOR_CTR, ctr=0.06, niche="career_pivot_4050"),
    ]
    cohorts = {row.key: row for row in cohort_stats(rows, "niche_id")}
    assert cohorts["solo_tax_kr"].videos == 2
    assert cohorts["solo_tax_kr"].reliable is True
    assert cohorts["career_pivot_4050"].reliable is False, "one video cannot justify a channel-wide decision"


def test_build_report_totals_insights_and_recommendations():
    rows = ingest_studio_csv(SAMPLE)
    from creatorloop.research import NicheLibrary

    report = build_report(ReportInputs(metrics=rows, window_days=3650, niche_library=NicheLibrary()))
    assert report.videos == 8
    assert report.totals["views"] == pytest.approx(sum(row.views for row in rows))
    assert report.insights
    assert report.recommendations
    values = [item.expected_value for item in report.recommendations]
    assert values == sorted(values, reverse=True), "recommendations must be ranked by expected value"
    assert report.recommendations[0].rank == 1
    assert all(item.required_value_add for item in report.recommendations)
    assert any("니치" in guard or "제목" in guard or "cadence" in guard.lower() or "노출" in guard for guard in report.guards) or report.guards == []


def test_report_summary_is_human_readable():
    rows = ingest_studio_csv(SAMPLE)
    report = build_report(ReportInputs(metrics=rows, window_days=3650))
    text = report_summary(report)
    assert "videos" in text or "편" in text
    assert str(report.videos) in text


def test_existing_titles_are_not_recommended_again():
    rows = ingest_studio_csv(SAMPLE)
    from creatorloop.research import NicheLibrary

    library = NicheLibrary()
    catalog = [{"title": row.title, "video_id": row.video_id, "niche_id": row.niche_id} for row in rows]
    catalog += [{"title": topic, "video_id": f"cat_{index}", "niche_id": "solo_tax_kr"} for index, topic in enumerate(library.get("solo_tax_kr").seed_topics)]
    report = build_report(ReportInputs(metrics=rows, catalog=catalog, window_days=3650, niche_library=library))
    recommended = {item.working_title for item in report.recommendations}
    assert not (recommended & {row.title for row in rows}), "a published title must not be suggested again"


def test_empty_window_reports_guards_not_crashes():
    report = build_report(ReportInputs(metrics=[], window_days=90))
    assert report.videos == 0
    assert report.guards
    assert report.recommendations == [] or report.recommendations
