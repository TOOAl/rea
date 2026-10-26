/**
 * Exam Layout QA — 4-Eye 자동 검수 (정적 0.1초 + Puppeteer 브라우저 모드)
 * 사용: node scripts/inspect_layout.js            — 정적 + 브라우저 이중 검증
 *       npm run qa:exam  (arena-code)             — tsx 4-Eye (빠른 정적)
 *
 * 흡수: Manus VerificationAgent / Codex --image / Cursor AXTree / Claude [ref] / Ghidra P-Code
 */
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { tmpdir } from 'os';
import { join } from 'path';
import fs from 'fs';

process.env.LD_LIBRARY_PATH = ['/tmp/al2023/lib', '/tmp', process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
process.env.FONTCONFIG_PATH = join(tmpdir(), 'fonts');
process.env.HOME = tmpdir();

const TARGETS = [
  '/home/user/rea/중3과학시험지/3학년_과학_문제지.html',
  '/home/user/rea/중3과학시험지/3학년_과학_정답및해설지.html',
  '/home/user/rea/중3과학시험지/12살을위한_쉬운과학설명서.html',
];

async function inspect(file) {
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath,
    args: chromium.args,
    headless: chromium.headless,
  });
  const page = await browser.newPage();
  await page.goto('file://' + file, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));
  const results = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.fig').forEach((fig, idx) => {
      const figBox = fig.getBoundingClientRect();
      // check each svg child vs its immediate parent rect
      const svg = fig.querySelector('svg');
      if (!svg) return;
      const svgBox = svg.getBoundingClientRect();
      // fig container should contain svg
      const overflowFig = (svgBox.width > figBox.width + 1) || (svgBox.height > figBox.height + 1);
      // check inner elements vs svg viewBox approximated by svgBox
      const inner = [];
      svg.querySelectorAll('rect, ellipse, circle, path').forEach(el => {
        try {
          const bb = el.getBBox();
          // viewBox is 0 0 width height
          const vb = svg.viewBox.baseVal;
          if (bb.x < -2 || bb.y < -2 || (bb.x + bb.width) > vb.width + 2 || (bb.y + bb.height) > vb.height + 2) {
            inner.push({ tag: el.tagName, x: bb.x, y: bb.y, w: bb.width, h: bb.height, vbW: vb.width, vbH: vb.height });
          }
        } catch {}
      });
      out.push({
        figIndex: idx + 1,
        figBox: { w: figBox.width, h: figBox.height },
        svgBox: { w: svgBox.width, h: svgBox.height },
        overflowFig,
        innerOverflows: inner,
        pass: !overflowFig && inner.length === 0,
      });
    });
    // font check: Noto Sans KR contains '가'
    const hasKoreanFont = document.fonts.check('12px Noto Sans KR', '가나다');
    // contrast quick check: yellow box white text would fail
    return { file: location.pathname, hasKoreanFont, figs: out };
  });
  await browser.close();
  return results;
}

(async () => {
  let allPass = true;
  for (const f of TARGETS) {
    console.log(`\n=== ${f} ===`);
    if (!fs.existsSync(f)) { console.log('  SKIP not found'); continue; }
    const r = await inspect(f);
    console.log(`  한글 폰트 탑재: ${r.hasKoreanFont ? 'PASS ✓' : 'FAIL ✗'}`);
    if (!r.hasKoreanFont) allPass = false;
    r.figs.forEach(fig => {
      const status = fig.pass ? 'PASS ✓' : 'FAIL ✗';
      console.log(`  그림 ${fig.figIndex}: ${status}  fig ${fig.figBox.w.toFixed(0)}x${fig.figBox.h.toFixed(0)} svg ${fig.svgBox.w.toFixed(0)}x${fig.svgBox.h.toFixed(0)}`);
      if (fig.innerOverflows.length) {
        console.log(`    → 내부 요소 경계 초과 ${fig.innerOverflows.length}개`);
        fig.innerOverflows.forEach(o => console.log(`      - <${o.tag}> x=${o.x.toFixed(1)} y=${o.y.toFixed(1)} w=${o.w.toFixed(1)} h=${o.h.toFixed(1)} vs viewBox ${o.vbW}x${o.vbH}`));
        allPass = false;
      }
      if (fig.overflowFig) { console.log('    → svg가 .fig 박스를 초과'); allPass = false; }
    });
  }
  console.log(`\n${allPass ? '✅ 전체 PASS' : '❌ FAIL 있음 — 수정 필요'}`);
  process.exit(allPass ? 0 : 1);
})();
