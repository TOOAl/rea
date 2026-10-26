# -*- coding: utf-8 -*-
"""
빌드: 중3 수학 내신 대비 변별력 50제
  (1) 문제편 PDF  (2) 정답과 해설 PDF
A4 / 여백 10mm / 2단
"""
import os
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, KeepTogether, Flowable,
    NextPageTemplate, PageBreak,
)
from engine import (
    S, P, esc, mf, make_table, tip_box, section_banner, build_doc,
    NAVY, BLUE, RED, GRAY, LIGHT, LINE, COL_W, COVER_W,
)
from reportlab.platypus import Paragraph as _RLParagraph

def Paragraph(text, style):
    """모든 본문 문자열에 수학 기호 폴백을 자동 적용"""
    return _RLParagraph(mf(text), style)
from data_geo1 import GEO1
from data_geo2 import GEO2
from data_stats import STATS

PROBS = GEO1 + GEO2 + STATS
OUT = os.path.dirname(os.path.abspath(__file__))

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"

# 정답표용 짧은 정답
ANS_SHORT = {
    1: "③ 55°", 2: "② 35°", 3: "③ 58°", 4: "70°", 5: "③ 40°",
    6: "① 40°", 7: "62°", 8: "48°", 9: "③ 65°", 10: "50°",
    11: "50° 또는 130°", 12: "70°", 13: "③ 102°", 14: "68°", 15: "⑤ 120°",
    16: "x=40", 17: "⑤", 18: "80°", 19: "95°,105°", 20: "70°",
    21: "④ 55°", 22: "55°", 23: "③ 62°", 24: "70°", 25: "④ 62°",
    26: "AB=5", 27: "50°", 28: "70°,110°", 29: "③ 5", 30: "17점",
    31: "③ 11점", 32: "3시간", 33: "②", 34: "x=8",
    35: "9.4 / 5 / 5",
    36: "①", 37: "8", 38: "②", 39: "√5", 40: "③",
    41: "2", 42: "분산50, 5√2", 43: "A 선수",
    44: "①", 45: "①", 46: "양의 상관 강화", 47: "③",
    48: "양(+), y≈12", 49: "서술형", 50: "서술형",
}

TRENDS = [
    ("① 서술형·과정 중심 평가 확대",
     "최근 전국 중학교 기출은 선택형과 함께 서답형(서술형) 2~3문항이 기본 편성되어 "
     "풀이 과정과 근거 서술을 요구한다. 이 자료에는 서술형·신유형 12문항을 배치하였다."),
    ("② 단원 융합·다단계 추론 문항",
     "원주각, 내접사각형, 접선과 현이 이루는 각을 한 도형에 섞은 융합 문항(12, 18, 25, 28번)과 "
     "대푯값·산포도를 함께 묻는 의사결정 문항(43번)이 상위권 변별 문항으로 자주 출제된다."),
    ("③ 실생활 소재 문항",
     "슈팅 각도(8번), 측량(19번), 용돈 통계(35번), 선수 선발(43번), 난방비(45번), "
     "매출 그래프(49번) 등 교과서 활동과 연결된 실생활 맥락이 꾸준히 등장한다."),
    ("④ 공학적 도구 활용",
     "교육과정 성취기준에 명시된 대로 엑셀 AVERAGE·VAR·STDEV 등의 계산 결과를 해석하는 "
     "유형(42번)이 신유형으로 출제되고 있다."),
    ("⑤ 오류 분석·비판적 사고 신유형",
     "친구 풀이의 오류를 찾아 고치는 문항(11, 20, 28번), 그래프 왜곡을 비판하는 문항(49번), "
     "‘상관 ≠ 인과’를 묻는 문항(47번)이 최근 새로운 형태로 늘고 있다."),
    ("⑥ 역추론·개념 본질 문항",
     "각도·x를 거꾸로 구하는 문항(9, 10, 16, 34번), ‘어느 호에 대한 원주각인가’를 "
     "묻는 본질 이해 문항, 편차의 합 0 활용 문항이 변별력 포인트로 작용한다."),
]

COMPOSITION = [
    ["영역(문항 번호)", "선택형", "단답형", "서술·신유형", "계"],
    ["원주각과 그 성질 (1~12)", "6", "3", "3", "12"],
    ["원에 내접하는 사각형 (13~20)", "3", "3", "2", "8"],
    ["원의 접선과 현이 이루는 각 (21~28)", "3", "3", "2", "8"],
    ["대푯값 (29~35)", "3", "3", "1", "7"],
    ["산포도: 분산과 표준편차 (36~43)", "3", "3", "2", "8"],
    ["산점도와 상관관계 (44~50)", "3", "2", "2", "7"],
    ["합계", "21", "17", "12", "50"],
]

LEVEL_TBL = [
    ["난이도", "하", "중", "상", "계"],
    ["문항 수", "13", "24", "13", "50"],
    ["비율", "26%", "48%", "26%", "100%"],
]

# ------------------------------------------------------------- 플로 처리
def center_flow(flow):
    t = Table([[flow]], colWidths=[COL_W - 8])
    t.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t

def level_color(level):
    return {"하": colors.HexColor("#38612F"),
            "중": colors.HexColor("#B45F06"),
            "상": RED}[level]

def problem_block(pr, with_answer=False):
    items = []
    head = (f'<font color="#1F3864" size="12">{pr["n"]:02d}.</font>&nbsp;&nbsp;'
            f'<font color="#7F7F7F" size="7.8">[{esc(pr["unit"])} · '
            f'{esc(pr["ptype"])} · {esc(pr["level"])}]</font>')
    items.append(Paragraph(head, S["phead"]))
    for s in pr["stem"]:
        if isinstance(s, Flowable):
            items.append(center_flow(s))
        else:
            items.append(Paragraph(s, S["stem"]))
    if pr.get("choices"):
        for i, ch in enumerate(pr["choices"]):
            items.append(Paragraph(f"{CIRCLED[i]} {esc(ch)}", S["choice"]))
    if with_answer:
        items.append(Spacer(1, 2))
        items.append(Paragraph(f'<b>정답</b>　{esc(pr["answer"])}', S["ans"]))
        items.append(Paragraph(f'<b>핵심 개념</b>　{esc(pr["concept"])}', S["concept"]))
        for s in pr["sol"]:
            if isinstance(s, Flowable):
                items.append(center_flow(s))
            else:
                items.append(Paragraph("· " + s, S["sol"]))
        if pr.get("tip"):
            items.append(Spacer(1, 1.5))
            items.append(tip_box(f'<b>★ 합격 팁</b>　{esc(pr["tip"])}'))
    items.append(Spacer(1, 4))
    return KeepTogether(items)

def section_starts(probs):
    """unit 첫 문항 번호 집합"""
    seen, starts = set(), {}
    for pr in probs:
        if pr["unit"] not in seen:
            starts[pr["n"]] = pr["unit"]
            seen.add(pr["unit"])
    return starts

# ------------------------------------------------------------- 표지
def cover_common(main_title, sub_title, extra_blocks):
    story = []
    bar = Table([[Paragraph(esc("미래엔 중3 수학 · 2015 개정 교육과정 · 중3-2 Ⅵ. 원의 성질 Ⅶ. 통계"),
                              st_cover_chip())]], colWidths=[COVER_W])
    bar.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story += [Spacer(1, 4), bar, Spacer(1, 10),
              Paragraph(esc(main_title), S["h1"]), Spacer(1, 4),
              Paragraph(esc(sub_title), st_subtitle()), Spacer(1, 8)]
    story += extra_blocks
    return story

def st_cover_chip():
    from reportlab.lib.styles import ParagraphStyle
    return ParagraphStyle("cc", fontName="GB", fontSize=10.5, leading=14,
                          textColor=colors.white)

def st_subtitle():
    from reportlab.lib.styles import ParagraphStyle
    return ParagraphStyle("st", fontName="GB", fontSize=11.5, leading=16,
                          textColor=GRAY, alignment=1)

def h2(text):
    return Paragraph(esc(text), S["h2"])

def cover_problem():
    blocks = []
    blocks.append(h2("■ 출제 범위"))
    blocks.append(Paragraph(
        "원주각과 그 성질 · 원에 내접하는 사각형의 성질 · 원의 접선과 현이 이루는 각 · "
        "대푯값(평균·중앙값·최빈값) · 산포도(분산·표준편차) · 산점도와 상관관계 "
        "(미래엔 중학교 수학 3-2 기준)", S["cover"]))
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
    t2 = make_table(LEVEL_TBL, [120, 90, 90, 90, 90], fontsize=8.8)
    blocks.append(t2)
    blocks.append(Spacer(1, 6))
    blocks.append(h2("■ 답안 작성 및 활용 안내"))
    for note in [
        "선택형은 ①~⑤에서 고르고, 단답형은 빈칸에 값 또는 식을, 서술형·신유형은 풀이 과정과 "
        "근거를 빠짐없이 적는다.",
        "도형 문제는 주어진 그림에 각도와 보조선을 직접 표시하며 풀고, 통계 문제는 편차표·산점도를 "
        "직접 그려 보는 연습을 한다.",
        "자세한 정답과 단계별 풀이, 함정 포인트는 별도 파일 『정답과 해설』에 수록되어 있다.",
    ]:
        blocks.append(Paragraph("· " + esc(note), S["cover"]))
    story = cover_common(
        "중학교 3학년 수학 내신 대비",
        "변별력 50제 — 문제편 (A4 2단, 총 50문항)", blocks)
    story += [NextPageTemplate("cols"), PageBreak()]
    return story

def cover_solution():
    blocks = []
    blocks.append(h2("■ 정답표 (상·하반 각각 25문항)"))
    def ans_table(start, end):
        rows = []
        nums = list(range(start, end + 1))
        for i in range(0, len(nums), 5):
            row = []
            for n in nums[i:i + 5]:
                row += [str(n), ANS_SHORT[n]]
            rows.append(row)
        widths = [26, 78] * 5
        t = make_table(rows, widths, header=False, fontsize=8.2)
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
    blocks.append(ans_table(1, 25))
    blocks.append(Spacer(1, 6))
    blocks.append(ans_table(26, 50))
    blocks.append(Paragraph(
        "※ 35번은 차례로 평균·중앙값·최빈값, 42번은 분산·표준편차의 값이며 "
        "49·50번은 서술형으로 본문 해설을 참고한다.", S["small"]))
    blocks.append(Spacer(1, 7))
    blocks.append(h2("■ 자가 채점 기준"))
    for note in [
        "45점 이상(45문항 이상 정답): 상위권 안정 — 상 난이도 13문항의 서술 논리를 완벽히 다질 것.",
        "35~44점: 중상위권 — 단답형 실수와 오류 분석 신유형(11, 20, 28, 49번)을 재훈련할 것.",
        "34점 이하: 핵심 개념부터 — 각 문항의 ‘핵심 개념’ 줄을 노트에 옮겨 쓰고 하·중 난이도부터 반복할 것.",
        "서술형은 답이 맞아도 풀이 과정·근거 서술이 빠지면 부분 감점이 되므로 해설의 문장 순서를 그대로 익힐 것.",
    ]:
        blocks.append(Paragraph("· " + esc(note), S["cover"]))
    blocks.append(Spacer(1, 6))
    blocks.append(h2("■ 성취기준 연계"))
    ach = [
        ["단원", "핵심 성취기준"],
        ["원의 성질", "원주각과 중심각의 관계, 내접사각형의 성질, 접선과 현이 이루는 각을 이해하고 활용"],
        ["대푯값", "평균·중앙값·최빈값의 의미를 이해하고 자료의 특성에 맞게 선택 (9수05-06)"],
        ["산포도", "분산과 표준편차의 의미를 이해하고 계산 (9수05-07)"],
        ["상관관계", "자료를 산점도로 나타내고 상관관계를 판정 (9수05-08)"],
    ]
    t3 = make_table(ach, [90, 448], fontsize=8.8)
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
        "변별력 50제 — 정답과 자세한 풀이 (A4 2단)", blocks)
    story += [NextPageTemplate("cols"), PageBreak()]
    return story

# ------------------------------------------------------------- 빌드
def build_problems():
    story = cover_problem()
    starts = section_starts(PROBS)
    for pr in PROBS:
        if pr["n"] in starts:
            story.append(KeepTogether([section_banner(starts[pr["n"]]),
                                       problem_block(pr)]))
        else:
            story.append(problem_block(pr))
    path = os.path.join(OUT, "중3수학_변별력50제_문제편.pdf")
    build_doc(path, "중3 수학 변별력 50제 · 문제편", story)
    print("saved:", path)

def build_solutions():
    story = cover_solution()
    starts = section_starts(PROBS)
    for pr in PROBS:
        if pr["n"] in starts:
            story.append(KeepTogether([section_banner(starts[pr["n"]] + " · 해설"),
                                       problem_block(pr, with_answer=True)]))
        else:
            story.append(problem_block(pr, with_answer=True))
    path = os.path.join(OUT, "중3수학_변별력50제_정답과해설.pdf")
    build_doc(path, "중3 수학 변별력 50제 · 정답과 해설", story)
    print("saved:", path)

if __name__ == "__main__":
    build_problems()
    build_solutions()
