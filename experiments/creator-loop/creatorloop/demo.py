"""Offline end-to-end demo: ① research → ② production → ③ packaging → ④ analytics → ①.

Everything here runs without network access and without paid keys: procedural art,
local TTS, ffmpeg assembly, Pillow thumbnails.  The human inputs embedded below are
clearly-labelled **sample** answers so the demo can show what a real desk session
produces; replace them with your own via the CLI or the web studio.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from .contracts import new_id, to_jsonable, utcnow
from .loop import CreatorLoop, LoopOptions
from .policy import summarize as policy_summary
from .screenplay import draft_screenplay
from .store import Store

SAMPLE_CSV = Path(__file__).resolve().parent.parent / "data" / "samples" / "analytics_export.csv"

DEMO_BRIEFS: dict[str, dict[str, Any]] = {
    "solo_tax_kr": {
        "title": "개인사업자 첫 부가세 신고, 홈택스 미리채움 그대로 쓰면 안 되는 이유",
        "answers": {
            "angle": "신고 순서와 놓치는 경비 항목",
            "human_take": (
                "저는 첫 신고 때 미리채움 그대로 제출했다가 접대비 한도를 넘긴 줄도 모르고 넘겼습니다. "
                "그때 40만원을 더 냈고, 다음 신고부터는 순서를 바꿨습니다."
            ),
            "original_data": (
                "2025년 1기 확정신고에서 제 매입세액은 32만원이었는데 실제로 공제받은 것은 18만원이었습니다. "
                "차이 14만원은 증빙이 사업용 신용카드가 아니었던 항목이었습니다."
            ),
            "통념": "미리채움 서비스 그대로 제출하면 된다고 생각하는 경우가 많습니다.",
            "limit": "간이과세자이거나 면세 사업자는 기준이 완전히 달라집니다.",
            "실수 사례": "카드 영수증은 있지만 사업자 등록 전 지출이라 공제가 안 됐습니다.",
        },
        "value_adds": [
            ("personal_experience", "첫 신고 때 미리채움을 그대로 제출해 40만원을 더 냈습니다."),
            ("original_data", "2025년 1기 확정신고 매입세액 32만원 중 18만원만 공제받았습니다."),
            ("expert_commentary", "세무사에게 확인한 결과 사업자등록일 이후 지출만 공제된다는 점이 핵심이었습니다."),
        ],
        "keywords": ["부가가치세 신고", "경비처리", "홈택스 미리채움"],
        "advantage": 4,
        "edit": {
            "sc00": (
                "저는 첫 부가세 신고에서 미리채움 그대로 제출하고 40만원을 더 냈습니다. "
                "오늘은 그 실수를 피하는 순서만 정리합니다."
            )
        },
    },
    "career_pivot_4050": {
        "title": "45세에 이력서 통과율 3배 올린 수정 과정",
        "answers": {
            "angle": "이력서 수정 순서와 실제 결과",
            "human_take": "저는 45세에 14곳에 지원해 2곳에서만 연락을 받았고, 문장을 바꾼 뒤 12곳에서 연락이 왔습니다.",
            "original_data": "제 지원 기록 26건의 응답률과 면접 전환율을 스프레드시트로 직접 정리했습니다.",
            "통념": "경력이 많으면 통과한다고 생각하는 경우가 많습니다. 실제로는 오히려 걸러집니다.",
            "limit": "직무가 완전히 다른 전환이라면 이 방식만으로 부족합니다.",
        },
        "value_adds": [
            ("personal_experience", "14곳 지원 2곳 응답 → 문장 수정 후 12곳 응답."),
            ("original_data", "지원 기록 26건의 응답률·면접 전환율 스프레드시트."),
        ],
        "keywords": ["40대 이직", "이력서", "경력 전환"],
        "advantage": 5,
        "edit": {
            "sc00": "45세에 저는 14곳에 지원해서 2곳에서만 답을 받았습니다. 바꾼 것은 경력이 아니라 문장이었습니다."
        },
    },
    "local_biz_experiment": {
        "title": "배달앱 할인율 5%와 10%, 2주 동안 실제로 남는 돈 비교",
        "answers": {
            "angle": "2주 실험으로 본 실제 마진 차이",
            "human_take": "제 가게에서 2주 동안 할인율을 5%와 10%로 번갈아 적용하고 정산서를 비교했습니다.",
            "original_data": "정산서 14일치: 주문 182건, 5% 구간 마진 11.2%, 10% 구간 마진 6.8%.",
            "통념": "할인을 늘리면 주문이 그만큼 늘어난다고 가정하는 경우가 많습니다.",
            "limit": "입지와 메뉴 구성에 따라 결과가 크게 달라질 수 있습니다.",
        },
        "value_adds": [
            ("original_data", "14일 정산서 기반 주문 182건 마진 비교 데이터."),
            ("personal_experience", "할인 구간을 직접 바꿔가며 운영한 2주 실험."),
            ("experiment", "5% 구간과 10% 구간을 요일별로 교차 배치한 실험 설계."),
        ],
        "keywords": ["배달앱 수수료", "할인율", "자영업 실험"],
        "advantage": 4,
        "edit": {
            "sc00": "할인을 5%에서 10%로 올리면 주문이 늘까요? 제 정산서 14일치로 직접 확인했습니다."
        },
    },
}

ARTICLE_SAMPLE = """\
# 간이과세자에서 일반과세자로 전환될 때 일어나는 일

간이과세자는 부가가치세를 매출의 1.5~4% 수준으로 납부하지만, 연간 공급대가 8천만원을 넘으면
일반과세자로 전환됩니다. 전환 시점부터는 매입세액 공제가 가능해지는 대신 신고 횟수가 연 1회에서
2회로 늘고, 세금계산서 발급 의무가 생깁니다.

전환 통지를 받았다면 가장 먼저 사업자등록 정정 신고를 해야 합니다. 이후에는 매입 증빙을 사업용
신용카드로 통일하고, 홈택스 미리채움 자료가 실제 거래와 일치하는지 확인해야 합니다.

실무에서 가장 흔한 실수는 전환 직전 매입을 놓치는 것입니다. 전환일 이전 매입은 간이과세 기준이
적용되어 공제받지 못하는 경우가 많으므로, 큰 지출이 예정되어 있다면 시점을 조정하는 것이 좋습니다.

마지막으로 예상 세액을 미리 계산해 두면 현금 흐름 계획을 세울 수 있습니다. 매출 증가가 곧 순이익
증가가 아니라는 점을 기억해야 합니다.
"""


def run_demo(
    store: Store,
    *,
    resolution: str = "1080p",
    niche_id: str = "solo_tax_kr",
    runtime_target_s: int = 120,
    analytics_csv: Path | str | None = SAMPLE_CSV,
    verbose: bool = False,
) -> dict[str, Any]:
    started = time.time()
    events: list[dict[str, Any]] = []
    loop = CreatorLoop(store, on_event=lambda event: events.append(event))
    config = DEMO_BRIEFS.get(niche_id) or DEMO_BRIEFS["solo_tax_kr"]
    options = LoopOptions(resolution=resolution, runtime_target_s=runtime_target_s, prefer_free=True, budget_usd=0.0)
    summary: dict[str, Any] = {"note": "샘플 사람 입력으로 실행한 오프라인 데모입니다. 실제 제작 시에는 본인 답변/증거로 교체하세요."}

    print("① RESEARCH — 인간이 주제를 결정합니다 (샘플 답변 사용)")
    brief = loop.research(
        niche_id,
        config["title"],
        config["answers"],
        value_adds=config["value_adds"],
        keywords=config["keywords"],
        personal_advantage=config.get("advantage"),
        runtime_target_s=runtime_target_s,
    )
    print(f"   brief={brief.id} decisions={len(brief.decisions)} value_adds={len(brief.human_value_adds)}")

    print("② SCRIPT — AI 초안 + 인간 편집 (게이트 근거 기록)")
    screenplay = loop.script(brief, options=options, edits=config.get("edit"))
    gates = loop.check_gates(brief, screenplay, options=options)
    print(
        f"   scenes={len(screenplay.scenes)} hook={screenplay.hook_archetype} "
        f"human_ratio={screenplay.human_sourced_ratio:.0%} edited={screenplay.human_edited} gates={'PASS' if gates['passed'] else gates['reasons']}"
    )

    print("② PRODUCE — 무료 로컬 엔진으로 실제 영상 렌더")
    produced = loop.produce(brief, screenplay, options=options)
    video = produced["video"]
    print(f"   video={video.path} duration={video.duration_s:.1f}s {video.width}x{video.height} tts={produced['tts'].backend}")

    print("③ PACKAGE — 제목·썸네일·설명 최적화")
    package = loop.package(brief, screenplay, produced)
    print(f"   best='{package.best_title}' thumbnails={len(package.thumbnails)} chapters={len(package.chapters)}")

    print("POLICY — 2025-07-15 비진정성 규칙 fail-closed 감사")
    report = loop.policy_report(brief, screenplay, package, produced)
    print("   " + policy_summary(report).replace("\n", "\n   "))

    print("④ ANALYTICS — Studio CSV 인제스트 + 다음 주제 추천")
    if analytics_csv and Path(analytics_csv).exists():
        from .analytics import ingest_studio_csv

        loop.store.ingest_metrics(ingest_studio_csv(analytics_csv))
    analytics = loop.analyze()
    for row in analytics.recommendations[:3]:
        print(f"   #{row.rank} [{row.niche_id}] {row.working_title} (EV≈{row.expected_value}, {row.confidence})")

    print("VARIATION CHECK — 다음 편 초안을 만들어 채널 내 반복도 측정")
    next_variation = draft_screenplay(brief, variation_index=1, runtime_target_s=runtime_target_s)
    from .policy import PolicyInputs

    variation_report = loop.policy.evaluate(
        PolicyInputs(brief=brief, screenplay=next_variation, catalog=loop.store.catalog(), title=brief.working_title)
    )
    print(f"   next-variation score={variation_report.score} blocking={len(variation_report.blocking())}")

    print("ARTICLE → VIDEO — Pictory 스타일 경로 (본인 장문 = 고유 기여)")
    article_brief = loop.research(
        "solo_tax_kr",
        "간이과세자에서 일반과세자로 전환될 때 일어나는 일",
        {"angle": "전환 시점에 놓치는 매입 처리", "human_take": "제가 직접 쓴 실무 노트를 영상으로 옮긴 것입니다."},
        value_adds=[("original_data", "직접 작성한 실무 노트 전문을 영상으로 옮김")],
        keywords=["간이과세", "일반과세 전환"],
        personal_advantage=4,
        runtime_target_s=150,
    )
    article_options = LoopOptions(resolution=resolution, runtime_target_s=150, article=ARTICLE_SAMPLE)
    article_screenplay = loop.script(article_brief, options=article_options)
    print(f"   article screenplay: scenes={len(article_screenplay.scenes)} human_ratio={article_screenplay.human_sourced_ratio:.0%} runtime≈{article_screenplay.estimated_runtime_s:.0f}s")

    run_id = new_id("demo")
    store.save_any(
        brief.id,
        "demo_report.json",
        {
            "run_id": run_id,
            "generated_at": utcnow(),
            "brief": brief.id,
            "screenplay": screenplay.id,
            "video": video.path,
            "package": package.id,
            "policy_score": report.score,
            "policy_ok": report.ok,
            "analytics_report": analytics.id,
            "recommendations": to_jsonable(analytics.recommendations[:5]),
            "events": len(events),
            "elapsed_s": round(time.time() - started, 1),
        },
    )

    summary.update(
        {
            "brief_id": brief.id,
            "screenplay_id": screenplay.id,
            "video": video.path,
            "duration_s": video.duration_s,
            "poster": str(Path(video.path).parent / "poster.png"),
            "thumbnails": [item.path for item in package.thumbnails],
            "best_title": package.best_title,
            "title_candidates": [item.title for item in package.titles[:5]],
            "description_preview": package.description[:220],
            "ab_plan": package.ab_plan,
            "policy_score": report.score,
            "policy_ok": report.ok,
            "policy_findings": len(report.findings),
            "policy_blocking": [finding.code for finding in report.blocking()],
            "human_sourced_ratio": screenplay.human_sourced_ratio,
            "tts_backend": produced["tts"].backend,
            "provider": video.provider.value,
            "cost_usd": video.cost_usd,
            "analytics_videos": analytics.videos,
            "next_topics": [item.working_title for item in analytics.recommendations[:3]],
            "article_screenplay_scenes": len(article_screenplay.scenes),
            "upload_bundle": str(store.project_dir(brief.id) / "upload.json"),
            "project_dir": str(store.project_dir(brief.id)),
            "elapsed_s": round(time.time() - started, 1),
        }
    )
    loop.build_upload_bundle(brief, screenplay, package, video, report)
    print(f"\n완료: {summary['elapsed_s']}s · 프로젝트 디렉터리 {summary['project_dir']}")
    return {"summary": summary, "events": events[-30:], "policy_report": report.to_json()}
