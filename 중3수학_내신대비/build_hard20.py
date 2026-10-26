# -*- coding: utf-8 -*-
"""
빌드: 중3 수학 고난도 변별력 20제
  (1) 문제편 PDF  (2) 정답과 해설 PDF  (A4 / 여백 10mm / 2단)
"""
import os
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import Spacer, Table, TableStyle, NextPageTemplate, PageBreak

from engine import (
    S, esc, make_table, build_doc,
    NAVY, GRAY, LIGHT, LINE, COL_W, COVER_W,
)
from build_exam import (
    Paragraph, problem_block, section_starts, cover_common,
    st_cover_chip, st_subtitle, h2,
)
from data_hard20 import HARD20

OUT = os.path.dirname(os.path.abspath(__file__))
PROBS = HARD20

ANS_SHORT = {
    1: "④ 80°", 2: "40°", 3: "③ 40°", 4: "70° 또는 110°", 5: "② 40°",
    6: "95°", 7: "x=20, 135°", 8: "82°", 9: "②", 10: "65°",
    11: "PT=12", 12: "AB=10", 13: "③ 12.5점", 14: "x=11",
    15: "135.7 / 100 / 100",
    16: "②", 17: "분산 8, 2√2", 18: "A 선수", 19: "③", 20: "서술형",
}

TRENDS = [
    ("① 단원 융합·다단계 추론 문항",
     "원주각·이등변삼각형·피타고라스 정리를 잇는 문항(5, 11번), 내접사각형과 대각선 삼각형을 "
     "결합한 문항(6, 8번)처럼 상위권을 가르는 2~3단계 추론 문항을 배치하였다."),
    ("② 역추론·개념 본질 문항",
     "교점각 공식으로 호의 각을 거꾸로 구하는 문항(2번), 외각=내대각을 방정식으로 푸는 문항"
     "(7번), 편차의 합 0으로 미지값을 찾는 문항(14번) 등 공식의 역활용을 집중 훈련한다."),
    ("③ 오류 분석·비판적 사고 신유형",
     "‘어느 호에 대한 원주각인가’를 묻는 오류 분석(4번), ‘상관 ≠ 인과’를 판별하는 문항"
     "(19번) 등 최근 기출의 신유형을 반영하였다."),
    ("④ 실생활 의사결정 서술형",
     "급여 대푯값 선택(15번), 선수 선발을 위한 표준편차 비교(18번), 측량(8번) 등 "
     "근거 서술을 요구하는 실생활 문항으로 과정 중심 평가에 대비한다."),
    ("⑤ 자료 해석·변환 추론",
     "평균 변화량 추적(13번), 변량 변환이 분산·표준편차에 주는 영향(16번), 산점도 추세 예측과 "
     "이상치 영향(20번) 등 통계 추론 문항을 고난도로 구성하였다."),
]

COMPOSITION = [
    ["영역(문항 번호)", "선택형", "단답형", "서술·신유형", "계"],
    ["원주각과 그 성질 (1~5)", "3", "1", "1", "5"],
    ["원에 내접하는 사각형 (6~8)", "0", "2", "1", "3"],
    ["원의 접선과 현이 이루는 각 (9~12)", "1", "2", "1", "4"],
    ["대푯값 (13~15)", "1", "1", "1", "3"],
    ["산포도: 분산과 표준편차 (16~18)", "1", "1", "1", "3"],
    ["산점도와 상관관계 (19~20)", "1", "0", "1", "2"],
    ["합계", "7", "7", "6", "20"],
]

LEVEL_TBL = [
    ["난이도", "상 (변별력)", "계"],
    ["문항 수", "20", "20"],
    ["비율", "100%", "100%"],
]

ACH = [
    ["단원", "핵심 성취기준"],
    ["원의 성질", "원주각·중심각 관계, 내접사각형의 성질, 접선과 현이 이루는 각을 융합적으로 활용"],
    ["대푯값", "평균·중앙값·최빈값을 구하고 자료의 특성에 맞게 선택 (9수05-06)"],
    ["산포도", "분산과 표준편차를 계산하고 자료의 퍼진 정도를 비교 (9수05-07)"],
    ["상관관계", "산점도로 상관관계를 판정하고 상관과 인과를 구분 (9수05-08)"],
]

def ans_table():
    rows = []
    nums = list(range(1, 21))
    for i in range(0, len(nums), 5):
        row = []
        for n in nums[i:i + 5]:
            row += [str(n), ANS_SHORT[n]]
        rows.append(row)
    t = make_table(rows, [26, 78] * 5, header=False, fontsize=8.2)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("BACKGROUND", (2, 0), (2, -1), LIGHT),
        ("BACKGROUND", (4, 0), (4, -1), LIGHT),
        ("BACKGROUND", (6, 0), (6, -1), LIGHT),
        ("BACKGROUND", (8, 0), (8, -1), LIGHT),
        ("FONTNAME", (0, 0), (0, -1), "GB"),
        ("FONTNAME", (2, 0), (2, -1), "GB"),
        ("FONTNAME", (4, 0), (4, -1), "GB"),
        ("FONTNAME", (6, 0), (6, -1), "GB"),
        ("FONTNAME", (8, 0), (8, -1), "GB"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.2),
    ]))
    return t

def cover_problem():
    blocks = []
    blocks.append(h2("■ 출제 범위와 특징"))
    blocks.append(Paragraph(
        "원주각과 그 성질 · 원에 내접하는 사각형의 성질 · 원의 접선과 현이 이루는 각 · "
        "대푯값 · 산포도(분산·표준편차) · 산점도와 상관관계 (미래엔 중학교 수학 3-2 기준). "
        "전 문항을 시험에서 상위권을 가르는 <b>고난도(상) 변별력 문항</b>으로만 구성하였다.",
        S["cover"]))
    blocks.append(Spacer(1, 5))
    blocks.append(h2("■ 최근 기출문제 트렌드 분석과 반영 내용"))
    for t, d in TRENDS:
        blocks.append(Paragraph(f'<b><font color="#1F3864">{esc(t)}</font></b>', S["cover"]))
        blocks.append(Paragraph(esc(d), S["cover"]))
        blocks.append(Spacer(1, 1.5))
    blocks.append(Spacer(1, 4))
    blocks.append(h2("■ 문항 구성표"))
    t = make_table(COMPOSITION, [206, 70, 70, 96, 56], fontsize=8.8)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#DCE6F5")),
        ("FONTNAME", (0, -1), (-1, -1), "GB"),
        ("GRID", (0, 0), (-1, -1), 0.6, LINE),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"), ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    blocks.append(t)
    blocks.append(Spacer(1, 6))
    blocks.append(h2("■ 난이도 구성표"))
    blocks.append(make_table(LEVEL_TBL, [140, 150, 120], fontsize=8.8))
    blocks.append(Spacer(1, 6))
    blocks.append(h2("■ 풀이 및 활용 안내"))
    for note in [
        "모든 문항이 고난도이므로 먼저 문제편에서 제한 시간(40분 내외)을 두고 풀고, 틀린 문항은 "
        "해설편의 ‘핵심 개념’과 ‘합격 팁’을 노트에 옮겨 적는다.",
        "도형 문제는 그림에 각도·보조선을 직접 표시하고, 통계 문제는 편차표·산점도를 직접 그린다.",
        "자세한 정답과 단계별 풀이, 함정 포인트는 별도 파일 『정답과 해설』에 수록되어 있다.",
    ]:
        blocks.append(Paragraph("· " + esc(note), S["cover"]))
    story = cover_common(
        "중학교 3학년 수학 내신 대비",
        "고난도 변별력 20제 — 문제편 (A4 2단, 총 20문항)", blocks)
    story += [NextPageTemplate("cols"), PageBreak()]
    return story

def cover_solution():
    blocks = []
    blocks.append(h2("■ 정답표 (20문항)"))
    blocks.append(ans_table())
    blocks.append(Paragraph(
        "※ 7번은 x의 값과 ∠BCD, 15번은 차례로 평균·중앙값·최빈값, 17번은 분산과 표준편차, "
        "20번은 종합 서술형으로 본문 해설을 참고한다.", S["small"]))
    blocks.append(Spacer(1, 7))
    blocks.append(h2("■ 자가 채점 기준"))
    for note in [
        "18문항 이상 정답: 최상위권 안정 — 서술형 논리와 신유형 오류 분석 문항의 표현을 다질 것.",
        "14~17문항: 상위권 도달 가능 — 단답형 역추론(2, 7, 12, 14번)과 통계 변환(16번)을 재훈련할 것.",
        "13문항 이하: 핵심 개념 재정립 — 각 문항의 ‘핵심 개념’ 줄을 먼저 암기하고 하·중 난이도로 복귀할 것.",
        "서술형은 답이 맞아도 풀이 과정·근거 서술이 빠지면 부분 감점되므로 해설의 문장 순서를 그대로 익힐 것.",
    ]:
        blocks.append(Paragraph("· " + esc(note), S["cover"]))
    blocks.append(Spacer(1, 6))
    blocks.append(h2("■ 성취기준 연계"))
    t3 = make_table(ACH, [90, 448], fontsize=8.8)
    t3.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, LINE),
        ("ALIGN", (1, 0), (1, -1), "LEFT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    blocks.append(t3)
    story = cover_common(
        "중학교 3학년 수학 내신 대비",
        "고난도 변별력 20제 — 정답과 자세한 풀이 (A4 2단)", blocks)
    story += [NextPageTemplate("cols"), PageBreak()]
    return story

def build_problems():
    story = cover_problem()
    starts = section_starts(PROBS)
    for pr in PROBS:
        if pr["n"] in starts:
            story.append(KeepTogetherSafe(starts[pr["n"]], pr))
        else:
            story.append(problem_block(pr))
    path = os.path.join(OUT, "중3수학_고난도20제_문제편.pdf")
    build_doc(path, "중3 수학 고난도 20제 · 문제편", story)
    print("saved:", path)

def build_solutions():
    story = cover_solution()
    starts = section_starts(PROBS)
    for pr in PROBS:
        if pr["n"] in starts:
            story.append(KeepTogetherSafe(starts[pr["n"]] + " · 해설", pr, True))
        else:
            story.append(problem_block(pr, with_answer=True))
    path = os.path.join(OUT, "중3수학_고난도20제_정답과해설.pdf")
    build_doc(path, "중3 수학 고난도 20제 · 정답과 해설", story)
    print("saved:", path)

from reportlab.platypus import KeepTogether
from engine import section_banner
def KeepTogetherSafe(banner_text, pr, answer=False):
    return KeepTogether([section_banner(banner_text), problem_block(pr, with_answer=answer)])

if __name__ == "__main__":
    build_problems()
    build_solutions()
