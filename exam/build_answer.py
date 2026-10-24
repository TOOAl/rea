# -*- coding: utf-8 -*-
"""답안지(OMR) PDF 생성기."""
import os
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
from reportlab.platypus.flowables import Flowable

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meta  # noqa: E402
from content1 import Q1  # noqa: E402
from content2 import Q2  # noqa: E402
from content3 import Q3  # noqa: E402

QMAP = {q["no"]: q for q in (Q1 + Q2 + Q3)}
import rlib  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output")
PAGE_W, PAGE_H = A4
LM = RM = 16 * mm
ST = rlib.styles()


class Bubbles(Flowable):
    """문항 번호 + 5개 선택 타원(OMR)."""

    def __init__(self, numbers, width, rows_per_col):
        Flowable.__init__(self)
        self.numbers = numbers
        self.width = width
        self.rows_per_col = rows_per_col
        self.row_h = 11.2 * mm

    def wrap(self, aw, ah):
        self.height = self.rows_per_col * self.row_h
        return self.width, self.height

    def draw(self):
        c = self.canv
        ncols = 2
        colw = self.width / ncols
        for idx, no in enumerate(self.numbers):
            col = idx // self.rows_per_col
            row = idx % self.rows_per_col
            x0 = col * colw
            y = self.height - (row + 1) * self.row_h
            # number
            c.setStrokeColor(colors.HexColor("#888888"))
            c.setLineWidth(0.5)
            c.setFillColor(colors.white)
            c.rect(x0, y + 2.4 * mm, 10 * mm, 6.4 * mm, stroke=1, fill=1)
            c.setFont(rlib.SANS_B, 8.6)
            c.setFillColor(rlib.INK)
            c.drawCentredString(x0 + 5 * mm, y + 4.4 * mm, str(no))
            # bubbles
            bw, bh = 8.4 * mm, 5.0 * mm
            gap = 1.5 * mm
            for k in range(5):
                bx = x0 + 13.5 * mm + k * (bw + gap)
                c.setStrokeColor(colors.HexColor("#9a9a9a"))
                c.setLineWidth(0.55)
                c.ellipse(bx, y + 3.0 * mm, bx + bw, y + 3.0 * mm + bh, stroke=1, fill=0)
                c.setFont(rlib.SERIF, 5.6)
                c.setFillColor(colors.HexColor("#666666"))
                c.drawCentredString(bx + bw / 2, y + 4.4 * mm, rlib.CIRCLE[k])


def build():
    rlib.register_fonts()
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "2026_고3_9월_모의평가_영어_답안지.pdf")
    c = pdfcanvas.Canvas(path, pagesize=A4)
    c.setTitle("2026학년도 대학수학능력시험 대비 모의평가 영어 영역 답안지")

    # frame
    c.setStrokeColor(rlib.INK)
    c.setLineWidth(1.0)
    c.rect(10 * mm, 10 * mm, PAGE_W - 20 * mm, PAGE_H - 20 * mm)
    c.setLineWidth(0.4)
    c.rect(11.4 * mm, 11.4 * mm, PAGE_W - 22.8 * mm, PAGE_H - 22.8 * mm)

    c.setFont(rlib.SANS_B, 15)
    c.setFillColor(rlib.INK)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 27 * mm, "답 안 지")
    c.setFont(rlib.SANS, 9.4)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 34 * mm,
                        "2026학년도 대학수학능력시험 대비 모의평가 · 영어 영역 (독해) · 3교시")
    c.setFont(rlib.SANS, 8.2)
    c.setFillColor(rlib.GRAY)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 39.5 * mm, "28문항 · 63점 · 5지 선다형")

    # 수험 정보
    top = PAGE_H - 44 * mm
    tbl = Table([[Paragraph("성명", ST["ko_c"]), Paragraph("", ST["ko"]),
                  Paragraph("수험번호", ST["ko_c"]), Paragraph("", ST["ko"])]],
                colWidths=[18 * mm, 62 * mm, 24 * mm, 62 * mm], rowHeights=[11 * mm])
    tbl.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.8, rlib.INK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#efefef")),
        ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#efefef")),
    ]))
    w, h = tbl.wrap(PAGE_W - 2 * LM, 100)
    tbl.drawOn(c, (PAGE_W - w) / 2, top - h)

    # 유의사항
    y = top - h - 10 * mm
    c.setFont(rlib.SANS_B, 8.8)
    c.setFillColor(rlib.INK)
    c.drawString(LM + 2 * mm, y, "■ 답안 작성 시 유의 사항")
    notes = [
        "한 문항에 두 개 이상 표기한 경우에는 무효 처리됩니다.",
        "수정하고자 할 때에는 표기한 부분을 지우개로 깨끗이 지운 후 다시 표기하시오.",
        "선택 영역(①~⑤) 이외의 부분에는 아무것도 표기하지 마시오.",
        "문항 번호와 답란의 번호가 일치하는지 반드시 확인하시오.",
    ]
    c.setFont(rlib.SANS, 7.6)
    c.setFillColor(rlib.GRAY)
    for i, n in enumerate(notes):
        c.drawString(LM + 4 * mm, y - (5.4 + i * 4.6) * mm, "○ " + n)

    # 문항 배점 안내
    y2 = y - (5.4 + len(notes) * 4.6) * mm - 4 * mm
    three = [str(no) for no, label, pts in meta.STRUCTURE if pts == 3]
    c.setFont(rlib.SANS, 7.6)
    c.setFillColor(rlib.INK)
    c.drawString(LM + 4 * mm, y2, "○ 3점 문항: " + ", ".join(three) + "번 / 나머지 문항은 2점")

    # OMR
    numbers = [no for no, label, pts in meta.STRUCTURE]
    bw = PAGE_W - 2 * (LM + 2 * mm)
    omr = Bubbles(numbers, bw, 14)
    ow, oh = omr.wrap(bw, 100)
    omr.drawOn(c, LM + 2 * mm, y2 - 10 * mm - oh)

    c.setFont(rlib.SANS, 7)
    c.setFillColor(rlib.GRAY)
    c.drawCentredString(PAGE_W / 2, 16 * mm,
                        "2026학년도 대학수학능력시험 대비 모의평가 · 영어 영역 답안지")
    c.showPage()

    # ------------------------------------------------ 정답 및 배점표
    c.setStrokeColor(rlib.INK)
    c.setLineWidth(1.0)
    c.rect(10 * mm, 10 * mm, PAGE_W - 20 * mm, PAGE_H - 20 * mm)
    c.setFont(rlib.SANS_B, 13)
    c.setFillColor(rlib.INK)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 26 * mm, "정답 및 배점표")
    c.setFont(rlib.SANS, 8.6)
    c.setFillColor(rlib.GRAY)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 32 * mm,
                        "2026학년도 대학수학능력시험 대비 모의평가 · 영어 영역 (독해) · 28문항 63점")

    rows = [[Paragraph("번호", ST["ko_c"]), Paragraph("정답", ST["ko_c"]),
             Paragraph("배점", ST["ko_c"]), Paragraph("유형", ST["ko"]),
             Paragraph("번호", ST["ko_c"]), Paragraph("정답", ST["ko_c"]),
             Paragraph("배점", ST["ko_c"]), Paragraph("유형", ST["ko"])]]
    half = 14
    for i in range(half):
        a = meta.STRUCTURE[i]
        b = meta.STRUCTURE[i + half]
        qa = QMAP[a[0]]
        qb = QMAP[b[0]]
        rows.append([
            Paragraph(str(a[0]), ST["ko_c"]),
            Paragraph('<font name="%s">%s</font>' % (rlib.SANS_B, rlib.CIRCLE[qa["ans"] - 1]), ST["ko_c"]),
            Paragraph("%d" % a[2], ST["ko_c"]),
            Paragraph(a[1], ST["ko"]),
            Paragraph(str(b[0]), ST["ko_c"]),
            Paragraph('<font name="%s">%s</font>' % (rlib.SANS_B, rlib.CIRCLE[qb["ans"] - 1]), ST["ko_c"]),
            Paragraph("%d" % b[2], ST["ko_c"]),
            Paragraph(b[1], ST["ko"]),
        ])
    t2 = Table(rows, colWidths=[12 * mm, 12 * mm, 11 * mm, 52 * mm, 12 * mm, 12 * mm, 11 * mm, 52 * mm],
               repeatRows=1)
    t2.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, rlib.RULE),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6edf4")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.0),
    ]))
    tw, th = t2.wrap(PAGE_W - 2 * LM, PAGE_H)
    t2.drawOn(c, (PAGE_W - tw) / 2, PAGE_H - 40 * mm - th)

    y = PAGE_H - 46 * mm - th
    c.setFont(rlib.SANS_B, 8.6)
    c.setFillColor(rlib.INK)
    c.drawString(LM + 2 * mm, y, "■ 배점 요약")
    c.setFont(rlib.SANS, 7.8)
    c.setFillColor(rlib.GRAY)
    lines = [
        "2점 문항 21개(42점) + 3점 문항 7개(21점) = 63점 (듣기 1~17번 제외)",
        "3점 문항: " + ", ".join(str(no) for no, label, pts in meta.STRUCTURE if pts == 3),
        "문항 유형 구성은 EBS 수능특강 영어 유형편 01~20강의 순서를 따랐습니다.",
    ]
    for i, l in enumerate(lines):
        c.drawString(LM + 4 * mm, y - (5.6 + i * 4.6) * mm, "○ " + l)

    c.setFont(rlib.SANS, 7)
    c.setFillColor(rlib.GRAY)
    c.drawCentredString(PAGE_W / 2, 16 * mm, "정답 및 배점표 · 영어 영역 (독해)")
    c.showPage()
    c.save()
    print("written:", path)
    return path


if __name__ == "__main__":
    build()
