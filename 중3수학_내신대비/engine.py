# -*- coding: utf-8 -*-
"""
중3 수학 내신 대비 변별력 50제 PDF 생성 엔진
- A4, 최소 여백(10mm), 2단 레이아웃
- NanumGothic / NanumMyeongjo 한글 폰트 사용
- 원 도형/막대그래프/점도수/산점도 등 직접 그리기 플로어블 제공
"""
import math
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, KeepTogether, Flowable, NextPageTemplate, PageBreak,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ---------------------------------------------------------------- 폰트 등록
_FONT_CANDIDATES = [
    "/home/user/fonts",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts"),
]
_fdir = next((p for p in _FONT_CANDIDATES if os.path.isdir(p)), _FONT_CANDIDATES[0])

pdfmetrics.registerFont(TTFont("G", os.path.join(_fdir, "NanumGothic.ttf")))
pdfmetrics.registerFont(TTFont("GB", os.path.join(_fdir, "NanumGothicBold.ttf")))
pdfmetrics.registerFont(TTFont("GEB", os.path.join(_fdir, "NanumGothicExtraBold.ttf")))
pdfmetrics.registerFont(TTFont("M", os.path.join(_fdir, "NanumMyeongjo.ttf")))
pdfmetrics.registerFont(TTFont("MB", os.path.join(_fdir, "NanumMyeongjoBold.ttf")))
# 수학 기호(U+2212 마이너스 등) 폴백용
pdfmetrics.registerFont(TTFont("DJV", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))

def mf(text):
    """나눔 폰트에 없는 글리프(− 등)를 DejaVu 폰트로 폴백 처리"""
    if not isinstance(text, str):
        return text
    return text.replace("−", '<font name="DJV">−</font>')

NAVY = colors.HexColor("#1F3864")
BLUE = colors.HexColor("#2E5FA3")
RED = colors.HexColor("#C00000")
DARK = colors.HexColor("#222222")
GRAY = colors.HexColor("#595959")
LIGHT = colors.HexColor("#EAF0FA")
LIGHT2 = colors.HexColor("#F5F0E6")
LINE = colors.HexColor("#9DB2D4")
GREEN = colors.HexColor("#38612F")

# ---------------------------------------------------------------- 스타일
def st(name, **kw):
    base = dict(fontName="M", fontSize=9.5, leading=13.4, textColor=DARK,
                alignment=TA_JUSTIFY, spaceAfter=2)
    base.update(kw)
    return ParagraphStyle(name, **base)

S = {
    "body": st("body", leading=12.9),
    "bodyL": st("bodyL", alignment=TA_LEFT, leading=12.9),
    "stem": st("stem", spaceAfter=2, leading=12.9),
    "choice": st("choice", alignment=TA_LEFT, leftIndent=8, spaceAfter=0.8, leading=12.6),
    "sol": st("sol", alignment=TA_LEFT, spaceAfter=1.8, leading=12.8),
    "tip": st("tip", fontSize=8.6, leading=12.0, alignment=TA_LEFT, spaceAfter=0),
    "figcap": st("figcap", fontName="G", fontSize=8, leading=10.5,
                 textColor=GRAY, alignment=TA_CENTER, spaceBefore=2, spaceAfter=4),
    "sec": st("sec", fontName="GEB", fontSize=11.5, leading=15,
              textColor=colors.white, alignment=TA_LEFT),
    "phead": st("phead", fontName="GEB", fontSize=10.5, leading=14,
                textColor=NAVY, alignment=TA_LEFT, spaceAfter=2),
    "ans": st("ans", fontName="GB", fontSize=9.8, leading=13.5,
              textColor=RED, alignment=TA_LEFT, spaceAfter=2),
    "concept": st("concept", fontName="GB", fontSize=9.2, leading=12.8,
                  textColor=BLUE, alignment=TA_LEFT, spaceAfter=2),
    "chip": st("chip", fontName="G", fontSize=7.6, leading=10,
               textColor=GRAY, alignment=TA_LEFT),
    "h1": st("h1", fontName="GEB", fontSize=19, leading=25,
             textColor=NAVY, alignment=TA_CENTER),
    "h2": st("h2", fontName="GEB", fontSize=12, leading=16,
             textColor=NAVY, alignment=TA_LEFT, spaceBefore=5, spaceAfter=3),
    "h3": st("h3", fontName="GB", fontSize=10.5, leading=14.5,
             textColor=BLUE, alignment=TA_LEFT, spaceBefore=5, spaceAfter=2),
    "cover": st("cover", fontSize=9.3, leading=14.0, alignment=TA_LEFT, spaceAfter=1.5),
    "small": st("small", fontSize=8.6, leading=12, alignment=TA_LEFT),
    "cell": st("cell", fontName="G", fontSize=8.6, leading=11.6,
               alignment=TA_CENTER, spaceAfter=0),
    "cellL": st("cellL", fontName="G", fontSize=8.6, leading=11.6,
                alignment=TA_LEFT, spaceAfter=0),
    "th": st("th", fontName="GB", fontSize=9, leading=12,
             alignment=TA_CENTER, textColor=colors.white, spaceAfter=0),
}

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def P(text, style="body"):
    return Paragraph(mf(text), S[style])

def para(text, style="body"):
    return Paragraph(mf(text), S[style])

# ---------------------------------------------------------------- 도형 공용
def _ang(v):
    return math.radians(v)

def pt_on(cx, cy, r, deg):
    a = _ang(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)

def _label(c, x, y, text, size=8.2, color=DARK, dx=0, dy=0, font="GB"):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawCentredString(x + dx, y + dy, text)

def _angle_arc(c, v, p1, p2, radius=15, label=None, color=RED, lsize=8.0):
    """v를 꼭짓점으로 하는 두 광선 v->p1, v->p2 사이의 각 호(작은 쪽)"""
    a1 = math.atan2(p1[1] - v[1], p1[0] - v[0])
    a2 = math.atan2(p2[1] - v[1], p2[0] - v[0])
    diff = (a2 - a1) % (2 * math.pi)
    if diff > math.pi:
        diff = diff - 2 * math.pi
    n = max(8, int(abs(diff) / 0.12))
    c.setStrokeColor(color)
    c.setLineWidth(1.1)
    prev = None
    for i in range(n + 1):
        a = a1 + diff * i / n
        q = (v[0] + radius * math.cos(a), v[1] + radius * math.sin(a))
        if prev:
            c.line(prev[0], prev[1], q[0], q[1])
        prev = q
    if label:
        am = a1 + diff / 2
        lx = v[0] + (radius + 9) * math.cos(am)
        ly = v[1] + (radius + 9) * math.sin(am) - 2.6
        _label(c, lx, ly, label, size=lsize, color=color)

def _right_mark(c, v, p1, p2, size=8):
    a1 = math.atan2(p1[1] - v[1], p1[0] - v[0])
    a2 = math.atan2(p2[1] - v[1], p2[0] - v[0])
    q1 = (v[0] + size * math.cos(a1), v[1] + size * math.sin(a1))
    q2 = (v[0] + size * math.cos(a2), v[1] + size * math.sin(a2))
    q3 = (q1[0] + size * math.cos(a2), q1[1] + size * math.sin(a2))
    c.setStrokeColor(DARK)
    c.setLineWidth(0.9)
    c.line(q1[0], q1[1], q3[0], q3[1])
    c.line(q3[0], q3[1], q2[0], q2[1])

# ---------------------------------------------------------------- 원 도형
class CircleFig(Flowable):
    """
    pts: [(label, 각도)], 각도는 3시 방향 기준 시계방향(도)
    chords: 현(둘레 점 둘레 점), radii: 중심-둘레 점
    ext: {label: (x,y)} 외부 점, ext_lines: [(p,p)]
    tangents: [(label, 반길이)]
    angles: [(꼭짓점, 점1, 점2, 라벨)]
    rights: [(꼭짓점, 점1, 점2)]
    dashed: [("p","p"), ...]
    label_dx/dy: {label: (dx,dy)}
    """
    def __init__(self, pts, w=236, h=196, r=62, chords=None, radii=None,
                 ext=None, ext_lines=None, tangents=None, angles=None,
                 rights=None, dashed=None, label_off=None, center="O",
                 arc_hint=None):
        super().__init__()
        self.pts = pts
        self.width, self.height, self.r = w, h, r
        self.chords = chords or []
        self.radii = radii or []
        self.ext = ext or {}
        self.ext_lines = ext_lines or []
        self.tangents = tangents or []
        self.angles = angles or []
        self.rights = rights or []
        self.dashed = dashed or []
        self.label_off = label_off or {}
        self.center = center
        self.arc_hint = arc_hint or []

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        cx, cy, r = self.width / 2, self.height / 2, self.r
        pos = {}
        for lab, deg in self.pts:
            pos[lab] = pt_on(cx, cy, r, deg)
        pos[self.center] = (cx, cy)
        pos.update(self.ext)
        # 원
        c.setStrokeColor(DARK)
        c.setLineWidth(1.2)
        c.circle(cx, cy, r, stroke=1, fill=0)
        # 호 강조
        for lab1, lab2, col in self.arc_hint:
            a1 = _ang(dict(self.pts)[lab1])
            a2 = _ang(dict(self.pts)[lab2])
            c.setStrokeColor(col)
            c.setLineWidth(2.6)
            n = 24
            for i in range(n):
                t1 = a1 + (a2 - a1) * i / n
                t2 = a1 + (a2 - a1) * (i + 1) / n
                c.line(cx + r * math.cos(t1), cy + r * math.sin(t1),
                       cx + r * math.cos(t2), cy + r * math.sin(t2))
            c.setStrokeColor(DARK)
            c.setLineWidth(1.2)
        # 점선
        c.setDash(2.6, 2.4)
        c.setLineWidth(0.9)
        for a, b in self.dashed:
            c.line(pos[a][0], pos[a][1], pos[b][0], pos[b][1])
        c.setDash()
        # 반지름/현
        c.setLineWidth(1.1)
        for a, b in self.radii + self.chords + self.ext_lines:
            c.line(pos[a][0], pos[a][1], pos[b][0], pos[b][1])
        # 접선
        for lab, half in self.tangents:
            px, py = pos[lab]
            deg = dict(self.pts)[lab]
            tx, ty = -math.sin(_ang(deg)), math.cos(_ang(deg))
            c.setLineWidth(1.3)
            c.line(px - tx * half, py - ty * half, px + tx * half, py + ty * half)
        # 중심 점
        if self.center:
            c.setFillColor(DARK)
            c.circle(cx, cy, 1.7, stroke=0, fill=1)
        # 둘레/외부 점
        for lab, _ in self.pts:
            x, y = pos[lab]
            c.setFillColor(colors.white)
            c.circle(x, y, 2.1, stroke=1, fill=1)
        for lab in self.ext:
            x, y = pos[lab]
            c.setFillColor(DARK)
            c.circle(x, y, 2.1, stroke=0, fill=1)
        # 각 호
        for v, a, b, txt in self.angles:
            _angle_arc(c, pos[v], pos[a], pos[b], label=txt, radius=14)
        # 직각 표시
        for v, a, b in self.rights:
            _right_mark(c, pos[v], pos[a], pos[b])
        # 라벨
        for lab, deg in self.pts:
            x, y = pos[lab]
            ox, oy = self.label_off.get(lab, (0, 0))
            dx, dy = 10 * math.cos(_ang(deg)), 10 * math.sin(_ang(deg)) - 3
            _label(c, x + dx + ox, y + dy + oy, lab)
        if self.center and self.center != "P":
            _label(c, cx - 8, cy - 3, self.center, size=8.2)
        for lab in self.ext:
            ox, oy = self.label_off.get(lab, (0, 0))
            _label(c, pos[lab][0] + ox, pos[lab][1] + oy - 3, lab)

# ---------------------------------------------------------------- 막대그래프
class BarFig(Flowable):
    def __init__(self, data, w=236, h=150, ymax=None, mean=None,
                 xlab="", ylab="", y_start=0, broken=False, value_fmt="%g",
                 yticks=None):
        super().__init__()
        self.data = data            # [(이름, 값)]
        self.width, self.height = w, h
        self.ymax = ymax or max(v for _, v in data) * 1.18
        self.mean = mean
        self.xlab, self.ylab, self.y_start = xlab, ylab, y_start
        self.broken, self.value_fmt = broken, value_fmt
        self.yticks = yticks

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        L, B, T = 34, 26, 12
        plot_w, plot_h = self.width - L - 8, self.height - B - T
        n = len(self.data)
        bw = plot_w / n * 0.56
        gap = plot_w / n
        c.setStrokeColor(DARK); c.setLineWidth(1.0)
        c.line(L, B, L, B + plot_h)
        c.line(L, B, L + plot_w, B)
        if self.broken:  # 절단축 지그재그
            c.setStrokeColor(RED); c.setLineWidth(1.1)
            for i in range(2):
                yy = B + 3 + i * 5
                c.line(L - 4, yy + 4, L + 4, yy)
            c.setStrokeColor(DARK)
        span = self.ymax - self.y_start
        def y(v):
            return B + (v - self.y_start) / span * plot_h
        # 눈금
        c.setFont("G", 7.2); c.setFillColor(GRAY)
        tick_vals = self.yticks if self.yticks else \
            [self.y_start + span * i / 4 for i in range(5)]
        for v in tick_vals:
            yy = y(v)
            c.setStrokeColor(colors.HexColor("#D9D9D9")); c.setLineWidth(0.5)
            c.line(L, yy, L + plot_w, yy)
            c.setFillColor(GRAY)
            c.drawRightString(L - 3, yy - 2.5, self.value_fmt % v)
        for i, (name, v) in enumerate(self.data):
            x0 = L + gap * i + (gap - bw) / 2
            c.setFillColor(colors.HexColor("#7FA4D8"))
            c.setStrokeColor(NAVY); c.setLineWidth(0.8)
            c.rect(x0, y(self.y_start), bw, max(0, y(v) - y(self.y_start)),
                   stroke=1, fill=1)
            c.setFillColor(DARK); c.setFont("GB", 8)
            c.drawCentredString(x0 + bw / 2, y(v) + 3, self.value_fmt % v)
            c.setFont("G", 8); c.setFillColor(DARK)
            c.drawCentredString(x0 + bw / 2, B - 11, str(name))
        if self.mean is not None:
            yy = y(self.mean)
            c.setDash(3, 2); c.setStrokeColor(RED); c.setLineWidth(1.1)
            c.line(L, yy, L + plot_w, yy); c.setDash()
            c.setFont("GB", 7.6); c.setFillColor(RED)
            c.drawString(L + plot_w - 52, yy + 2, "평균 %g" % self.mean)
        c.setFont("G", 7.8); c.setFillColor(GRAY)
        if self.xlab:
            c.drawCentredString(self.width / 2, 2, self.xlab)
        if self.ylab:
            c.saveState(); c.translate(9, self.height / 2); c.rotate(90)
            c.drawCentredString(0, 0, self.ylab); c.restoreState()

# ---------------------------------------------------------------- 점도수
class DotFig(Flowable):
    def __init__(self, values, w=236, h=118, lo=None, hi=None, xlab="",
                 tick_step=None):
        super().__init__()
        self.values = values
        self.width, self.height = w, h
        self.lo = lo if lo is not None else min(values)
        self.hi = hi if hi is not None else max(values)
        self.xlab = xlab
        if tick_step is None:
            span = self.hi - self.lo
            tick_step = 1 if span <= 12 else (5 if span <= 40 else 10)
        self.tick_step = tick_step

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        L, R, B = 18, 12, 30
        plot_w = self.width - L - R
        def x(v):
            return L + (v - self.lo) / (self.hi - self.lo) * plot_w
        c.setStrokeColor(DARK); c.setLineWidth(1.0)
        c.line(L, B, L + plot_w, B)
        c.setFont("G", 7.6); c.setFillColor(GRAY)
        for v in range(self.lo, self.hi + 1):
            xx = x(v)
            c.line(xx, B - 2.5, xx, B + 2.5)
            if (v - self.lo) % self.tick_step == 0:
                c.drawCentredString(xx, B - 12, str(v))
        from collections import Counter
        cnt = Counter(self.values)
        c.setFillColor(colors.HexColor("#4F7CC4"))
        c.setStrokeColor(NAVY); c.setLineWidth(0.6)
        for v, k in cnt.items():
            for j in range(k):
                c.circle(x(v), B + 7 + j * 11, 4.2, stroke=1, fill=1)
        c.setFont("G", 7.8); c.setFillColor(GRAY)
        if self.xlab:
            c.drawCentredString(self.width / 2, 2, self.xlab)

# ---------------------------------------------------------------- 산점도
class ScatterFig(Flowable):
    def __init__(self, points, w=236, h=168, xlim=None, ylim=None,
                 xlab="", ylab="", trend=False, outliers=None, note=None,
                 yticks=None, xtick_step=1):
        super().__init__()
        self.points = points
        self.width, self.height = w, h
        xs = [p[0] for p in points]; ys = [p[1] for p in points]
        self.xlim = xlim or (min(xs), max(xs))
        self.ylim = ylim or (min(ys), max(ys))
        self.xlab, self.ylab = xlab, ylab
        self.trend, self.outliers, self.note = trend, outliers or [], note
        self.yticks = yticks
        self.xtick_step = xtick_step

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        L, B, T, R = 30, 26, 12, 12
        pw, ph = self.width - L - R, self.height - B - T
        x0, x1 = self.xlim; y0, y1 = self.ylim
        def X(v):
            return L + (v - x0) / (x1 - x0) * pw
        def Y(v):
            return B + (v - y0) / (y1 - y0) * ph
        c.setStrokeColor(colors.HexColor("#BFBFBF")); c.setLineWidth(0.5)
        for gx in range(x0, x1 + 1, self.xtick_step):
            xx = X(gx)
            c.line(xx, B, xx, B + ph)
        for gy in range(y0, y1 + 1, max(1, (y1 - y0) // 5)):
            yy = Y(gy)
            c.line(L, yy, L + pw, yy)
        c.setStrokeColor(DARK); c.setLineWidth(1.0)
        c.line(L, B, L + pw + 4, B)
        c.line(L, B, L, B + ph + 4)
        c.setFont("G", 7.0); c.setFillColor(GRAY)
        for gx in range(x0, x1 + 1, self.xtick_step):
            c.drawCentredString(X(gx), B - 9, str(gx))
        ytick_vals = self.yticks if self.yticks else \
            list(range(y0, y1 + 1, max(1, (y1 - y0) // 5)))
        for gy in ytick_vals:
            c.drawRightString(L - 3, Y(gy) - 2.5, str(gy))
        if self.trend:
            n = len(self.points)
            mx = sum(p[0] for p in self.points) / n
            my = sum(p[1] for p in self.points) / n
            sxx = sum((p[0] - mx) ** 2 for p in self.points)
            sxy = sum((p[0] - mx) * (p[1] - my) for p in self.points)
            slope = sxy / sxx; inter = my - slope * mx
            c.setDash(3.5, 2.5); c.setStrokeColor(RED); c.setLineWidth(1.1)
            c.line(X(x0), Y(inter + slope * x0), X(x1), Y(inter + slope * x1))
            c.setDash()
        c.setLineWidth(0.7)
        for i, (xv, yv) in enumerate(self.points):
            if i in self.outliers:
                c.setFillColor(colors.HexColor("#E08A2B")); c.setStrokeColor(RED)
            else:
                c.setFillColor(colors.HexColor("#4F7CC4")); c.setStrokeColor(NAVY)
            c.circle(X(xv), Y(yv), 3.4, stroke=1, fill=1)
        c.setFont("G", 7.8); c.setFillColor(GRAY)
        c.drawCentredString(self.width / 2, 2, self.xlab)
        c.saveState(); c.translate(8, self.height / 2); c.rotate(90)
        c.drawCentredString(0, 0, self.ylab); c.restoreState()
        if self.note:
            c.setFont("GB", 7.6); c.setFillColor(RED)
            c.drawString(L + 4, self.height - 10, self.note)

# ---------------------------------------------------------------- 표 헬퍼
def make_table(rows, widths, header=True, aligns=None, fontsize=8.7,
               header_bg=NAVY, zebra=True):
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("FONTNAME", (0, 0), (-1, -1), "G"),
        ("FONTSIZE", (0, 0), (-1, -1), fontsize),
        ("GRID", (0, 0), (-1, -1), 0.6, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), header_bg),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "GB"),
        ]
    if zebra:
        for r in range(1 if header else 0, len(rows)):
            if (r - (1 if header else 0)) % 2 == 1:
                style.append(("BACKGROUND", (0, r), (-1, r), colors.HexColor("#F2F5FB")))
    if aligns:
        for col, al in aligns.items():
            style.append(("ALIGN", (col, 0), (col, -1), al))
    t.setStyle(TableStyle(style))
    return t

def tip_box(text):
    t = Table([[Paragraph(mf(text), S["tip"])]], colWidths=[COL_W - 6])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT2),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#C9A96A")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 3.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.2),
    ]))
    return t

def section_banner(text):
    t = Table([[Paragraph(esc(text), S["sec"])]], colWidths=[COL_W - 4])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t

# ---------------------------------------------------------------- 페이지 설정
PAGE_W, PAGE_H = A4
MARGIN = 10 * mm
GUTTER = 14
COL_W = (PAGE_W - 2 * MARGIN - GUTTER) / 2
COL_H = PAGE_H - 2 * MARGIN - 12
COVER_W = PAGE_W - 2 * MARGIN

from reportlab.pdfgen import canvas as _canvas

class NumberedCanvas(_canvas.Canvas):
    title_info = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_states = []

    def showPage(self):
        self._saved_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved_states)
        for state in self._saved_states:
            self.__dict__.update(state)
            self._draw_chrome(total)
            _canvas.Canvas.showPage(self)
        _canvas.Canvas.save(self)

    def _draw_chrome(self, total):
        page = self.getPageNumber()
        self.saveState()
        if page > 1:
            self.setStrokeColor(LINE); self.setLineWidth(0.7)
            self.line(MARGIN, PAGE_H - MARGIN + 6, PAGE_W - MARGIN, PAGE_H - MARGIN + 6)
            self.setFont("G", 7.8); self.setFillColor(GRAY)
            self.drawString(MARGIN, PAGE_H - MARGIN + 9, self.title_info)
            self.drawRightString(PAGE_W - MARGIN, PAGE_H - MARGIN + 9,
                                 "미래엔 중3 수학 · 2015 개정 교육과정")
            self.setStrokeColor(LINE)
            self.line(MARGIN, MARGIN - 6, PAGE_W - MARGIN, MARGIN - 6)
            self.setFont("G", 8)
            self.drawCentredString(PAGE_W / 2, MARGIN - 16, f"{page} / {total}")
        self.restoreState()

def build_doc(path, title_info, story):
    NumberedCanvas.title_info = title_info
    doc = BaseDocTemplate(
        path, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN + 8, bottomMargin=MARGIN + 4,
        title=title_info, author="Arena 내신 대비 자료")
    cover_frame = Frame(MARGIN, MARGIN + 2, COVER_W, COL_H, id="cover",
                        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    f1 = Frame(MARGIN, MARGIN + 2, COL_W, COL_H, id="c1",
               leftPadding=2, rightPadding=5, topPadding=2, bottomPadding=4)
    f2 = Frame(MARGIN + COL_W + GUTTER, MARGIN + 2, COL_W, COL_H, id="c2",
               leftPadding=5, rightPadding=2, topPadding=2, bottomPadding=4)
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame]),
        PageTemplate(id="cols", frames=[f1, f2]),
    ])
    doc.build(story, canvasmaker=NumberedCanvas)
