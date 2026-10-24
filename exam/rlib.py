# -*- coding: utf-8 -*-
"""Shared fonts, styles and markup helpers for the exam PDFs."""
import os
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")

SERIF = "SerifKR"
SERIF_BOLD = "SerifKR-Bold"
SANS = "SansKR"
SANS_B = "SansKR-Bold"

_registered = False


def register_fonts():
    global _registered
    if _registered:
        return
    pdfmetrics.registerFont(TTFont(SERIF, os.path.join(FONT_DIR, "DejaVuSerif.ttf")))
    pdfmetrics.registerFont(TTFont("SerifKR-Bold", os.path.join(FONT_DIR, "DejaVuSerif-Bold.ttf")))
    pdfmetrics.registerFont(TTFont(SANS, os.path.join(FONT_DIR, "NanumGothic.ttf")))
    pdfmetrics.registerFont(TTFont(SANS_B, os.path.join(FONT_DIR, "NanumGothicBold.ttf")))
    pdfmetrics.registerFontFamily(SERIF, normal=SERIF, bold="SerifKR-Bold",
                                  italic=SERIF, boldItalic="SerifKR-Bold")
    pdfmetrics.registerFontFamily(SANS, normal=SANS, bold=SANS_B,
                                  italic=SANS, boldItalic=SANS_B)
    _registered = True


INK = colors.HexColor("#111111")
GRAY = colors.HexColor("#5a5a5a")
LIGHT = colors.HexColor("#8a8a8a")
RULE = colors.HexColor("#9a9a9a")

CIRCLE = "①②③④⑤⑥⑦⑧⑨⑩"


def _circle(n):
    return CIRCLE[n - 1]


def md(text, circle_color=None):
    """Convert data tokens to reportlab inline markup."""
    if text is None:
        return ""
    s = text
    # numbered positions  [[1]] .. [[5]]  /  [[I1]] .. [[I5]]
    def _num(m):
        n = int(m.group(1))
        return '<font name="%s">%s</font> ' % (SANS_B, _circle(n))

    s = re.sub(r"\[\[I(\d)\]\]", _num, s)
    s = re.sub(r"\[\[(\d)\]\]", _num, s)

    blank = "&nbsp;" * 15
    s = s.replace("[[B]]", '<u>' + blank + "</u>")
    s = s.replace("[[LA]]", '&#40;A&#41;<u>' + blank + "</u>")
    s = s.replace("[[LB]]", '&#40;B&#41;<u>' + blank + "</u>")
    return s


def plain(text):
    """Strip tokens for measuring / for the plain-text extraction."""
    if text is None:
        return ""
    s = text
    s = re.sub(r"\[\[I(\d)\]\]", lambda m: _circle(int(m.group(1))), s)
    s = re.sub(r"\[\[(\d)\]\]", lambda m: _circle(int(m.group(1))), s)
    s = s.replace("[[B]]", "________")
    s = s.replace("[[LA]]", "(A)________")
    s = s.replace("[[LB]]", "(B)________")
    s = s.replace("<u>", "").replace("</u>", "")
    return s


def styles():
    register_fonts()
    st = {}
    st["cover_title"] = ParagraphStyle("cover_title", fontName=SANS_B, fontSize=17, leading=22,
                                       alignment=TA_CENTER, textColor=INK)
    st["cover_sub"] = ParagraphStyle("cover_sub", fontName=SANS_B, fontSize=12.5, leading=17,
                                     alignment=TA_CENTER, textColor=INK)
    st["cover_small"] = ParagraphStyle("cover_small", fontName=SANS, fontSize=8.6, leading=12.4,
                                       alignment=TA_LEFT, textColor=GRAY)
    st["ko"] = ParagraphStyle("ko", fontName=SANS, fontSize=8.8, leading=12.6, textColor=INK)
    st["ko_c"] = ParagraphStyle("ko_c", parent=st["ko"], alignment=TA_CENTER)
    st["ko_r"] = ParagraphStyle("ko_r", parent=st["ko"], alignment=TA_RIGHT)
    st["inst"] = ParagraphStyle("inst", fontName=SANS_B, fontSize=9.0, leading=12.6,
                                textColor=INK, spaceAfter=1.6)
    st["inst_s"] = ParagraphStyle("inst_s", fontName=SANS, fontSize=7.6, leading=10.2,
                                  textColor=GRAY, spaceAfter=1.2)
    st["en"] = ParagraphStyle("en", fontName=SERIF, fontSize=8.5, leading=11.6,
                              alignment=TA_JUSTIFY, textColor=INK, spaceAfter=1.5)
    st["en_tight"] = ParagraphStyle("en_tight", parent=st["en"], spaceAfter=0.6)
    st["en_c"] = ParagraphStyle("en_c", parent=st["en"], alignment=TA_CENTER, spaceAfter=0.6)
    st["en_r"] = ParagraphStyle("en_r", parent=st["en"], alignment=TA_RIGHT, spaceAfter=0.6)
    st["en_b"] = ParagraphStyle("en_b", fontName=SANS_B, fontSize=9.3, leading=12.6,
                                alignment=TA_CENTER, spaceAfter=1.4)
    st["choice"] = ParagraphStyle("choice", fontName=SERIF, fontSize=8.45, leading=11.2,
                                  leftIndent=10.5, firstLineIndent=-10.5, spaceAfter=0.9,
                                  alignment=TA_LEFT, textColor=INK)
    st["chart_cap"] = ParagraphStyle("chart_cap", fontName=SERIF, fontSize=7.9, leading=10.6,
                                     alignment=TA_CENTER, spaceAfter=1)
    st["chart_note"] = ParagraphStyle("chart_note", fontName=SERIF, fontSize=6.6, leading=8.6,
                                      alignment=TA_LEFT, textColor=GRAY)
    # solution styles
    st["s_h1"] = ParagraphStyle("s_h1", fontName=SANS_B, fontSize=13, leading=17,
                                alignment=TA_CENTER, spaceAfter=6)
    st["s_h2"] = ParagraphStyle("s_h2", fontName=SANS_B, fontSize=9.6, leading=13,
                                spaceBefore=7, spaceAfter=2.5, textColor=colors.HexColor("#0b3d63"))
    st["s_head"] = ParagraphStyle("s_head", fontName=SANS_B, fontSize=10.4, leading=14,
                                  spaceBefore=4, spaceAfter=2, textColor=INK)
    st["s_ko"] = ParagraphStyle("s_ko", fontName=SANS, fontSize=8.6, leading=12.4, textColor=INK,
                                spaceAfter=1.4)
    st["s_ko_s"] = ParagraphStyle("s_ko_s", fontName=SANS, fontSize=7.9, leading=11.2,
                                  textColor=GRAY)
    st["s_en"] = ParagraphStyle("s_en", fontName=SERIF, fontSize=8.4, leading=11.0,
                                textColor=INK, spaceAfter=0.6)
    st["s_gloss"] = ParagraphStyle("s_gloss", fontName=SANS, fontSize=8.2, leading=11.0,
                                   textColor=colors.HexColor("#1f4e79"), spaceAfter=2.2)
    st["s_trans"] = ParagraphStyle("s_trans", fontName=SANS, fontSize=8.4, leading=11.8,
                                   textColor=GRAY, spaceAfter=1.2)
    return st


def split_chunks(s):
    parts = [p.strip() for p in s.split(" / ")]
    return [p for p in parts if p]


def joined_korean(ko):
    """Full-sentence Korean translation from chunk glosses."""
    parts = split_chunks(ko)
    out = ""
    prev = ""
    for p in parts:
        if not out:
            out = p
        elif p.endswith(".") or p.endswith("?") or p.endswith("!"):
            out = out.rstrip() + " " + p
        else:
            out = out.rstrip() + " " + p
        prev = p
    return out
