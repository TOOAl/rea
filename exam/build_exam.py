# -*- coding: utf-8 -*-
"""문제지 PDF 생성기 (A4 2단 편집, 수능형 지면)."""
import os
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import Frame, KeepTogether, Paragraph, Spacer, Table, TableStyle
from reportlab.platypus.flowables import Flowable

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
LM = RM = 11.5 * mm
TM = 20.5 * mm
BM = 14 * mm
GAP = 7 * mm
FULL_W = PAGE_W - LM - RM
COL_W = (PAGE_W - LM - RM - GAP) / 2
CUR_W = [COL_W]
COL_H = PAGE_H - TM - BM


# --------------------------------------------------------------- chart
class BarChart(Flowable):
    def __init__(self, caption, groups, series, note=None, width=COL_W, height=55 * mm):
        Flowable.__init__(self)
        self.caption, self.groups, self.series, self.note = caption, groups, series, note
        self.width, self.height = width, height
        self.pad_l, self.pad_r, self.pad_b, self.pad_t = 11 * mm, 3 * mm, 10 * mm, 8 * mm

    def wrap(self, aw, ah):
        return self.width, self.height + 7 * mm

    def draw(self):
        c = self.canv
        w, h = self.width, self.height
        c.saveState()
        c.setFont(rlib.SANS_B, 7.4)
        c.setFillColor(rlib.INK)
        c.drawCentredString(w / 2, h + 3.0 * mm, self.caption)
        c.restoreState()

        left, right = self.pad_l, w - self.pad_r
        bottom, top = self.pad_b, h - self.pad_t
        c.setStrokeColor(colors.HexColor("#c2c2c2"))
        c.setLineWidth(0.4)
        c.setFont(rlib.SERIF, 5.8)
        c.setFillColor(rlib.GRAY)
        for v in range(0, 101, 20):
            y = bottom + (top - bottom) * v / 100.0
            c.line(left, y, right, y)
            c.drawRightString(left - 1.6 * mm, y - 1.6, str(v))
        c.setStrokeColor(colors.HexColor("#666666"))
        c.setLineWidth(0.6)
        c.line(left, bottom, left, top)

        n_g = len(self.groups)
        gw = (right - left) / n_g
        n_s = len(self.series)
        bw = gw * 0.70 / n_s
        palette = ["#2f4b6e", "#7f9bb5", "#bccbd8", "#9a9a9a"]
        for gi, g in enumerate(self.groups):
            gx = left + gw * gi
            for si, (name, vals) in enumerate(self.series):
                v = vals[gi]
                bx = gx + gw * 0.15 + bw * si
                bh = (top - bottom) * v / 100.0
                c.setFillColor(colors.HexColor(palette[si % len(palette)]))
                c.rect(bx, bottom, bw * 0.92, bh, stroke=0, fill=1)
                c.setFillColor(rlib.INK)
                c.setFont(rlib.SERIF, 5.4)
                c.drawCentredString(bx + bw * 0.46, bottom + bh + 0.7 * mm, str(v))
            c.setFillColor(rlib.INK)
            c.setFont(rlib.SERIF, 6.2)
            c.drawCentredString(gx + gw / 2, bottom - 4.0 * mm, g)

        lx = left
        ly = h - 3.6 * mm
        c.setFont(rlib.SERIF, 5.9)
        for si, (name, _vals) in enumerate(self.series):
            c.setFillColor(colors.HexColor(palette[si % len(palette)]))
            c.rect(lx, ly - 0.2 * mm, 3.2 * mm, 2.1 * mm, stroke=0, fill=1)
            c.setFillColor(rlib.INK)
            c.drawString(lx + 4.2 * mm, ly, name)
            lx += c.stringWidth(name, rlib.SERIF, 5.9) + 10 * mm
        if self.note:
            c.setFont(rlib.SERIF, 5.7)
            c.setFillColor(rlib.GRAY)
            c.drawString(left, 2.0 * mm, self.note)


# --------------------------------------------------------------- text hygiene
import re as _re


def clean(en):
    """문제지용: 분석 표기(' / ')를 제거한 자연스러운 문장으로 복원한다."""
    if en is None:
        return en
    s = en.replace(" / ", " ")
    s = _re.sub(r"\s+", " ", s).strip()
    return s


# --------------------------------------------------------------- blocks
def passage_flowables(q, st):
    out = []
    for b in q["blocks"] or []:
        t = b["t"]
        if t == "p":
            if b.get("sep"):
                for s in b["s"]:
                    out.append(Paragraph(rlib.md(clean(s["en"])), st["en"]))
            else:
                joined = " ".join(clean(x["en"]) for x in b["s"])
                out.append(Paragraph(rlib.md(joined), st["en"]))
            out.append(Spacer(1, 1.4 * mm))
        elif t == "line":
            out.append(Paragraph(rlib.md(clean(b["en"])), st["en_tight"]))
        elif t == "title":
            out.append(Paragraph(rlib.md(clean(b["en"])), st["en_b"]))
        elif t == "sub":
            out.append(Paragraph('<font name="%s" size="7.4">%s</font>' % (rlib.SANS, rlib.md(clean(b["en"]))),
                                 st["en_c"]))
            out.append(Spacer(1, 1.8 * mm))
        elif t == "bul":
            items = [["•", Paragraph(rlib.md(clean(x["en"])), st["en_tight"])] for x in b["items"]]
            tbl = Table(items, colWidths=[3.4 * mm, CUR_W[0] - 6 * mm], hAlign="LEFT")
            tbl.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (0, -1), rlib.SERIF),
                ("FONTNAME", (1, 0), (1, -1), rlib.SERIF),
                ("FONTSIZE", (1, 0), (1, -1), 8.6),
                ("TEXTCOLOR", (0, 0), (-1, -1), rlib.INK),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 0.8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0.8),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ]))
            out.append(tbl)
            out.append(Spacer(1, 1.6 * mm))
        elif t == "given":
            p = Paragraph(rlib.md(clean(b["en"])), st["en"])
            tbl = Table([[p]], colWidths=[CUR_W[0] - 1 * mm], hAlign="LEFT")
            tbl.setStyle(TableStyle([
                ("BOX", (0, 0), (-1, -1), 0.6, rlib.RULE),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f2f2f2")),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.6),
                ("TOPPADDING", (0, 0), (-1, -1), 3.0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.0),
            ]))
            out.append(tbl)
            out.append(Spacer(1, 2.4 * mm))
        elif t == "plab":
            out.append(Paragraph('<font name="%s">%s</font>' % (rlib.SERIF_BOLD, b["label"]),
                                 st["en_tight"]))
            for s in b["s"]:
                out.append(Paragraph(rlib.md(clean(s["en"])), st["en"]))
            out.append(Spacer(1, 1.2 * mm))
        elif t == "summary":
            ps = []
            for s in b["s"]:
                ps.append(Paragraph(rlib.md(clean(s["en"])), st["en"]))
            ps.append(Paragraph('<font name="%s" size="6.8">Summary</font>' % rlib.SANS_B,
                                st["chart_note"]))
            tbl = Table([[ps]], colWidths=[CUR_W[0] - 1 * mm], hAlign="LEFT")
            tbl.setStyle(TableStyle([
                ("BOX", (0, 0), (-1, -1), 0.9, rlib.INK),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3.4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.4),
            ]))
            out.append(Spacer(1, 1.0 * mm))
            out.append(tbl)
        elif t == "chart":
            out.append(BarChart(b["caption"], b["groups"], b["series"], b.get("note"), width=CUR_W[0]))
    return out


def number_cell(q):
    num = Paragraph('<font name="%s" size="10.2">%d</font>' % (rlib.SANS_B, q["no"]),
                    rlib.ParagraphStyle("n", fontName=rlib.SANS_B, fontSize=10.2, leading=12,
                                        alignment=1))
    inner = [num]
    if q.get("pts") == 3:
        inner.append(Paragraph('<font name="%s" size="6.4">[3점]</font>' % rlib.SANS,
                               rlib.ParagraphStyle("p", fontName=rlib.SANS, fontSize=6.4,
                                                   leading=8, alignment=1)))
    return inner


def question_flowables(q, st, with_passage=True):
    out = []
    left = number_cell(q)
    right = [Paragraph(rlib.md(q["inst"]), st["inst"])]
    tbl = Table([[left, right]], colWidths=[9.8 * mm, CUR_W[0] - 9.8 * mm], hAlign="LEFT")
    tbl.setStyle(TableStyle([
        ("BOX", (0, 0), (0, 0), 0.7, rlib.INK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("VALIGN", (0, 0), (0, 0), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 1),
        ("RIGHTPADDING", (0, 0), (0, 0), 1),
        ("LEFTPADDING", (1, 0), (1, 0), 3.4),
        ("RIGHTPADDING", (1, 0), (1, 0), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 1.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.4),
    ]))
    out.append(tbl)
    out.append(Spacer(1, 1.8 * mm))
    if with_passage:
        out.extend(passage_flowables(q, st))
    ch = q.get("choices")
    if ch:
        if all(len(x) <= 8 for x in ch):
            cells = []
            for i, c in enumerate(ch, 1):
                cells.append(Paragraph('<font name="%s">%s</font> %s' % (
                    rlib.SANS_B, rlib.CIRCLE[i - 1], rlib.md(clean(c))), st["en_tight"]))
            row = Table([cells], colWidths=[CUR_W[0] / len(cells)] * len(cells), hAlign="LEFT")
            row.setStyle(TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), 1.0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1.0),
                ("TOPPADDING", (0, 0), (-1, -1), 0.8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0.8),
            ]))
            out.append(row)
        else:
            for i, c in enumerate(ch, 1):
                out.append(Paragraph('<font name="%s">%s</font>&#160;%s' % (
                    rlib.SANS_B, rlib.CIRCLE[i - 1], rlib.md(clean(c))), st["choice"]))
        out.append(Spacer(1, 3.2 * mm))
    else:
        out.append(Spacer(1, 4.0 * mm))
    return out


# --------------------------------------------------------------- cover
def cover_flowables(st):
    out = []
    out.append(Paragraph('<font name="%s" size="8.4">2026학년도 대학수학능력시험 대비</font>'
                         % rlib.SANS, st["cover_sub"]))
    out.append(Spacer(1, 1.4 * mm))
    out.append(Paragraph("모의평가 문제지", st["cover_title"]))
    out.append(Spacer(1, 1.0 * mm))
    out.append(Paragraph("영어 영역 (독해)", st["cover_title"]))
    out.append(Spacer(1, 2.0 * mm))
    out.append(Paragraph("3교시  ·  듣기 평가(1~17번) 제외  ·  28문항  ·  63점  ·  70분", st["cover_sub"]))
    out.append(Spacer(1, 5 * mm))

    idtbl = Table([
        [Paragraph("성명", st["ko_c"]), Paragraph("", st["ko"]),
         Paragraph("수험번호", st["ko_c"]), Paragraph("", st["ko"])],
    ], colWidths=[16 * mm, 60 * mm, 22 * mm, 62 * mm], rowHeights=[10 * mm], hAlign="CENTER")
    idtbl.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.7, rlib.INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#ededed")),
        ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#ededed")),
    ]))
    out.append(idtbl)
    out.append(Spacer(1, 6 * mm))

    out.append(Paragraph("■ 유의 사항", st["s_head"]))
    notes = [
        "이 문제지는 첨부된 <b>2026학년도 고3 9월 모의고사 손필기 분석지(18~45번)</b>의 지문 주제를 바탕으로, 듣기 문항을 제외하고 독해 28문항만으로 재구성한 학습용 모의평가입니다.",
        "문항 수는 28문항이며, 배점은 실제 수능과 동일하게 2점 21문항 · 3점 7문항으로 차등 배점하였습니다(총 63점).",
        "모든 문항은 5지 선다형입니다. 답안은 답안지의 해당란에 표기하시오.",
        "지문은 실제 외국 기사·저널 및 저작의 논지를 수능 지문 수준으로 재서술한 것이며, 원문을 그대로 인용하지 않았습니다.",
        "문항의 지시문은 실제 수능과 같이 한국어로, 지문과 선택지는 영어로 제시하였습니다.",
        "문항 유형·배점·지면 구성(2단 편집, 문항 번호 상자, 선택지 ①~⑤)은 실제 수능 영어 영역 문제지의 형식을 따랐습니다.",
    ]
    for n in notes:
        out.append(Paragraph("○ " + n, st["cover_small"]))
    out.append(Spacer(1, 6 * mm))

    out.append(Paragraph("■ 문항 구성", st["s_head"]))
    half = 14
    rows = [[Paragraph("번호", st["ko_c"]), Paragraph("문항 유형", st["ko"]), Paragraph("배점", st["ko_c"]),
             Paragraph("번호", st["ko_c"]), Paragraph("문항 유형", st["ko"]), Paragraph("배점", st["ko_c"])]]
    for i in range(half):
        a = meta.STRUCTURE[i]
        b = meta.STRUCTURE[i + half] if i + half < len(meta.STRUCTURE) else ("", "", "")
        rows.append([Paragraph(str(a[0]), st["ko_c"]), Paragraph(a[1], st["ko"]),
                     Paragraph("%d점" % a[2], st["ko_c"]),
                     Paragraph(str(b[0]), st["ko_c"]), Paragraph(b[1], st["ko"]),
                     Paragraph(("%d점" % b[2]) if b[0] != "" else "", st["ko_c"])])
    cfg = Table(rows, colWidths=[12 * mm, 55 * mm, 13 * mm, 12 * mm, 55 * mm, 13 * mm],
                repeatRows=1, hAlign="LEFT")
    cfg.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, rlib.RULE),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6edf4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.6),
    ]))
    out.append(cfg)
    out.append(Spacer(1, 6 * mm))
    out.append(Paragraph("■ 지문 출처", st["s_head"]))
    out.append(Paragraph(
        "각 문항의 원출처(실제 외국 기사·저널·저작)와 EBS 수능특강·수능완성 대응 유형은 "
        "<b>해설지 1쪽 ‘지문 출처 및 EBS 연계 분석’</b>에 문항별로 정리되어 있습니다.", st["cover_small"]))
    return out


# --------------------------------------------------------------- decorations
def draw_cover_deco(canv):
    canv.saveState()
    canv.setStrokeColor(rlib.INK)
    canv.setLineWidth(1.1)
    canv.rect(9 * mm, 9 * mm, PAGE_W - 18 * mm, PAGE_H - 18 * mm)
    canv.setLineWidth(0.4)
    canv.rect(10.4 * mm, 10.4 * mm, PAGE_W - 20.8 * mm, PAGE_H - 20.8 * mm)
    canv.setFont(rlib.SANS_B, 9.4)
    canv.setFillColor(rlib.INK)
    canv.drawString(16 * mm, PAGE_H - 21 * mm, "홀수형")
    canv.setFont(rlib.SANS, 7.6)
    canv.setFillColor(rlib.GRAY)
    canv.drawRightString(PAGE_W - 16 * mm, PAGE_H - 20.6 * mm, "2026학년도 9월 모의평가 재구성")
    canv.setStrokeColor(rlib.RULE)
    canv.setLineWidth(0.4)
    canv.line(16 * mm, PAGE_H - 23 * mm, PAGE_W - 16 * mm, PAGE_H - 23 * mm)
    canv.restoreState()


def draw_body_deco(canv, page_no):
    canv.saveState()
    canv.setFont(rlib.SANS, 7.4)
    canv.setFillColor(rlib.GRAY)
    canv.drawString(LM, PAGE_H - 12.8 * mm, "2026학년도 대학수학능력시험 대비 모의평가 · 영어 영역 (독해)")
    canv.setFont(rlib.SANS_B, 7.8)
    canv.setFillColor(rlib.INK)
    canv.drawString(LM, PAGE_H - 17.6 * mm, "홀수형")
    canv.setFont(rlib.SANS, 7.4)
    canv.setFillColor(rlib.GRAY)
    canv.drawString(LM + 13 * mm, PAGE_H - 17.6 * mm, "듣기 평가(1~17번) 제외 · 28문항 63점 · 70분")
    canv.drawRightString(PAGE_W - RM, PAGE_H - 12.8 * mm, "3교시")
    canv.setStrokeColor(rlib.RULE)
    canv.setLineWidth(0.5)
    canv.line(LM, PAGE_H - 14.8 * mm, PAGE_W - RM, PAGE_H - 14.8 * mm)
    canv.line(LM, BM - 4.5 * mm, PAGE_W - RM, BM - 4.5 * mm)
    canv.setFont(rlib.SANS, 7.2)
    canv.setFillColor(rlib.GRAY)
    canv.drawCentredString(PAGE_W / 2, BM - 8.2 * mm, "영어 영역 (독해)  ·  %d쪽" % page_no)
    canv.restoreState()


# --------------------------------------------------------------- build
def build():
    rlib.register_fonts()
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "2026_고3_9월_모의평가_영어_문제지.pdf")
    canv = pdfcanvas.Canvas(path, pagesize=A4)
    canv.setTitle("2026학년도 대학수학능력시험 대비 모의평가 영어 영역 (독해) 문제지")
    canv.setAuthor("Arena Agent")
    canv.setSubject("영어 영역 문제지 (듣기 제외 28문항)")

    # ---- cover
    draw_cover_deco(canv)
    frame = Frame(LM + 6 * mm, BM + 4 * mm, PAGE_W - 2 * (LM + 6 * mm), COL_H - 8 * mm,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    story = [Spacer(1, 15 * mm)] + cover_flowables(ST)
    frame.addFromList(story, canv)
    canv.showPage()

    # ---- body
    page_no = 2
    col = 0
    frames = []

    def new_page(wide=False):
        nonlocal page_no, col, frames
        draw_body_deco(canv, page_no)
        if wide:
            frames = [
                Frame(LM, BM, FULL_W, COL_H, leftPadding=0, rightPadding=0, topPadding=0,
                      bottomPadding=0, id="w1"),
            ]
            col = 0
            page_no += 1
            return
        frames = [
            Frame(LM, BM, COL_W, COL_H, leftPadding=0, rightPadding=0, topPadding=0,
                  bottomPadding=0, id="c1"),
            Frame(LM + COL_W + GAP, BM, COL_W, COL_H, leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0, id="c2"),
        ]
        col = 0
        page_no += 1

    new_page()

    def remaining():
        f = frames[col]
        return max(0, f._y - f._y1 - 4)

    WIDE = [False]

    def advance():
        nonlocal col
        col += 1
        if WIDE[0]:
            if col > 0:
                canv.showPage()
                new_page(wide=True)
            return
        if col > 1:
            canv.showPage()
            new_page()

    def height_of(fl):
        return sum(h_of(f) for f in fl)

    def h_of(f):
        try:
            return f.wrap(CUR_W[0], COL_H)[1] + f.getSpaceBefore() + f.getSpaceAfter()
        except Exception:
            return 0

    def put(fl):
        """흐름물을 남는 공간에 맞춰 한 개씩 확정 배치한다(누락 방지)."""
        for f in fl:
            guard = 0
            while guard < 30:
                guard += 1
                if h_of(f) > remaining() and remaining() < COL_H - 2:
                    advance()
                    continue
                before = remaining()
                frames[col].addFromList([f], canv)
                if abs(remaining() - before) < 0.01:
                    advance()
                    continue
                break
            else:
                raise RuntimeError("flowable could not be placed")

    def place_question(q, with_passage=True):
        header, body = [], []
        inst = Paragraph(rlib.md(q["inst"]), ST["inst"])
        left = number_cell(q)
        tbl = Table([[left, [inst]]], colWidths=[9.8 * mm, CUR_W[0] - 9.8 * mm], hAlign="LEFT")
        tbl.setStyle(TableStyle([
            ("BOX", (0, 0), (0, 0), 0.7, rlib.INK),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("VALIGN", (0, 0), (0, 0), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (0, 0), 1),
            ("RIGHTPADDING", (0, 0), (0, 0), 1),
            ("LEFTPADDING", (1, 0), (1, 0), 3.4),
            ("RIGHTPADDING", (1, 0), (1, 0), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1.4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1.4),
        ]))
        header.append(tbl)
        header.append(Spacer(1, 1.8 * mm))
        if with_passage:
            body.extend(passage_flowables(q, ST))
        ch = q.get("choices")
        if ch:
            if all(len(x) <= 8 for x in ch):
                cells = [Paragraph('<font name="%s">%s</font> %s' % (
                    rlib.SANS_B, rlib.CIRCLE[i - 1], rlib.md(clean(c))), ST["en_tight"])
                    for i, c in enumerate(ch, 1)]
                row = Table([cells], colWidths=[CUR_W[0] / len(cells)] * len(cells), hAlign="LEFT")
                row.setStyle(TableStyle([
                    ("LEFTPADDING", (0, 0), (-1, -1), 1.0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 1.0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0.8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0.8),
                ]))
                choice_fl = [row, Spacer(1, 2.6 * mm)]
            else:
                choice_fl = []
                for i, c in enumerate(ch, 1):
                    choice_fl.append(Paragraph('<font name="%s">%s</font>&#160;%s' % (
                        rlib.SANS_B, rlib.CIRCLE[i - 1], rlib.md(clean(c))), ST["choice"]))
                choice_fl.append(Spacer(1, 2.6 * mm))
        else:
            choice_fl = []
        total_h = height_of(header + body + choice_fl)
        if not with_passage and not body and not choice_fl:
            put(header)
            return
        if total_h <= remaining() + 1:
            put(header + body + choice_fl)
            return
        if total_h <= COL_H - 4:
            # 한 단에 다 들어가는 문항: 통째로 다음 단으로 넘긴다
            if not with_passage or remaining() < COL_H * 0.35:
                advance()
            put(header + body + choice_fl)
            return
        # 한 단보다 긴 지문: 문단 단위로 나누어 배치
        if h_of(header) + (h_of(body[0]) if body else 0) > remaining():
            advance()
        put(header)
        if body:
            put(body)
        if choice_fl:
            if height_of(choice_fl) > remaining() and remaining() < COL_H * 0.3:
                advance()
            put(choice_fl)

    def start_group(h, first_h=0, last_h=0):
        """한 지문 묶음(1지문 2~3문항)이 한 지면 안에 들어오도록 시작 위치를 정한다."""
        if h <= remaining() + 2:
            return
        if h <= COL_H - 4:
            advance()
            return
        # 지문이 한 단보다 길면 새 단(가능하면 새 지면 첫 단)에서 시작한다
        if remaining() < COL_H - 6:
            advance()

    i = 0
    def group_label(a, b):
        return Paragraph('<font name="%s" size="7.8">[%d~%d] 다음 글을 읽고 물음에 답하시오.</font>'
                         % (rlib.SANS_B, a, b), ST["inst_s"])

    while i < len(QUESTIONS):
        q = QUESTIONS[i]
        group = [q]
        j = i + 1
        while j < len(QUESTIONS) and QUESTIONS[j].get("ref") == q["no"]:
            group.append(QUESTIONS[j])
            j += 1
        gh = sum(height_of(question_flowables(gq, ST, with_passage=(k == 0)))
                 for k, gq in enumerate(group))
        lab_no = (q["no"], group[-1]["no"])
        if len(group) > 2 and gh > COL_H - 6:
            # 한 단에 담기지 않는 1지문 3문항 장문: 1단 전체 폭 지면에 배치
            canv.showPage()
            WIDE[0] = True
            CUR_W[0] = FULL_W
            new_page(wide=True)
            put([group_label(*lab_no), Spacer(1, 2.0 * mm)])
            for k, gq in enumerate(group):
                place_question(gq, with_passage=(k == 0))
            WIDE[0] = False
            CUR_W[0] = COL_W
            if j < len(QUESTIONS):
                canv.showPage()
                new_page()
            i = j
            continue
        if len(group) > 1:
            start_group(gh)
            put([group_label(*lab_no), Spacer(1, 1.4 * mm)])
        for k, gq in enumerate(group):
            if k > 0:
                rest = sum(height_of(question_flowables(g2, ST, with_passage=False))
                           for g2 in group[k:])
                if rest <= COL_H - 6 and rest > remaining():
                    advance()
            place_question(gq, with_passage=(k == 0))
        i = j

    canv.save()
    print("written:", path, "pages:", page_no)
    return path


if __name__ == "__main__":
    build()
