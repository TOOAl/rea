# -*- coding: utf-8 -*-
"""해설지 PDF 생성기: 정답·출처 분석 + 문항별 직독직해 해설."""
import os
import re
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Frame, KeepTogether,
                                NextPageTemplate, PageBreak, PageTemplate, Paragraph, Spacer,
                                Table, TableStyle)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meta  # noqa: E402
import rlib  # noqa: E402
from content1 import Q1  # noqa: E402
from content2 import Q2  # noqa: E402
from content3 import Q3  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
QUESTIONS = Q1 + Q2 + Q3
QMAP = {q["no"]: q for q in QUESTIONS}
ST = rlib.styles()

PAGE_W, PAGE_H = A4
LM = RM = 12 * mm
TM = 18 * mm
BM = 13 * mm
GAP = 6 * mm
COL_W = (PAGE_W - LM - RM - GAP) / 2
COL_H = PAGE_H - TM - BM

CIRC = rlib.CIRCLE

# ---------------------------------------------------------------- styles
S = {}
S["title"] = rlib.ParagraphStyle("t", fontName=rlib.SANS_B, fontSize=16, leading=21,
                                 alignment=1, textColor=rlib.INK)
S["sub"] = rlib.ParagraphStyle("st", fontName=rlib.SANS, fontSize=8.4, leading=12,
                               alignment=1, textColor=rlib.GRAY)
S["h"] = rlib.ParagraphStyle("h", fontName=rlib.SANS_B, fontSize=8.8, leading=12,
                             textColor=colors.HexColor("#0b3d63"), spaceBefore=3.4,
                             spaceAfter=1.4, keepWithNext=1)
S["body"] = rlib.ParagraphStyle("b", fontName=rlib.SANS, fontSize=8.1, leading=11.4,
                                textColor=rlib.INK, spaceAfter=1.2)
S["body_s"] = rlib.ParagraphStyle("bs", fontName=rlib.SANS, fontSize=7.5, leading=10.4,
                                  textColor=rlib.GRAY, spaceAfter=0.8)
S["en"] = rlib.ParagraphStyle("e", fontName=rlib.SERIF, fontSize=8.0, leading=10.6,
                              textColor=colors.HexColor("#1f2f45"), spaceAfter=0.2,
                              leftIndent=2)
S["ko"] = rlib.ParagraphStyle("k", fontName=rlib.SANS, fontSize=7.8, leading=10.6,
                              textColor=colors.HexColor("#204d74"), spaceAfter=2.4,
                              leftIndent=2)
S["rowno"] = rlib.ParagraphStyle("rn", fontName=rlib.SANS_B, fontSize=9.6, leading=12,
                                 alignment=1, textColor=rlib.INK)
S["tag"] = rlib.ParagraphStyle("tag", fontName=rlib.SANS, fontSize=6.6, leading=8,
                               alignment=1, textColor=rlib.GRAY)
S["qhead"] = rlib.ParagraphStyle("qh", fontName=rlib.SANS_B, fontSize=8.3, leading=11,
                                 textColor=rlib.INK)
S["lab"] = rlib.ParagraphStyle("lab", fontName=rlib.SANS_B, fontSize=8.1, leading=11.4,
                               textColor=rlib.INK, spaceBefore=2.2, spaceAfter=0.6,
                               keepWithNext=1)
S["ans"] = rlib.ParagraphStyle("an", fontName=rlib.SANS_B, fontSize=8.3, leading=11,
                               alignment=2, textColor=colors.HexColor("#b03030"))
S["cell"] = rlib.ParagraphStyle("c", fontName=rlib.SANS, fontSize=7.0, leading=9.4,
                                textColor=rlib.INK)
S["cell_s"] = rlib.ParagraphStyle("cs", fontName=rlib.SANS, fontSize=6.6, leading=9.0,
                                  textColor=rlib.GRAY)
S["cell_en"] = rlib.ParagraphStyle("ce", fontName=rlib.SERIF, fontSize=6.8, leading=9.2,
                                   textColor=rlib.INK)


def clean(en):
    if en is None:
        return ""
    return re.sub(r"\s+", " ", en.replace(" / ", " ")).strip()


def strip_marker(s):
    return re.sub(r"^[①②③④⑤⑥⑦⑧⑨⑩]\s*", "", s)


def sentences(q):
    """(영어 원문, 끊어읽기, 한국어) 튜플 목록."""
    out = []
    blocks = q.get("blocks") or []
    for b in blocks:
        t = b["t"]
        if t in ("p", "plab", "summary"):
            for s in b["s"]:
                out.append((clean(s["en"]), s["en"], s["ko"]))
        elif t in ("line", "title", "sub", "given"):
            out.append((clean(b["en"]), b["en"], b.get("ko", "")))
        elif t == "bul":
            for x in b["items"]:
                out.append((clean(x["en"]), x["en"], x.get("ko", "")))
    return out


# ---------------------------------------------------------------- cover pages
def cover_flow():
    fl = [Spacer(1, 10 * mm)]
    fl.append(Paragraph("2026학년도 대학수학능력시험 대비 모의평가", S["sub"]))
    fl.append(Spacer(1, 2 * mm))
    fl.append(Paragraph("영어 영역 (독해) 해설 및 직독직해 분석", S["title"]))
    fl.append(Spacer(1, 1.6 * mm))
    fl.append(Paragraph("3교시 · 듣기 평가(1~17번) 제외 · 28문항 / 63점", S["sub"]))
    fl.append(Spacer(1, 7 * mm))

    intro = [
        ("이 해설지의 구성",
         "① 정답·배점표 ② 지문 출처 및 EBS 연계 분석 ③ 문항별 직독직해(끊어읽기 + 한글 해석) "
         "④ 정답 근거와 오답 분석 ⑤ 필수 어휘와 구문 포인트"),
        ("직독직해 표기법",
         "영어 문장은 의미 단위(/)로 끊어 제시하고, 바로 아래에 그 단위의 우리말 뜻을 순서대로 "
         "배치했습니다. 위아래를 짝지어 읽으면 영어 어순 그대로 의미를 붙여 갈 수 있습니다."),
        ("지문의 성격",
         "모든 지문은 첨부 분석지의 주제를 바탕으로, 실제 외국 기사·저널·저작의 논지를 수능 지문 "
         "수준으로 재서술한 것입니다. 원문을 그대로 옮기지 않았으므로 인용이 아니라 재구성입니다."),
        ("활용 순서",
         "문제를 푼 뒤 ① 채점 → ② 틀린 문항의 ‘정답 근거’ 확인 → ③ 직독직해로 문장 구조 확인 → "
         "④ 어휘·구문 포인트 정리 → ⑤ 지문 출처의 원문(기사·논문) 찾아 읽기 순으로 활용하십시오."),
    ]
    for t, d in intro:
        fl.append(Paragraph("■ " + t, S["h"]))
        fl.append(Paragraph(d, S["body"]))

    # 정답표
    fl.append(Spacer(1, 3 * mm))
    fl.append(Paragraph("■ 정답표", S["h"]))
    half = 14
    rows = [[Paragraph(x, S["cell"]) for x in
             ("번호", "정답", "배점", "유형", "번호", "정답", "배점", "유형")]]
    for i in range(half):
        a = meta.STRUCTURE[i]
        b = meta.STRUCTURE[i + half]
        qa, qb = QMAP[a[0]], QMAP[b[0]]
        rows.append([
            Paragraph(str(a[0]), S["cell"]),
            Paragraph('<font name="%s">%s</font>' % (rlib.SANS_B, CIRC[qa["ans"] - 1]), S["cell"]),
            Paragraph("%d" % a[2], S["cell"]),
            Paragraph(a[1], S["cell_s"]),
            Paragraph(str(b[0]), S["cell"]),
            Paragraph('<font name="%s">%s</font>' % (rlib.SANS_B, CIRC[qb["ans"] - 1]), S["cell"]),
            Paragraph("%d" % b[2], S["cell"]),
            Paragraph(b[1], S["cell_s"]),
        ])
    t = Table(rows, colWidths=[10 * mm, 10 * mm, 9 * mm, 40 * mm, 10 * mm, 10 * mm, 9 * mm, 40 * mm],
              repeatRows=1)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, rlib.RULE),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6edf4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2),
        ("LEFTPADDING", (0, 0), (-1, -1), 1.6),
    ]))
    fl.append(t)

    fl.append(Spacer(1, 3 * mm))
    fl.append(Paragraph("■ 배점 요약", S["h"]))
    fl.append(Paragraph(
        "2점 21문항(42점) + 3점 7문항(21점) = 63점. 3점 문항은 %s번이며, 나머지는 모두 2점입니다."
        % ", ".join(str(no) for no, _l, p in meta.STRUCTURE if p == 3), S["body"]))

    # 시간 배분
    fl.append(Spacer(1, 3 * mm))
    fl.append(Paragraph("■ 시험 운영 및 시간 배분(권장 45분)", S["h"]))
    plan = [("18~25번", "8문항", "13분", "목적·심경·주장·함축·요지·주제·제목·도표"),
            ("26~30번", "5문항", "9분", "내용 일치 3문항 + 어법 1 + 어휘 1"),
            ("31~34번", "4문항", "11분", "빈칸 추론(3점 2문항 포함)"),
            ("35~40번", "6문항", "7분", "무관한 문장·순서·삽입·요약"),
            ("41~45번", "5문항", "5분", "장문 1지문 2문항 + 1지문 3문항")]
    rows = [[Paragraph(x, S["cell"]) for x in ("구간", "문항 수", "권장 시간", "주요 유형")]]
    for r in plan:
        rows.append([Paragraph(x, S["cell"]) for x in r])
    t = Table(rows, colWidths=[20 * mm, 18 * mm, 16 * mm, 78 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, rlib.RULE),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6edf4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.3),
    ]))
    fl.append(t)
    fl.append(Paragraph("※ 실제 수능 영어 영역은 듣기 25분 + 독해 45분 = 70분이며, 이 문제지는 듣기를 "
                        "제외하였으므로 독해 45분을 기준으로 운영하십시오.", S["body_s"]))

    # 자가 채점표
    fl.append(Spacer(1, 3 * mm))
    fl.append(Paragraph("■ 자가 채점표(참고)", S["h"]))
    bands = [("1등급", "90% 이상", "57점 이상"), ("2등급", "80~89%", "51~56점"),
             ("3등급", "70~79%", "45~50점"), ("4등급", "60~69%", "38~44점"),
             ("5등급", "50~59%", "32~37점"), ("6등급", "40~49%", "26~31점"),
             ("7등급", "30~39%", "19~25점"), ("8등급", "20~29%", "13~18점"),
             ("9등급", "19% 이하", "12점 이하")]
    rows = [[Paragraph(x, S["cell"]) for x in ("등급", "100점 환산", "이 문제지 원점수(63점 만점)",
                                              "등급", "100점 환산", "이 문제지 원점수(63점 만점)")]]
    for i in range(5):
        a, b = bands[i], bands[i + 5] if i + 5 < len(bands) else ("", "", "")
        rows.append([Paragraph(x, S["cell"]) for x in a] + [Paragraph(x, S["cell"]) for x in b])
    t = Table(rows, colWidths=[14 * mm, 22 * mm, 44 * mm, 14 * mm, 22 * mm, 44 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, rlib.RULE),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6edf4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2),
    ]))
    fl.append(t)
    fl.append(Paragraph("※ 영어 영역은 절대평가이므로 위 등급 구간은 학습 점검용 임의 기준입니다. "
                        "문항 수가 적은 재구성 문제지이므로 원점수보다 ‘틀린 유형’을 확인하는 데 쓰십시오.",
                        S["body_s"]))
    return fl



def sources_flow():
    fl = [Paragraph("■ 지문 출처 및 EBS 수능특강·수능완성 연계 분석", S["h"])]
    fl.append(Paragraph(
        "각 문항의 소재와 논지는 실제 외국 기사·저널·저작에서 가져오고, 문항 형식은 EBS 수능특강 "
        "영어 유형편의 해당 강과 대응시켰습니다. 원문은 그대로 인용하지 않고 수능 지문 수준으로 "
        "재서술했습니다.", S["body_s"]))
    rows = [[Paragraph(x, S["cell"]) for x in ("번호", "분야", "원출처(실제 기사·저널·저작)", "EBS 연계")]]
    for no, field, src, ebs in meta.SOURCES:
        rows.append([Paragraph(str(no), S["cell"]), Paragraph(field, S["cell_s"]),
                     Paragraph(src, S["cell"]), Paragraph(ebs, S["cell_s"])])
    t = Table(rows, colWidths=[10 * mm, 20 * mm, 96 * mm, 57 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, rlib.RULE),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6edf4")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.4),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
    ]))
    fl.append(t)
    fl.append(Spacer(1, 2 * mm))
    fl.append(Paragraph(
        "※ ‘수능완성’은 수능특강과 함께 EBS 대표 연계교재로, 실전 모의고사 형식의 문항을 제공합니다. "
        "위 표의 EBS 연계는 유형·난이도 대응 관계를 정리한 것이며, 실제 수능의 연계율(50% 이상)을 "
        "그대로 재현한 것은 아닙니다.", S["body_s"]))
    return fl


# ---------------------------------------------------------------- per item
def item_header(q):
    pts = q.get("pts")
    label = q.get("label", "")
    ans = CIRC[q["ans"] - 1]
    left = [Paragraph('%s' % q["no"], S["rowno"]),
            Paragraph('%d점' % pts, S["tag"])]
    mid = [Paragraph(label, S["qhead"]),
           Paragraph(clean(q["inst"]), S["body_s"])]
    right = [Paragraph("정답 %s" % ans, S["ans"])]
    t = Table([[left, mid, right]], colWidths=[10 * mm, COL_W - 31 * mm, 21 * mm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (0, 0), 0.8, rlib.INK),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f0f3f7")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("VALIGN", (2, 0), (2, 0), "TOP"),
        ("LEFTPADDING", (1, 0), (1, 0), 3.4),
        ("RIGHTPADDING", (2, 0), (2, 0), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 1.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2),
        ("LINEBELOW", (1, 0), (2, 0), 0.7, rlib.INK),
    ]))
    return t


def jikdok(q):
    """직독직해 블록(끊어읽기 + 단위별 해석)."""
    fl = []
    cells = [[Paragraph("■ 직독직해", S["h"])]]
    for b in q.get("blocks") or []:
        t = b["t"]
        if t == "plab":
            cells.append([Paragraph('<font name="%s">%s</font>' % (rlib.SERIF_BOLD, b["label"]),
                                    S["en"])])
            items = b["s"]
        elif t in ("p", "summary"):
            items = b["s"]
        elif t == "line":
            items = [b]
        elif t == "title":
            cells.append([Paragraph('<font name="%s">%s</font>' % (rlib.SANS_B, b["en"]), S["en"])])
            items = []
        elif t in ("sub", "given"):
            items = [b]
        elif t == "bul":
            items = b["items"]
        else:
            items = []
        for s2 in items:
            eng = rlib.md(s2["en"])
            ko = rlib.md(s2.get("ko", ""))
            if ko:
                cells.append([Paragraph('<font name="%s">%s</font>' % (rlib.SERIF_BOLD, eng), S["en"]),
                              Paragraph(ko, S["ko"])])
            else:
                cells.append([Paragraph('<font name="%s">%s</font>' % (rlib.SERIF_BOLD, eng), S["en"])])
    if cells:
        t = Table([[c] for c in cells], colWidths=[COL_W])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0.5),
        ]))
        fl.append(t)
    return fl


def data_table(q):
    """도표 문항용 데이터 표."""
    b = q["blocks"][0]
    head = [Paragraph("식단 유형", S["cell"])] + [Paragraph(g, S["cell"]) for g in b["groups"]]
    rows = [head]
    for name, vals in b["series"]:
        rows.append([Paragraph(name, S["cell"])] + [Paragraph("%d%%" % v, S["cell"]) for v in vals])
    t = Table(rows, colWidths=[26 * mm] + [(COL_W - 26 * mm) / len(b["groups"])] * len(b["groups"]))
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, rlib.RULE),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6edf4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.4),
    ]))
    return [Paragraph("■ 도표 자료", S["h"]), t,
            Paragraph(clean(b.get("caption", "")), S["body_s"])]


def solution(q):
    s = q["sol"]
    fl = [item_header(q)]
    if q.get("no") == 25:
        fl.extend(data_table(q))
    elif q.get("ref"):
        src = QMAP[q["ref"]]
        marked = [(c, k) for _f, c, k in sentences(src) if re.search(r"\[\[\d\]\]", c)]
        fl.append(Paragraph("■ 해당 문장", S["h"]))
        fl.append(Paragraph("※ 지문 전문과 직독직해는 %d번 해설을 참조하십시오." % q["ref"], S["body_s"]))
        if marked:
            rows = []
            for c, k in marked:
                rows.append([[Paragraph('<font name="%s">%s</font>' % (rlib.SERIF_BOLD, rlib.md(c)), S["en"]),
                              Paragraph(rlib.md(k), S["ko"])]])
            t = Table(rows, colWidths=[COL_W])
            t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                                   ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                                   ("TOPPADDING", (0, 0), (-1, -1), 0.6),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 3.0)]))
            fl.append(t)
        else:
            fl.append(Paragraph("밑줄 (a)~(e)가 포함된 문장의 지칭 관계를 아래 해설에서 하나씩 확인하십시오.",
                                S["body_s"]))
    else:
        fl.extend(jikdok(q))

    fl.append(Paragraph("■ 해설", S["h"]))
    fl.append(Paragraph("<b>주제</b>  " + s["topic"], S["body"]))
    fl.append(Paragraph("<b>요지</b>  " + s["gist"], S["body"]))
    fl.append(Paragraph("정답 근거", S["lab"]))
    for e in s["evid"]:
        fl.append(Paragraph("· " + strip_marker(e), S["body_s"]))
    fl.append(Paragraph("선택지 분석", S["lab"]))
    for i, w in enumerate(s.get("wrong", []), 1):
        txt = strip_marker(w)
        col = "#b03030" if ("정답" in w) else "#222222"
        mark = "◈" if "정답" in w else "·"
        fl.append(Paragraph('<font color="%s">%s %s</font> %s' % (col, mark, CIRC[i - 1], txt), S["body_s"]))
    fl.append(Paragraph("필수 어휘", S["lab"]))
    vocab = " / ".join("%s %s" % (w, m) for w, m in s.get("vocab", []))
    fl.append(Paragraph(vocab, S["body_s"]))
    if s.get("note"):
        fl.append(Paragraph("구문·접근 포인트", S["lab"]))
        fl.append(Paragraph(s["note"], S["body_s"]))
    fl.append(Spacer(1, 4.2 * mm))
    return fl


def group_heads(fl):
    """소제목(■)이 단 하단에 홀로 남지 않도록 다음 흐름물과 묶는다."""
    out = []
    i = 0
    while i < len(fl):
        f = fl[i]
        is_head = isinstance(f, Paragraph) and f.text.startswith("■")
        if is_head and i + 1 < len(fl):
            out.append(KeepTogether([f, fl[i + 1]]))
            i += 2
        else:
            out.append(f)
            i += 1
    return out


# ---------------------------------------------------------------- page deco
def deco(canv, doc):
    canv.saveState()
    canv.setFont(rlib.SANS_B, 7.8)
    canv.setFillColor(rlib.INK)
    canv.drawString(LM, PAGE_H - 11 * mm, "2026학년도 대학수학능력시험 대비 모의평가 · 영어 영역 (독해) 해설지")
    canv.setFont(rlib.SANS, 7.2)
    canv.setFillColor(rlib.GRAY)
    canv.drawRightString(PAGE_W - RM, PAGE_H - 11 * mm, "직독직해 분석")
    canv.setStrokeColor(rlib.RULE)
    canv.setLineWidth(0.5)
    canv.line(LM, PAGE_H - 13 * mm, PAGE_W - RM, PAGE_H - 13 * mm)
    canv.line(LM, BM - 4 * mm, PAGE_W - RM, BM - 4 * mm)
    canv.setFont(rlib.SANS, 7.0)
    canv.setFillColor(rlib.GRAY)
    canv.drawCentredString(PAGE_W / 2, BM - 7.6 * mm, "%d쪽" % doc.page)
    canv.restoreState()


def build():
    rlib.register_fonts()
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "2026_고3_9월_모의평가_영어_해설지_직독직해.pdf")
    doc = BaseDocTemplate(path, pagesize=A4, leftMargin=LM, rightMargin=RM, topMargin=TM,
                          bottomMargin=BM, title="영어 영역 해설 및 직독직해 분석",
                          author="Arena Agent")
    full = Frame(LM, BM, PAGE_W - LM - RM, COL_H, id="full", leftPadding=0, rightPadding=0,
                 topPadding=0, bottomPadding=0)
    c1 = Frame(LM, BM, COL_W, COL_H, id="c1", leftPadding=0, rightPadding=0, topPadding=0,
               bottomPadding=0)
    c2 = Frame(LM + COL_W + GAP, BM, COL_W, COL_H, id="c2", leftPadding=0, rightPadding=0,
               topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[full], onPage=deco),
        PageTemplate(id="body", frames=[c1, c2], onPage=deco),
    ])

    story = [Spacer(1, 6 * mm)]
    story.extend(cover_flow())
    story.append(PageBreak())
    story.extend(sources_flow())
    story.append(NextPageTemplate("body"))
    story.append(PageBreak())
    for q in QUESTIONS:
        words = sum(len(clean(x[0]).split()) for x in sentences(q)) if q.get("blocks") else 0
        if q.get("ref"):
            need = 46
        elif words > 260:
            need = 150
        else:
            need = 74
        story.append(CondPageBreak(need * mm))
        fl = group_heads(solution(q))
        # 문항 헤더가 단 하단에 홀로 남지 않도록 첫 내용과 묶는다
        story.append(KeepTogether(fl[:2]))
        story.extend(fl[2:])
    doc.build(story)
    print("written:", path)
    return path


if __name__ == "__main__":
    build()
