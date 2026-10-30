/**
 * HTML → PNG 렌더러 — 한글 깨짐 0% (Playwright)
 * 기존 generate_image는 영문 픽셀 생성이라 한글 오타 났음.
 * 이 렌더러는 우리가 만든 HTML을 크롬 헤드리스로 직접 캡처해 1080x1080 PNG를 만든다.
 * 폰트: Noto Sans KR / Pretendard / Gowun Dodum CDN으로 고정.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface RenderOpts {
  width?: number; // 1080
  height?: number; // 1080 or 1920 for story
  scale?: number; // deviceScaleFactor 2 for retina
  waitMs?: number; // 폰트 로딩 대기
}

export async function renderHtmlToPng(html: string, outPath: string, opts: RenderOpts = {}): Promise<string> {
  const width = opts.width ?? 1080;
  const height = opts.height ?? 1080;
  const scale = opts.scale ?? 2;

  // 동적 import — playwright 없을 때 fallback 에러 메시지
  let chromium: any;
  try {
    chromium = (await import("playwright")).chromium;
  } catch {
    throw new Error("playwright 미설치 — npm i -D playwright && npx playwright install chromium 필요");
  }

  const dir = dirname(resolve(outPath));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  const page = await context.newPage();

  // HTML 주입 — 폰트 로드를 위해 networkidle 대기
  await page.setContent(html, { waitUntil: "networkidle" });
  if (opts.waitMs) await page.waitForTimeout(opts.waitMs);
  else await page.waitForTimeout(1200); // 구글 폰트 로딩

  // 전체 body 캡처 (1080x1080 고정). clip으로 정확히 자르기
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width, height }, type: "png" });

  await browser.close();
  return outPath;
}

// CLI: npx tsx src/visual/render.ts input.html output.png
if (import.meta.url === `file://${resolve(process.argv[1] ?? "")}`) {
  const [inPath, outPath] = process.argv.slice(2);
  if (!inPath || !outPath) {
    console.error("usage: npx tsx src/visual/render.ts <input.html> <output.png> [width height]");
    process.exit(1);
  }
  const { readFileSync } = await import("node:fs");
  const html = readFileSync(resolve(inPath), "utf-8");
  const w = Number(process.argv[4]) || 1080;
  const h = Number(process.argv[5]) || 1080;
  await renderHtmlToPng(html, resolve(outPath), { width: w, height: h });
  console.log(`rendered ${outPath} ${w}x${h}`);
}
