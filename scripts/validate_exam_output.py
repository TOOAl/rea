#!/usr/bin/env python3
"""
validate_exam_output.py — 밑줄 표시 및 정답 노출 가드
- Failure mode: 첨부처럼 <u>가 사라지거나, 정답(예: "정답: ③")이 문서 상단에 노출
- Usage: python scripts/validate_exam_output.py docs/quality/sample-29-corrected.html
"""
import re, sys, pathlib

def check_underline(html: str, expected=5):
    # 안정적인 밑줄: border-bottom 또는 <u> 또는 class="ul" 중 하나라도 있어야 함
    # 단순 <span>만 있고 스타일 없으면 FAIL
    ul_spans = html.count('class="ul"')
    border = html.count('border-bottom')
    u_tags = html.lower().count('<u>')
    count = max(ul_spans, u_tags, border)  # 근사치, 실제로는 ul_spans가 정답
    # 더 정확히는 <span class="ul"> 개수
    actual = html.count('<span class="ul">') + html.count("<span class='ul'>")
    ok = actual >= expected
    return ok, f'underline spans={actual} (expected >= {expected}), border-bottom={border}, <u>={u_tags}'

def check_answer_leak(html: str, leak_window=800):
    head = html[:leak_window]
    # 정답 패턴: "정답" + 숫자/원문자, 또는 "Answer: 3" 등
    patterns = [r'정답\s*[:：]?\s*[①-⑤\d]', r'answer\s*[:：]?\s*[1-5]', r'correct\s*answer']
    leaked = []
    for pat in patterns:
        if re.search(pat, head, re.I):
            leaked.append(pat)
    ok = len(leaked)==0
    return ok, f'leaked patterns in first {leak_window} chars: {leaked}'

def check_ids_present(html: str):
    ids = [f'①','②','③','④','⑤']
    missing = [c for c in ids if c not in html]
    ok = len(missing)==0
    return ok, f'missing ids: {missing}'

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv)>1 else "docs/quality/sample-29-corrected.html"
    p = pathlib.Path(path)
    if not p.exists():
        print(f"FAIL: file not found: {path}")
        sys.exit(2)
    html = p.read_text(encoding="utf-8")
    checks = [
        ("underline", check_underline(html)),
        ("no_answer_leak_top", check_answer_leak(html)),
        ("ids_present", check_ids_present(html)),
    ]
    failed=False
    for name, (ok, msg) in checks:
        print(f"{'PASS' if ok else 'FAIL'} {name}: {msg}")
        if not ok: failed=True
    sys.exit(1 if failed else 0)
