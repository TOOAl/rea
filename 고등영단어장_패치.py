#!/usr/bin/env python3
import pathlib, re
ROOT = pathlib.Path("/home/user/rea")
fonts = {
  "Regular": pathlib.Path("/tmp/woff-NotoSansKR-Regular-Hestia.b64").read_text(),
  "Medium": pathlib.Path("/tmp/woff-NotoSansKR-Medium-Hestia.b64").read_text(),
  "Bold": pathlib.Path("/tmp/woff-NotoSansKR-Bold-Hestia.b64").read_text(),
  "Black": pathlib.Path("/tmp/woff-NotoSansKR-Black-Hestia.b64").read_text(),
}
css = f"""
@font-face {{ font-family:'Noto Sans KR'; src: url(data:font/woff;base64,{fonts['Regular']}) format('woff'); font-weight:400; font-display:swap; }}
@font-face {{ font-family:'Noto Sans KR'; src: url(data:font/woff;base64,{fonts['Medium']}) format('woff'); font-weight:500; font-display:swap; }}
@font-face {{ font-family:'Noto Sans KR'; src: url(data:font/woff;base64,{fonts['Bold']}) format('woff'); font-weight:700; font-display:swap; }}
@font-face {{ font-family:'Noto Sans KR'; src: url(data:font/woff;base64,{fonts['Black']}) format('woff'); font-weight:900; font-display:swap; }}
"""
for html_path in (ROOT/"고등영단어장").glob("*.html"):
  t = html_path.read_text(encoding="utf-8")
  if "data:font/woff;base64" in t:
    # already embedded — only fix broken import line if present
    if "googlefonts replaced" in t:
      t = re.sub(r"/\* googlefonts replaced.*?\n", "", t)
      html_path.write_text(t, encoding="utf-8")
      print(f"fixed broken import {html_path.name}")
    else:
      print(f"skip {html_path.name} already embedded")
    continue
  # inject after <style> opening or <head>
  if "/* FONT_EMBED */" in t:
    t = t.replace("/* FONT_EMBED */", css)
  elif "@import url('https://fonts.googleapis.com" in t:
    t = re.sub(r"@import url\('https://fonts\.googleapis\.com[^']*'\);\s*\n?", css+"\n", t)
  else:
    t = t.replace("</head>", f"<style>{css}</style>\n</head>")
  html_path.write_text(t, encoding="utf-8")
  print(f"patched {html_path.name} {len(t)} chars")

print("done")
