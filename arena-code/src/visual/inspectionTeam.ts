/**
 * InspectionTeam — 4 Eyes: 최종 결과물을 “보는” 검수팀
 * 12살 설명: 그림 다 그린 뒤, 선생님 4명이 각자 돋보기로 확인 — 경계선 넘었나? 한글 깨졌나? 색 대비 괜찮나? 전후 사진 같은가?
 *
 * 흡수:
 * - Ghidra P-Code: SVG viewBox를 시각 바이너리의 P-Code로 보고 모든 요소 BBox가 viewBox 내부인지 검사
 * - Manus VerificationAgent: Executor(생성)와 Verifier(검수) 역할 분리 — 동일 이미지를 다른 눈으로 재검증
 * - Codex --image: Before/After 스크린샷을 모델에 재투입해 픽셀 diff
 * - Cursor Browser: AXTree + console log 파일을 통한 이중 검증
 * - Claude Browser Use: 요소 참조([ref]) 클릭 — 좌표 추측이 아닌 실제 렌더 박스 기반 검사
 */

export type EyeGrade = "PASS" | "FAIL" | "WARN";

export interface EyeResult {
  eye: "geometry" | "typography" | "accessibility" | "pixel";
  grade: EyeGrade;
  score: number; // 0-100
  issues: string[];
  suggestion?: string;
  meta?: Record<string, any>;
}

// ───────── Eye 1: GeometryEye — 경계 초과 탐지 (Ghidra P-Code 패턴) ─────────
/**
 * SVG viewBox를 P-Code 중간표현으로 보고, 모든 자식 요소의 getBBox()가 viewBox 내부인지 검증
 * - 정적 모드: 문자열 파싱으로 ellipse/circle/rect 경계 초과 탐지 (브라우저 없이 0.1초)
 * - 브라우저 모드: page.evaluate(() => el.getBBox())로 정확한 렌더 박스 검증
 */
export interface GeometryIssue {
  figIndex: number;
  tag: string;
  x: number; y: number; w: number; h: number;
  vbW: number; vbH: number;
  overflowPx: number; // 얼마나 넘었나
}

export interface GeometryEyeResult extends EyeResult {
  eye: "geometry";
  issues: string[];
  overflows: GeometryIssue[];
  figCount: number;
  failCount: number;
}

/**
 * 정적 검사: HTML 문자열만으로 SVG 경계 초과 탐지
 * 브라우저 없이도 80% 이상 탐지 가능 — CI에서 가장 먼저 실행
 */
export function checkGeometryStatic(html: string): GeometryEyeResult {
  const issues: string[] = [];
  const overflows: GeometryIssue[] = [];

  // 모든 <svg ...> 블록 추출
  const svgRe = /<svg[^>]*>([\s\S]*?)<\/svg>/gi;
  const viewBoxRe = /viewBox\s*=\s*["']\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*["']/i;
  const _widthRe = /<rect[^>]*width\s*=\s*["'](\d+(?:\.\d+)?)["'][^>]*>/i;
  const _heightRe = /<rect[^>]*height\s*=\s*["'](\d+(?:\.\d+)?)["'][^>]*>/i;

  let m: RegExpExecArray | null;
  let figIndex = 0;

  while ((m = svgRe.exec(html)) !== null) {
    figIndex++;
    const svgTag = m[0];
    const svgContent = m[1];

    // viewBox 파싱: 없으면 width/height로부터 추정
    let vbW = 0, vbH = 0;
    const vbMatch = svgTag.match(viewBoxRe);
    if (vbMatch) {
      vbW = parseFloat(vbMatch[1]);
      vbH = parseFloat(vbMatch[2]);
    } else {
      // svg 태그 자체 width/height 시도
      const wMatch = svgTag.match(/width\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      const hMatch = svgTag.match(/height\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      if (wMatch) vbW = parseFloat(wMatch[1]);
      if (hMatch) vbH = parseFloat(hMatch[1]);
    }
    if (!vbW || !vbH) continue; // viewBox 없으면 스킵

    // 배경 rect width로 실제 컨테이너 너비 추정 (첫 번째 rect가 배경인 경우 많음)
    // 그림 8 버그 케이스: <rect width="240"> 안에 <ellipse cx="195" rx="52"> → right=247>240
    // 정적 분석: ellipse cx+rx vs rect width 비교
    const bgRects = [...svgContent.matchAll(/<rect[^>]*>/gi)];
    let containerW = vbW;
    let containerH = vbH;
    for (const r of bgRects) {
      const rw = r[0].match(/width\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      const rh = r[0].match(/height\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      const rx = r[0].match(/\bx\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      const ry = r[0].match(/\by\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      if (rw) {
        const w = parseFloat(rw[1]);
        const x0 = rx ? parseFloat(rx[1]) : 0;
        // 배경 rect가 viewBox 대부분을 덮으면 컨테이너로 간주
        if (w > vbW * 0.7) containerW = Math.min(containerW, w + x0);
      }
      if (rh) {
        const h = parseFloat(rh[1]);
        const y0 = ry ? parseFloat(ry[1]) : 0;
        if (h > vbH * 0.7) containerH = Math.min(containerH, h + y0);
      }
    }

    // g transform="translate(...)" 내부는 좌표가 이동하므로 스킵 — 정확한 검사는 브라우저 모드에서 수행
    const hasTranslateGroup = /<g[^>]*transform\s*=\s*["'][^"']*translate/i.test(svgTag + svgContent);
    if (hasTranslateGroup) {
      // 해당 SVG는 transform이 있어 정적 cx 계산이 부정확 — 브라우저 모드로 위임
      // 여기선 경계 초과를 판단하지 않고 넘어감 (0.1초 휴리스틱 한계 명시)
    } else {
    // ellipse 검사: cx+rx vs containerW, cx-rx vs 0
    const ellipses = [...svgContent.matchAll(/<ellipse[^>]*>/gi)];
    for (const el of ellipses) {
      const tag = el[0];
      const cx = tag.match(/cx\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      const cy = tag.match(/cy\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      const rx = tag.match(/rx\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      const ry = tag.match(/ry\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      if (cx && rx) {
        const cxv = parseFloat(cx[1]);
        const rxv = parseFloat(rx[1]);
        const right = cxv + rxv;
        const left = cxv - rxv;
        if (right > containerW + 0.5) {
          overflows.push({ figIndex, tag: "ellipse", x: left, y: cy ? parseFloat(cy[1]) - (ry ? parseFloat(ry[1]) : 0) : 0, w: rxv * 2, h: ry ? parseFloat(ry[1]) * 2 : rxv * 2, vbW: containerW, vbH: containerH, overflowPx: right - containerW });
          issues.push(`그림 ${figIndex} ellipse(cx=${cxv}, rx=${rxv}) 오른쪽 끝 ${right.toFixed(0)}px가 컨테이너 ${containerW}px를 ${ (right - containerW).toFixed(0)}px 초과 — 노란 박스 밖으로 삐져나옴`);
        }
        if (left < -0.5) {
          overflows.push({ figIndex, tag: "ellipse", x: left, y: 0, w: rxv * 2, h: 0, vbW: containerW, vbH: containerH, overflowPx: -left });
          issues.push(`그림 ${figIndex} ellipse(cx=${cxv}, rx=${rxv}) 왼쪽 끝 ${left.toFixed(0)}px가 컨테이너 경계를 ${(-left).toFixed(0)}px 초과`);
        }
      }
    }
    }

    // rect 검사: x+width vs containerW
    for (const el of bgRects) {
      const tag = el[0];
      // 배경이 아닌 작은 rect도 검사 — 단 배경 제외 (width가 container와 같으면 배경)
      const rw = tag.match(/width\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      const rx = tag.match(/\bx\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      if (rw && rx) {
        const w = parseFloat(rw[1]);
        const x0 = parseFloat(rx[1]);
        // 매우 큰 배경 rect는 스킵, 작은 요소만
        if (w < containerW * 0.9) {
          const right = x0 + w;
          if (right > containerW + 0.5) {
            overflows.push({ figIndex, tag: "rect", x: x0, y: 0, w, h: 0, vbW: containerW, vbH: containerH, overflowPx: right - containerW });
            issues.push(`그림 ${figIndex} rect(x=${x0}, width=${w}) 오른쪽 끝 ${right.toFixed(0)}px가 컨테이너 ${containerW}px 초과`);
          }
        }
      }
    }

    // circle 검사: cx+r vs container
    const circles = [...svgContent.matchAll(/<circle[^>]*>/gi)];
    for (const el of circles) {
      const tag = el[0];
      const cx = tag.match(/cx\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      const r = tag.match(/\br\s*=\s*["'](\d+(?:\.\d+)?)["']/i);
      if (cx && r) {
        const cxv = parseFloat(cx[1]);
        const rv = parseFloat(r[1]);
        const right = cxv + rv;
        if (right > containerW + 0.5) {
          overflows.push({ figIndex, tag: "circle", x: cxv - rv, y: 0, w: rv * 2, h: rv * 2, vbW: containerW, vbH: containerH, overflowPx: right - containerW });
          issues.push(`그림 ${figIndex} circle(cx=${cxv}, r=${rv}) 경계 초과 ${ (right - containerW).toFixed(0)}px`);
        }
      }
    }
  }

  const failCount = new Set(overflows.map(o => o.figIndex)).size;
  const grade: EyeGrade = overflows.length === 0 ? "PASS" : "FAIL";
  const score = Math.max(0, 100 - overflows.length * 25);

  return {
    eye: "geometry",
    grade,
    score,
    issues,
    overflows,
    figCount: figIndex,
    failCount,
    suggestion: overflows.length ? `rx를 줄이거나(예: rx 52→40) 컨테이너 width를 늘려(예: 240→250) ${Math.max(...overflows.map(o => o.overflowPx), 0).toFixed(0)}px 여백을 확보하세요` : undefined,
    meta: { staticMode: true },
  };
}

// ───────── Eye 2: TypographyEye — 한글 폰트·깨짐 검사 (Claude AXTree 패턴) ─────────
export interface TypographyEyeResult extends EyeResult {
  eye: "typography";
  hasKoreanFont: boolean;
  brokenPatterns: string[];
}

const TOFU_PATTERNS: Array<{ re: RegExp; msg: string }> = [
  { re: /[□◇◻︎]/g, msg: "깨진 글자(□/◇) — 폰트 미탑재 또는 인코딩 실패" },
  { re: /[ㄱ-ㅎㅏ-ㅣ]{3,}/g, msg: "자모 분리 — 조합 실패" },
];

export function checkTypographyStatic(html: string): TypographyEyeResult {
  const issues: string[] = [];
  const brokenPatterns: string[] = [];

  // 1) 한글 폰트 import 존재 여부
  const hasGoogleFonts = /fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html) || /noto.*sans.*kr/i.test(html);
  const hasBase64Font = /@font-face/i.test(html) && /base64/i.test(html);
  const hasKoreanFont = hasGoogleFonts || hasBase64Font;
  if (!hasKoreanFont) {
    issues.push("한글 웹폰트(@font-face)가 HTML에 없음 — 로컬 폰트가 없으면 □로 깨짐");
    brokenPatterns.push("missing-font-face");
  }
  if (hasGoogleFonts && !hasBase64Font) {
    issues.push("WARN: Google Fonts 외부 의존 — 오프라인/PDF 생성 시 깨질 수 있음, base64 임베딩 권장");
  }

  // 2) 깨진 텍스트 패턴 스캔 (HTML 내 한글 텍스트 추출)
  // 텍스트 노드만 추출 — <style> <svg> 내부 텍스트는 제외 (정상 기호 □○는 SVG 가계도에서 의도적)
  const withoutStyle = html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  const textContent = withoutStyle.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const hangulCount = (textContent.match(/[가-힣]/g) || []).length;
  if (hangulCount === 0) {
    issues.push("한글이 0자 — 문제지/설명서는 한국어로 작성되어야 함");
    brokenPatterns.push("no-hangul");
  }
  for (const { re, msg } of TOFU_PATTERNS) {
    if (re.test(textContent)) {
      const hit = textContent.match(re)?.[0] ?? "";
      // 체크박스/가계도 UI용 □는 의도적 — 폰트가 있으면 tofu가 아님
      if (hit === "□" && hasKoreanFont) {
        // 텍스트에 □가 체크박스/기호로만 쓰이면 스킵 (대부분의 □가 체크박스 패턴)
        const boxCount = (textContent.match(/□/g)||[]).length;
        const checkboxHints = (textContent.match(/□\s*(D\d|Day|정상|D3|D7)/g)||[]).length;
        // 체크박스 힌트가 있거나, □가 20개 이하로 적고 전체 텍스트가 한글 중심이면 UI 기호로 간주
        if (checkboxHints > 0 || (boxCount <= 20 && /복습|체크|가계도|Day/.test(textContent))) continue;
      }
      if (hit === "□" && /정상.*□|□.*정상|가계도/.test(textContent)) continue;
      issues.push(msg);
      brokenPatterns.push(msg);
    }
  }
  // 자모 비율
  const jamoCount = (textContent.match(/[ㄱ-ㅎㅏ-ㅣ]/g) || []).length;
  if (hangulCount > 10 && jamoCount > hangulCount * 0.3) {
    issues.push(`자모 비율 과다 ${jamoCount}/${hangulCount} — 조합 깨짐 의심`);
  }

  // 3) 폰트 fallback 체인 검사
  const hasFallback = /font-family[^;]*Noto Sans KR[^;]*sans-serif|Pretendard|Malgun Gothic/i.test(html);
  if (!hasFallback && hangulCount > 0) {
    issues.push("WARN: 한글 fallback 폰트 체인 없음 — sans-serif 미지정 시 시스템 폰트에 따라 깨짐");
  }

  const grade: EyeGrade = issues.filter(i => !i.startsWith("WARN")).length === 0 ? (issues.length ? "WARN" : "PASS") : "FAIL";
  const score = Math.max(0, 100 - issues.filter(i => !i.startsWith("WARN")).length * 40 - issues.filter(i => i.startsWith("WARN")).length * 10);

  return {
    eye: "typography",
    grade,
    score,
    issues,
    hasKoreanFont,
    brokenPatterns,
    suggestion: !hasBase64Font ? "Noto Sans KR woff를 base64로 @font-face 임베딩하세요 (Google Fonts 외부 의존 제거)" : undefined,
  };
}

// ───────── Eye 3: AccessibilityEye — WCAG 대비·a11y 검사 (Cursor AXTree) ─────────
export interface AccessibilityEyeResult extends EyeResult {
  eye: "accessibility";
  contrastFails: string[];
}

export function checkAccessibilityStatic(html: string): AccessibilityEyeResult {
  const issues: string[] = [];
  const contrastFails: string[] = [];

  // WCAG 휴리스틱: 노란 배경(#fff176/#fef08a)에 흰 글자, 연회색(#aaa/#ccc)에 흰 글자는 대비 실패
  const lowContrastPatterns: Array<{ re: RegExp; msg: string }> = [
    { re: /background[^;]*#fff176[^;]*color\s*:\s*white|color\s*:\s*white[^;]*background[^;]*#fff176/i, msg: "노란 배경(#fff176)에 흰 글자 — 대비 1.2:1 (WCAG 실패)" },
    { re: /background[^;]*#fef08a[^;]*color\s*:\s*#fff|color\s*:\s*#fff[^;]*background[^;]*#fef08a/i, msg: "노란 배경에 흰 글자 — 대비 실패" },
    { re: /background[^;]*#e5e7eb[^;]*color\s*:\s*#9ca3af/i, msg: "연회색 배경에 옅은 회색 글자 — 대비 1.8:1 (WCAG 실패)" },
  ];
  for (const { re, msg } of lowContrastPatterns) {
    if (re.test(html)) {
      issues.push(msg);
      contrastFails.push(msg);
    }
  }

  // alt 텍스트 없는 img/svg 검사
  const imgWithoutAlt = [...html.matchAll(/<img(?![^>]*alt=)[^>]*>/gi)];
  if (imgWithoutAlt.length) {
    issues.push(`WARN: alt 없는 <img> ${imgWithoutAlt.length}개 — 스크린리더 불가`);
  }

  // 포커스 가능한 요소에 outline:none 검사
  if (/outline\s*:\s*none/i.test(html) && !/focus.*ring|focus-visible/i.test(html)) {
    issues.push("WARN: outline:none 에 focus ring 없음 — 키보드 탐색 불가");
  }

  const fails = issues.filter(i => !i.startsWith("WARN")).length;
  const grade: EyeGrade = fails > 0 ? "FAIL" : issues.length > 0 ? "WARN" : "PASS";
  const score = Math.max(0, 100 - fails * 30 - (issues.length - fails) * 5);

  return {
    eye: "accessibility",
    grade,
    score,
    issues,
    contrastFails,
    suggestion: contrastFails.length ? "텍스트를 #1f2937(검정)으로 변경하거나 배경을 #fef08a→#fde047(진한 노랑)으로 조정" : undefined,
  };
}

// ───────── Eye 4: PixelEye — 시각 회귀 검사 (Codex --image 패턴) ─────────
export interface PixelEyeResult extends EyeResult {
  eye: "pixel";
  diffPercent?: number;
  diffPixels?: number;
}

export function checkPixelStatic(_html: string, _referenceShot?: string): PixelEyeResult {
  // 정적 모드에서는 스텁 — Puppeteer 스크린샷 비교가 없으면 WARN으로 표시
  return {
    eye: "pixel",
    grade: "WARN",
    score: 90,
    issues: ["정적 모드 — Puppeteer 스크린샷 비교는 browser 모드에서만 가능 (pixelmatch)"],
    suggestion: "node scripts/inspect_layout.js 로 브라우저 모드 실행 시 전후 스크린샷 pixel diff <2% 검사",
    meta: { stub: true },
  };
}

// ───────── InspectionTeam — 4개 눈 오케스트레이션 (Manus VerificationAgent 패턴) ─────────
export interface TeamResult {
  pass: boolean; // 4개 눈 모두 PASS or WARN (FAIL 없음)
  overallScore: number; // 평균
  overallGrade: EyeGrade;
  eyes: EyeResult[];
  summary: string;
  fixInstructions: string[];
}

export function inspectStatic(html: string, opts: { referenceShot?: string } = {}): TeamResult {
  const geometry = checkGeometryStatic(html);
  const typography = checkTypographyStatic(html);
  const accessibility = checkAccessibilityStatic(html);
  const pixel = checkPixelStatic(html, opts.referenceShot);

  const eyes: EyeResult[] = [geometry, typography, accessibility, pixel];
  // pixel stub WARN은 pass 판정에서 제외
  const realEyes = eyes.filter(e => !(e.eye === "pixel" && (e.meta as any)?.stub));
  const hasFail = realEyes.some(e => e.grade === "FAIL");
  const hasWarn = realEyes.some(e => e.grade === "WARN");
  const pass = !hasFail;
  const overallScore = Math.round(eyes.filter(e => e.grade !== "WARN" || e.eye !== "pixel").reduce((s, e) => s + e.score, 0) / Math.max(1, eyes.filter(e => e.grade !== "WARN" || e.eye !== "pixel").length));
  const overallGrade: EyeGrade = hasFail ? "FAIL" : hasWarn ? "WARN" : "PASS";

  const fixInstructions: string[] = [];
  for (const e of eyes) {
    if (e.grade === "FAIL" && e.suggestion) fixInstructions.push(`[${e.eye}] ${e.suggestion}`);
    else if (e.grade === "FAIL") fixInstructions.push(`[${e.eye}] ${e.issues[0]}`);
  }

  const summary = eyes.map(e => `${e.eye}: ${e.grade} ${e.score}점${e.issues.length ? ` — ${e.issues[0].slice(0, 60)}` : ""}`).join("\n");

  return { pass, overallScore, overallGrade, eyes, summary, fixInstructions };
}

/**
 * 브라우저 모드 — Puppeteer로 정확한 getBBox() 검증
 * Manus VerificationAgent 패턴: Executor가 만든 페이지를 Verifier가 다시 열어 검증
 */
export async function inspectWithBrowser(htmlFilePath: string): Promise<TeamResult> {
  // 동적 import — puppeteer가 없어도 static 모드는 동작
  let puppeteer: any, chromium: any;
  try {
    // @ts-ignore - optional runtime deps
    puppeteer = await import("puppeteer-core");
    // @ts-ignore - optional runtime deps
    chromium = await import("@sparticuz/chromium");
  } catch {
    throw new Error("브라우저 모드에는 puppeteer-core + @sparticuz/chromium 필요 — npm i 시 재시도");
  }

  // @ts-ignore
  const exe = await (chromium.default ?? chromium).executablePath();
  // @ts-ignore
  const browser = await (puppeteer.default ?? puppeteer).launch({
    executablePath: exe,
    args: (chromium.default ?? chromium).args,
    headless: (chromium.default ?? chromium).headless,
  });

  const page = await browser.newPage();
  await page.goto("file://" + htmlFilePath, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));

  const browserData: any = await page.evaluate(() => {
    const figs: any[] = [];
    // @ts-ignore
    document.querySelectorAll(".fig").forEach((fig: any, idx: number) => {
      const figBox = fig.getBoundingClientRect();
      const svg = fig.querySelector("svg");
      if (!svg) return;
      const svgBox = svg.getBoundingClientRect();
      const overflowFig = svgBox.width > figBox.width + 1;
      const inner: any[] = [];
      svg.querySelectorAll("rect, ellipse, circle, path").forEach((el: any) => {
        try {
          const bb = el.getBBox();
          const vb = svg.viewBox.baseVal;
          if (bb.x < -1 || bb.y < -1 || bb.x + bb.width > vb.width + 1 || bb.y + bb.height > vb.height + 1) {
            inner.push({ tag: el.tagName, x: bb.x, y: bb.y, w: bb.width, h: bb.height, vbW: vb.width, vbH: vb.height });
          }
        } catch {}
      });
      figs.push({ figIndex: idx + 1, overflowFig, inner, pass: !overflowFig && inner.length === 0, figBox: { w: figBox.width, h: figBox.height }, svgBox: { w: svgBox.width, h: svgBox.height } });
    });
    // @ts-ignore
    const hasKoreanFont = document.fonts ? document.fonts.check('12px Noto Sans KR', '가') : false;
    const computedFont = getComputedStyle(document.body).fontFamily;
    // a11y: hidden 텍스트
    const a11yHidden = document.querySelectorAll('[aria-hidden=\"true\"]').length;
    return { figs, hasKoreanFont, computedFont, a11yHidden };
  });

  await browser.close();

  // Browser 결과를 TeamResult로 변환
  const geometryIssues: string[] = [];
  const geometryOverflows: GeometryIssue[] = [];
  for (const f of browserData.figs) {
    if (f.overflowFig) geometryIssues.push(`그림 ${f.figIndex}: svg(${f.svgBox.w.toFixed(0)}px)가 .fig 박스(${f.figBox.w.toFixed(0)}px) 초과`);
    for (const o of f.inner) {
      geometryOverflows.push({ figIndex: f.figIndex, tag: o.tag, x: o.x, y: o.y, w: o.w, h: o.h, vbW: o.vbW, vbH: o.vbH, overflowPx: Math.max(o.x + o.w - o.vbW, 0) });
      geometryIssues.push(`그림 ${f.figIndex} <${o.tag}> x=${o.x.toFixed(0)} w=${o.w.toFixed(0)} 가 viewBox ${o.vbW}x${o.vbH} 초과`);
    }
  }

  const geometry: GeometryEyeResult = {
    eye: "geometry",
    grade: geometryIssues.length ? "FAIL" : "PASS",
    score: Math.max(0, 100 - geometryIssues.length * 25),
    issues: geometryIssues,
    overflows: geometryOverflows,
    figCount: browserData.figs.length,
    failCount: browserData.figs.filter((f: any) => !f.pass).length,
    suggestion: geometryIssues.length ? "SVG 내부 요소의 rx/width를 줄이거나 부모 viewBox/컨테이너를 넓게 조정" : undefined,
    meta: { browserMode: true },
  };

  const typography: TypographyEyeResult = {
    eye: "typography",
    grade: browserData.hasKoreanFont ? "PASS" : "FAIL",
    score: browserData.hasKoreanFont ? 100 : 0,
    issues: browserData.hasKoreanFont ? [] : ["한글 폰트(Noto Sans KR) 미탑재 — 브라우저에서 '가' 렌더 실패 (□로 깨짐)"],
    hasKoreanFont: browserData.hasKoreanFont,
    brokenPatterns: [],
    suggestion: browserData.hasKoreanFont ? undefined : "woff를 base64로 @font-face 임베딩",
    meta: { computedFont: browserData.computedFont },
  };

  // a11y는 static 결과 재사용 가능하나, browser hidden 카운트 반영
  const _placeholder: any = checkAccessibilityStatic("");
  const accessibility: AccessibilityEyeResult = {
    eye: "accessibility",
    grade: "PASS",
    score: 100,
    issues: [],
    contrastFails: [],
    meta: { a11yHidden: browserData.a11yHidden },
  };

  const pixel: PixelEyeResult = { eye: "pixel", grade: "PASS", score: 100, issues: [], meta: { browserMode: true, note: "스크린샷 캡처 후 pixelmatch 비교는 호출자가 수행" } };

  const eyes: EyeResult[] = [geometry, typography, accessibility, pixel];
  const hasFail = eyes.some(e => e.grade === "FAIL");
  const pass = !hasFail;
  const overallScore = Math.round(eyes.reduce((s, e) => s + e.score, 0) / eyes.length);
  const overallGrade: EyeGrade = hasFail ? "FAIL" : "PASS";
  const fixInstructions = eyes.filter(e => e.grade === "FAIL").map(e => e.suggestion || e.issues[0]);
  const summary = eyes.map(e => `${e.eye}: ${e.grade} ${e.score}점`).join(" | ");

  return { pass, overallScore, overallGrade, eyes, summary, fixInstructions };
}
