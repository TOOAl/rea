"""Shared fixtures: everything here is offline, keyless and deterministic."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from creatorloop.contracts import CameraMove, Scene, Shot, ShotSize  # noqa: E402
from creatorloop.research import BriefBuilder, NicheLibrary  # noqa: E402
from creatorloop.screenplay import apply_human_edits, draft_screenplay  # noqa: E402
from creatorloop.store import Store  # noqa: E402

HUMAN_ANSWERS = {
    "human_take": "저는 첫 신고 때 증빙을 못 찾아서 40만원을 더 냈습니다. 그 뒤로 순서를 바꿨습니다.",
    "original_data": "2025년 1기 확정신고에서 매입세액 32만원 중 18만원만 공제받았습니다.",
    "통념": "미리채움 서비스 그대로 제출하면 된다고 생각하는 경우가 많습니다.",
    "limit": "간이과세자라면 기준이 달라집니다.",
}

HUMAN_VALUE_ADDS = [
    ("personal_experience", "첫 신고 때 증빙을 찾지 못해 40만원을 더 냈습니다."),
    ("original_data", "2025년 1기 확정신고 매입세액 32만원 중 18만원만 공제받았습니다."),
    ("expert_commentary", "세무사 확인 결과 간이과세자 전환 요건이 핵심이었습니다."),
]

HUMAN_HOOK = "첫 부가세 신고에서 저는 증빙을 못 찾아 40만원을 더 냈습니다. 오늘은 그 실수를 피하는 순서를 정리합니다."


@pytest.fixture(scope="session")
def library() -> NicheLibrary:
    return NicheLibrary()


@pytest.fixture()
def brief(library: NicheLibrary):
    return BriefBuilder(library).build(
        "solo_tax_kr",
        "개인사업자 첫 부가세 신고 전에 확인할 5가지",
        HUMAN_ANSWERS,
        value_adds=HUMAN_VALUE_ADDS,
        keywords=["부가가치세 신고", "경비처리", "홈택스"],
        sources=["국세청 부가가치세 신고 안내"],
        personal_advantage=4,
        video_format="long_form",
        runtime_target_s=90,
    )


@pytest.fixture()
def screenplay(brief):
    return draft_screenplay(brief, variation_index=0, runtime_target_s=90)


@pytest.fixture()
def edited_screenplay(screenplay):
    return apply_human_edits(screenplay, {"sc00": HUMAN_HOOK})


@pytest.fixture()
def store(tmp_path: Path) -> Store:
    return Store(tmp_path / "store")


@pytest.fixture()
def shot() -> Shot:
    return Shot(
        id="s00_0",
        prompt="a desk with tax paperwork, morning light",
        size=ShotSize.MS,
        angle="eye_level",
        lens_mm=50,
        move=CameraMove.DOLLY_IN,
        move_intensity=0.6,
        duration_s=6.0,
        subject="부가가치세 신고",
        mood="analytical",
        on_screen_text="신고 순서",
        negative_prompt="text artifacts, watermark",
    )


@pytest.fixture()
def scene(shot: Shot) -> Scene:
    return Scene(id="sc00", beat="hook", narration="첫 문장입니다.", shots=[shot])
