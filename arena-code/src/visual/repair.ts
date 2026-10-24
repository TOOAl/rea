/**
 * Visual Auto-Repair — 스크린샷 QA (휴리스틱, 브라우저 없이도 동작)
 * 12살 설명: 그림을 만든 뒤 돋보기로 "글자 겹쳤나? 잘렸나? 색이 너무 옅나?" 보고, 있으면 스스로 1번 고쳐주는 것
 * 검사 6종 + 자동 수정 6종, outputQuality Gate와 연동
 */

export interface QaIssue {
  id: string;
  severity: "fail" | "warn";
  passed: boolean;
  message: string;
  fix?: string; // 자동 수정 제안
  loc?: string; // 위치 힌트
}

export interface QaReport {
  ok: boolean;
  issues: QaIssue[];
  warnings: QaIssue[];
  score: number; // 0~100
}

export interface RepairResult {
  html: string;
  applied: string[]; // 적용된 fix id
  reportBefore: QaReport;
  reportAfter: QaReport;
}

// ── 6 checks (브라우저 없이 휴리스틱) ──
function checkOverflow(html: string): QaIssue {
  // 긴 단어/문장이 컨테이너 넘침 heuristic: 40자 이상 연속 non-space or 100자 이상 한 줄
  const hasLongToken = /[^\s<]{40,}/.test(html) || html.split("\n").some(l=> l.replace(/<[^>]+>/g,"").length > 120);
  if (hasLongToken) return { id: "overflow", severity: "fail", passed: false, message: "FAIL: 긴 토큰/문장으로 줄넘침 위험 — 40자+ 연속문자 또는 120자+ 한 줄 발견", fix: "word-break: break-word; overflow-wrap: anywhere; 추가", loc: "inline text" };
  return { id: "overflow", severity: "warn", passed: true, message: "줄넘침 PASS" };
}
function checkTruncated(html: string): QaIssue {
  const hasTruncMark = /…|\[생략|\[truncated|\.\.\. 더/.test(html) || html.length > 15000;
  const hasIncompleteTag = (html.match(/<[^>]+$/g) || []).length>0;
  if (hasTruncMark || hasIncompleteTag) return { id: "truncated", severity: "warn", passed: false, message: "WARN: 잘림 표시(…/생략) 또는 15k+ 길이 — 짤림 의심", fix: "페이지 분할 또는 폰트 1pt 축소", loc: "end" };
  return { id: "truncated", severity: "warn", passed: true, message: "잘림 PASS" };
}
function checkOverlap(html: string): QaIssue {
  const absCount = (html.match(/position:\s*absolute/g) || []).length;
  const zIndexCount = (html.match(/z-index/g) || []).length;
  if (absCount >= 3 && zIndexCount >= 2) return { id: "overlap", severity: "fail", passed: false, message: `FAIL: absolute ${absCount}개 + z-index ${zIndexCount}개 — 겹침 위험 높음`, fix: "absolute→flex/grid로 변경, z-index 2개↓로 제한", loc: "style" };
  if (absCount >=2) return { id: "overlap", severity: "warn", passed: false, message: `WARN: absolute ${absCount}개 — 겹침 주의`, fix: "position:relative + flex로 교체 검토" };
  return { id: "overlap", severity: "warn", passed: true, message: "겹침 PASS" };
}
function checkFont(html: string): QaIssue {
  const fontSizeMatches = [...html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)(px|pt)/gi)];
  const tooSmall = fontSizeMatches.some(m=> parseFloat(m[1]) < 12 && m[2].toLowerCase()==="px");
  const noFontFamily = !/font-family/.test(html);
  if (tooSmall) return { id: "font", severity: "fail", passed: false, message: "FAIL: 12px 미만 폰트 — 모바일 가독성 실패", fix: "font-size 12px→14px 최소로 상향", loc: "style" };
  if (noFontFamily) return { id: "font", severity: "warn", passed: false, message: "WARN: font-family 미지정 — OS 기본으로 깨질 수 있음", fix: "font-family: Pretendard, Noto Sans KR, sans-serif 추가" };
  return { id: "font", severity: "warn", passed: true, message: "폰트 PASS" };
}
function checkContrast(html: string): QaIssue {
  // 휴리스틱: 옅은 회색 텍스트 on 흰 배경
  const lowContrast = /color:\s*#(?:ccc|ddd|eee|f5f5|fafafa)/i.test(html) && /background:\s*#fff/i.test(html);
  const bgTextSame = /background:\s*#fff[^}]*color:\s*#fff/i.test(html);
  if (bgTextSame) return { id: "contrast", severity: "fail", passed: false, message: "FAIL: 배경과 글자색 동일(흰색) — 보이지 않음", fix: "color:#1A1A1A로 변경 (WCAG 7:1)", loc: "style" };
  if (lowContrast) return { id: "contrast", severity: "fail", passed: false, message: "FAIL: 옅은 회색(#ccc/ddd) on 흰 배경 — 대비 2:1 미만, WCAG 실패", fix: "color:#333으로 변경 (4.5:1 통과)", loc: "style" };
  return { id: "contrast", severity: "warn", passed: true, message: "대비 PASS" };
}
function checkImages(html: string): QaIssue {
  const imgWithoutAlt = (html.match(/<img[^>]*>/gi) || []).filter(t=> !/alt=/.test(t)).length;
  const imgCount = (html.match(/<img/gi) || []).length;
  if (imgWithoutAlt > 0) return { id: "images", severity: "warn", passed: false, message: `WARN: alt 없는 이미지 ${imgWithoutAlt}/${imgCount}개 — 접근성 실패`, fix: 'alt="설명" 추가', loc: "img" };
  if (imgCount===0 && /썸네일|이미지/.test(html)) return { id: "images", severity: "warn", passed: false, message: "WARN: 이미지 키워드 있는데 <img> 없음 — 시각 자료 누락", fix: "대표 이미지 1개 추가" };
  return { id: "images", severity: "warn", passed: true, message: "이미지 PASS" };
}

export function qaCheck(html: string): QaReport {
  const checks = [checkOverflow(html), checkTruncated(html), checkOverlap(html), checkFont(html), checkContrast(html), checkImages(html)];
  const fails = checks.filter(c=> !c.passed && c.severity==="fail");
  const warns = checks.filter(c=> !c.passed && c.severity==="warn");
  const score = Math.max(0, 100 - fails.length*25 - warns.length*8);
  return { ok: fails.length===0, issues: fails, warnings: warns, score };
}

// ── Auto-repair (휴리스틱, 브라우저 없이 문자열 치환) ──
const REPAIRS: Array<{ id: string; re: RegExp; replace: string; desc: string }> = [
  { id: "overflow", re: /word-break:\s*normal/g, replace: "word-break: break-word; overflow-wrap: anywhere", desc: "줄넘침 방지 CSS 추가" },
];

export function autoRepair(html: string): RepairResult {
  const before = qaCheck(html);
  let out = html;
  const applied: string[] = [];

  // 1. overflow → break-word
  if (before.issues.some(i=>i.id==="overflow") || before.warnings.some(i=>i.id==="overflow")) {
    if (!/overflow-wrap:\s*anywhere/.test(out)) {
      // body 또는 첫 style에 추가
      if (out.includes("</style>")) out = out.replace("</style>", " body{word-break:break-word; overflow-wrap:anywhere;}\n</style>");
      else out = `<style>body{word-break:break-word; overflow-wrap:anywhere;}</style>\n` + out;
      applied.push("overflow: break-word 추가");
    }
  }
  // 2. font 미지정 → Pretendard
  if (before.warnings.some(i=>i.id==="font" && i.message.includes("font-family 미지정"))) {
    if (out.includes("</style>")) out = out.replace("</style>", " body{font-family:Pretendard, 'Noto Sans KR', sans-serif;}\n</style>");
    else out = `<style>body{font-family:Pretendard, 'Noto Sans KR', sans-serif;}</style>\n` + out;
    applied.push("font-family: Pretendard 추가");
  }
  // 3. contrast 옅은 회색 → 진하게
  if (before.issues.some(i=>i.id==="contrast")) {
    const beforeLen = out.length;
    out = out.replace(/color:\s*#ccc/gi, "color:#333").replace(/color:\s*#ddd/gi, "color:#333").replace(/color:\s*#eee/gi, "color:#555");
    if (out.length !== beforeLen) applied.push("contrast: #ccc→#333 상향");
  }
  // 4. absolute 겹침 → 경고만 (자동 flex 변환은 위험하므로 주석 추가)
  if (before.issues.some(i=>i.id==="overlap" && i.severity==="fail")) {
    out = out.replace("</style>", " /* QA: absolute 3+겹침 — flex/grid로 수동 전환 권장 */\n</style>");
    applied.push("overlap: 경고 주석 추가 (수동 flex 전환 권장)");
  }
  // 5. alt 없음 → 빈 alt라도 추가 (접근성)
  if (before.warnings.some(i=>i.id==="images" && i.message.includes("alt 없는"))) {
    out = out.replace(/<img([^>]*?)>/gi, (m, attrs)=> attrs.includes("alt=") ? m : `<img${attrs} alt="">`);
    applied.push("images: 빈 alt 추가");
  }
  // 6. 폰트 너무 작음 → 14px로
  if (before.issues.some(i=>i.id==="font" && i.message.includes("12px 미만"))) {
    out = out.replace(/font-size:\s*10px/g, "font-size:14px").replace(/font-size:\s*11px/g, "font-size:14px");
    applied.push("font-size: 10/11px→14px 상향");
  }

  const after = qaCheck(out);
  return { html: out, applied, reportBefore: before, reportAfter: after };
}

export function qaFeedback(report: QaReport): string {
  if (report.ok && report.warnings.length===0) return "✅ Visual QA PASS (score 100)";
  const lines = [`[Visual QA score ${report.score}/100 — ${report.ok ? "WARN only" : "FAIL (auto-repair 시도)"}]`];
  for (const i of [...report.issues, ...report.warnings]) lines.push(`- ${i.id} (${i.severity}): ${i.message}${i.fix ? ` → fix: ${i.fix}` : ""}`);
  return lines.join("\n");
}

// Tool용 래퍼 — queryLoop에서 품질 게이트로 호출
export function visualQaGate(html: string, opts?: { autoRepair?: boolean }): { report: QaReport; repaired?: RepairResult; feedback: string } {
  const report = qaCheck(html);
  if (opts?.autoRepair && !report.ok) {
    const repaired = autoRepair(html);
    return { report: repaired.reportAfter, repaired, feedback: qaFeedback(repaired.reportAfter) + (repaired.applied.length ? `\n🔧 적용: ${repaired.applied.join(", ")}` : "") };
  }
  return { report, feedback: qaFeedback(report) };
}
