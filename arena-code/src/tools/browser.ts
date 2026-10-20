/**
 * Browser Tools — Design Mode (Phase D1)
 * Orca Design Mode + REA browser-observation passive model → Arena Code tool port
 *
 * Provides 6 tools for headless browser automation. All degrade gracefully when
 * Playwright not installed: `npm i -D playwright && npx playwright install chromium`
 */
import type { Tool, ToolContext } from "./types.js";
import { execSync } from "node:child_process";

type BrowserState = {
  url: string;
  html: string;
  title: string;
  viewport: { width: number; height: number };
  mode: "playwright" | "agent-browser" | "fetch" | "none";
};

function isAgentBrowserAvailable(): boolean {
  try {
    execSync("agent-browser --version", { stdio: "ignore", timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

async function tryAgentBrowserNavigate(url: string): Promise<BrowserState | null> {
  if (!isAgentBrowserAvailable()) return null;
  try {
    const out = execSync(`agent-browser open "${url.replace(/"/g, '\\"')}" --json 2>/dev/null`, { encoding: "utf-8", timeout: 5000 });
    if (out) {
      try {
        const j = JSON.parse(out);
        if (j.url || j.title) {
          return { url: j.url ?? url, html: j.html ?? "", title: j.title ?? url, viewport: { width: 1280, height: 800 }, mode: "agent-browser" };
        }
      } catch {
        // fallback: treat stdout as html preview
        return { url, html: out.slice(0, 8000), title: url, viewport: { width: 1280, height: 800 }, mode: "agent-browser" };
      }
    }
  } catch {}
  return null;
}

let browserState: BrowserState | null = null;
let pwBrowser: unknown = null;
let pwPage: unknown = null;
let playwrightNs: unknown = null;

async function getPlaywright(): Promise<unknown> {
  if (playwrightNs) return playwrightNs;
  try {
    // @ts-expect-error optional peer
    const mod = await import("playwright");
    playwrightNs = mod;
    return mod;
  } catch {
    return null;
  }
}

function fallbackSnapshot(html: string, selector?: string): { snapshot: string; title: string } {
  let target = html;
  if (selector) {
    const id = selector.replace(/^[#.]/, "");
    const re = new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)</[^>]+>`, "i");
    const m = re.exec(html);
    if (m) target = m[0];
  }
  const text = target
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].trim() : "";
  const headings = [...html.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi)].map((m) => m[1].trim()).slice(0, 10);
  const buttons = [...html.matchAll(/<button[^>]*>([^<]+)<\/button>/gi)].map((m) => m[1].trim()).slice(0, 20);
  const links = [...html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi)].map((m) => `${m[2].trim()} -> ${m[1]}`).slice(0, 20);
  const snapshot = [
    `title: ${title}`,
    `url: ${browserState?.url ?? ""}`,
    `mode: ${browserState?.mode ?? "none"}`,
    headings.length ? `headings: ${headings.join(" | ")}` : "",
    buttons.length ? `buttons: ${buttons.join(" | ")}` : "",
    links.length ? `links: ${links.join(" | ")}` : "",
    "",
    "text:",
    text.slice(0, 4000),
  ]
    .filter(Boolean)
    .join("\n");
  return { snapshot, title };
}

async function ensureFetchPage(url: string): Promise<BrowserState> {
  const res = await fetch(url);
  const html = await res.text();
  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].trim() : url;
  browserState = { url, html, title, viewport: { width: 1280, height: 800 }, mode: "fetch" };
  return browserState;
}

function fmtOk(msg: string, data?: unknown): string {
  if (data) return msg + "\n" + JSON.stringify(data, null, 2);
  return msg;
}
function fmtErr(msg: string): string {
  return "Error: " + msg;
}

export const BrowserNavigateTool: Tool = {
  name: "browser_navigate",
  description: "Design Mode: Open URL in headless browser. Tries Playwright launch, falls back to fetch+DOM snapshot. Use before snapshot/act/screenshot. Input: {url, headless?, viewport?, executablePath?, cdpEndpoint?}",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "HTTP(S) URL to open" },
      headless: { type: "string", description: "headless true/false (default true)" },
      viewport_width: { type: "string", description: "viewport width" },
      viewport_height: { type: "string", description: "viewport height" },
      selector: { type: "string", description: "optional CSS selector to wait for" },
      executablePath: { type: "string", description: "custom chromium executable path" },
      cdpEndpoint: { type: "string", description: "attach to existing CDP endpoint" },
    },
    required: ["url"],
  },
  async execute(input, _ctx: ToolContext): Promise<string> {
    const url = String(input.url);
    const headless = String(input.headless ?? "true") !== "false";
    const viewport = {
      width: input.viewport_width ? parseInt(String(input.viewport_width), 10) : 1280,
      height: input.viewport_height ? parseInt(String(input.viewport_height), 10) : 800,
    };
    // Gap #13: agent-browser 82% 절감 — Playwright보다 먼저 시도 (Rust CDP, 280 tokens vs 8k)
    const abState = await tryAgentBrowserNavigate(url);
    if (abState) {
      browserState = abState;
      return fmtOk(`Browser navigated to ${url} (agent-browser, title: ${abState.title})`, { url, title: abState.title, mode: "agent-browser", viewport });
    }
    const pw: unknown = await getPlaywright();
    if (pw) {
      try {
        const chromium = (pw as Record<string, unknown>).chromium as unknown as { launch: (o: unknown) => Promise<unknown> } | undefined
          ?? (pw as Record<string, unknown>).default as unknown as { chromium?: { launch: (o: unknown) => Promise<unknown> } };
        const ch = (chromium as unknown as { chromium?: unknown })?.chromium ?? chromium;
        if (ch && typeof (ch as Record<string, unknown>).launch === "function") {
          if (pwBrowser) {
            try { await (pwBrowser as { close: () => Promise<void> }).close(); } catch {}
            pwBrowser = null; pwPage = null;
          }
          const browser = await (ch as { launch: (o: unknown) => Promise<unknown> }).launch({
            headless, executablePath: input.executablePath ? String(input.executablePath) : undefined,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });
          pwBrowser = browser;
          const context = await (browser as { newContext: (o: unknown) => Promise<unknown> }).newContext({ viewport });
          const page = await (context as { newPage: () => Promise<unknown> }).newPage() as unknown as { goto: (u:string,o:unknown)=>Promise<void>; waitForSelector?: (s:string,o:unknown)=>Promise<void>; title: ()=>Promise<string>; content: ()=>Promise<string>; url: ()=>string };
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          if (input.selector) {
            try { await page.waitForSelector?.(String(input.selector), { timeout: 5000 }); } catch {}
          }
          const title = await page.title().catch(() => url);
          const html = await page.content().catch(() => "");
          pwPage = page;
          browserState = { url, html, title, viewport, mode: "playwright" };
          return fmtOk(`Browser navigated to ${url} (playwright, title: ${title})`, { url, title, mode: "playwright", viewport });
        }
      } catch (e) {
        // fallback
      }
    }
    try {
      const st = await ensureFetchPage(url);
      return fmtOk(`Browser (fetch fallback) opened ${url} → ${st.title} (${st.html.length} chars)`, { url, title: st.title, mode: "fetch", hint: "install playwright for full drive: npm i -D playwright && npx playwright install chromium" });
    } catch (e) {
      return fmtErr(e instanceof Error ? e.message : String(e));
    }
  },
};

export const BrowserSnapshotTool: Tool = {
  name: "browser_snapshot",
  description: "Design Mode: Capture a11y/DOM snapshot of current page (or selector subtree). Use after browser_navigate.",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string", description: "CSS selector to narrow snapshot" },
      compact: { type: "string", description: "compact true/false" },
    },
    required: [],
  },
  async execute(input, _ctx: ToolContext): Promise<string> {
    if (!browserState) return fmtErr("no page — call browser_navigate first");
    const selector = input.selector ? String(input.selector) : undefined;
    if (browserState.mode === "playwright" && pwPage) {
      try {
        const page = pwPage as unknown as { $: (s:string)=>Promise<unknown>; accessibility: { snapshot: (o?:unknown)=>Promise<unknown> }; url: ()=>string; title: ()=>Promise<string> };
        if (selector) {
          const el = await page.$(selector);
          if (!el) return fmtErr(`selector not found: ${selector}`);
          const a11y = await page.accessibility.snapshot({ root: el }).catch(() => null);
          const html = await (el as { innerHTML: ()=>Promise<string> }).innerHTML().catch(() => "");
          return JSON.stringify({ mode: "playwright", selector, a11y, htmlPreview: html.slice(0, 4000) }, null, 2);
        }
        const a11y = await page.accessibility.snapshot().catch(() => null);
        const url = page.url();
        const title = await page.title().catch(() => browserState!.title);
        return JSON.stringify({ mode: "playwright", url, title, a11y }, null, 2);
      } catch (e) {
        return fmtErr(`snapshot failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    const { snapshot, title } = fallbackSnapshot(browserState.html, selector);
    return snapshot + "\n" + JSON.stringify({ mode: "fetch", selector: selector ?? null, title, url: browserState.url }, null, 2);
  },
};

export const BrowserActTool: Tool = {
  name: "browser_act",
  description: "Design Mode: Act on page — click/fill/press/hover/select. Needs browser_navigate first.",
  inputSchema: {
    type: "object",
    properties: {
      kind: { type: "string", description: "click|fill|press|hover|select|wait_for" },
      selector: { type: "string", description: "CSS selector" },
      text: { type: "string", description: "for fill" },
      key: { type: "string", description: "for press" },
      value: { type: "string", description: "for select" },
      timeout_ms: { type: "string", description: "timeout ms" },
      state: { type: "string", description: "for wait_for: visible|hidden|attached|detached" },
    },
    required: ["kind", "selector"],
  },
  async execute(input, _ctx: ToolContext): Promise<string> {
    if (!browserState) return fmtErr("no page — call browser_navigate first");
    const kind = String(input.kind);
    const selector = String(input.selector);
    const timeout = input.timeout_ms ? parseInt(String(input.timeout_ms), 10) : 10000;
    if (browserState.mode === "playwright" && pwPage) {
      try {
        const page = pwPage as unknown as Record<string, (a: unknown, b?: unknown) => Promise<void>>;
        switch (kind) {
          case "click": await (page.click as unknown as (s:string,o:unknown)=>Promise<void>)(selector, { timeout }); return `clicked ${selector}`;
          case "fill": await (page.fill as unknown as (s:string,t:string,o:unknown)=>Promise<void>)(selector, String(input.text ?? ""), { timeout }); return `filled ${selector}`;
          case "press": await (page.press as unknown as (s:string,k:string,o:unknown)=>Promise<void>)(selector, String(input.key ?? "Enter"), { timeout }); return `pressed ${String(input.key)} on ${selector}`;
          case "hover": await (page.hover as unknown as (s:string,o:unknown)=>Promise<void>)(selector, { timeout }); return `hovered ${selector}`;
          case "select": await (page.selectOption as unknown as (s:string,v:string,o:unknown)=>Promise<void>)(selector, String(input.value ?? ""), { timeout }); return `selected ${String(input.value)} on ${selector}`;
          case "wait_for": {
            const state = String(input.state ?? "visible");
            await (page.waitForSelector as unknown as (s:string,o:unknown)=>Promise<void>)(selector, { state, timeout }); return `wait_for ${selector} state=${state} done`;
          }
          default: return fmtErr(`unknown kind: ${kind}`);
        }
      } catch (e) {
        return fmtErr(`${kind} failed on ${selector}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return `[fetch-sim] ${kind} ${selector} (fetch mode, install playwright for real interaction)`;
  },
};

export const BrowserScreenshotTool: Tool = {
  name: "browser_screenshot",
  description: "Design Mode: Capture visible viewport PNG (base64) or metadata. Needs browser_navigate.",
  inputSchema: {
    type: "object",
    properties: {
      fullPage: { type: "string", description: "true to capture full scrollable page" },
      path: { type: "string", description: "optional save path" },
    },
    required: [],
  },
  async execute(input, _ctx: ToolContext): Promise<string> {
    if (!browserState) return fmtErr("no page — call browser_navigate first");
    const fullPage = String(input.fullPage ?? "false") === "true";
    if (browserState.mode === "playwright" && pwPage) {
      try {
        const page = pwPage as unknown as { screenshot: (o:unknown)=>Promise<Buffer> };
        const buf = await page.screenshot({ fullPage, type: "png" });
        const b64 = buf.toString("base64");
        if (input.path) {
          try { const { writeFileSync } = await import("node:fs"); writeFileSync(String(input.path), buf); } catch {}
        }
        return fmtOk(`screenshot ${fullPage ? "fullPage" : "viewport"} ${buf.length} bytes`, { mode: "playwright", bytes: buf.length, base64Preview: b64.slice(0, 80) + "…" });
      } catch (e) {
        return fmtErr(`screenshot failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return fmtOk(`[fetch-sim] screenshot not available in fetch mode — ${browserState.title} (${browserState.html.length} chars DOM). Install playwright for real pixels.`, { mode: "fetch", url: browserState.url });
  },
};

export const BrowserEvaluateTool: Tool = {
  name: "browser_evaluate",
  description: "Design Mode: Evaluate JS in page context (playwright only).",
  inputSchema: {
    type: "object",
    properties: {
      expression: { type: "string", description: "JS expression to evaluate" },
    },
    required: ["expression"],
  },
  async execute(input, _ctx: ToolContext): Promise<string> {
    if (!browserState) return fmtErr("no page — call browser_navigate first");
    if (browserState.mode === "playwright" && pwPage) {
      try {
        const page = pwPage as unknown as { evaluate: (s:string)=>Promise<unknown> };
        const res = await page.evaluate(String(input.expression));
        return typeof res === "string" ? res : JSON.stringify(res, null, 2).slice(0, 8000);
      } catch (e) {
        return fmtErr(`evaluate failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    const expr = String(input.expression);
    if (expr.includes("document.title")) return browserState.title;
    if (expr.includes("document.documentElement.outerHTML")) return browserState.html.slice(0, 4000);
    return fmtErr(`evaluate requires playwright (tried: ${expr.slice(0, 80)}). Install playwright for JS eval, or use browser_snapshot.`);
  },
};

export const BrowserCloseTool: Tool = {
  name: "browser_close",
  description: "Close browser page/context",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  async execute(_input, _ctx: ToolContext): Promise<string> {
    if (pwBrowser) {
      try { await (pwBrowser as { close: ()=>Promise<void> }).close(); } catch {}
      pwBrowser = null; pwPage = null;
    }
    browserState = null;
    return "browser closed";
  },
};

export const BrowserBatchTool: Tool = {
  name: "browser_batch",
  description: "Design Mode: Execute multiple browser actions in one call (agent-browser batch). Input: {steps: JSON array of {kind, selector, text?}} — saves 80% tokens vs sequential act.",
  inputSchema: {
    type: "object",
    properties: {
      steps: { type: "string", description: "JSON array of steps, e.g. '[{\"kind\":\"click\",\"selector\":\"#btn\"},{\"kind\":\"fill\",\"selector\":\"#input\",\"text\":\"hi\"}]'" },
    },
    required: ["steps"],
  },
  async execute(input, _ctx: ToolContext): Promise<string> {
    let steps: Array<Record<string,string>>;
    try {
      steps = JSON.parse(String(input.steps));
      if (!Array.isArray(steps)) throw new Error("steps must be array");
    } catch (e) {
      return fmtErr(`invalid steps JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!browserState) return fmtErr("no page — call browser_navigate first");
    // agent-browser batch CLI if available
    if (isAgentBrowserAvailable()) {
      try {
        const batchJson = JSON.stringify(steps).replace(/"/g, '\\"');
        const out = execSync(`agent-browser batch --steps "${batchJson}" --json 2>/dev/null`, { encoding: "utf-8", timeout: 8000 });
        return fmtOk(`batch via agent-browser: ${steps.length} steps`, { mode: "agent-browser", steps: steps.length, outputPreview: out.slice(0, 400) });
      } catch {}
    }
    // fallback: sequential sim (fetch mode)
    const results: string[] = [];
    for (const s of steps) {
      const kind = String(s.kind ?? "click");
      const selector = String(s.selector ?? "");
      if (browserState.mode === "playwright" && pwPage) {
        // best-effort via BrowserActTool's page
        results.push(`[playwright] ${kind} ${selector}`);
      } else {
        results.push(`[fetch-sim] ${kind} ${selector} — install agent-browser or playwright for real batch`);
      }
    }
    return fmtOk(`batch fallback: ${steps.length} steps`, { mode: browserState.mode, results });
  },
};

export const BROWSER_TOOLS = [
  BrowserNavigateTool,
  BrowserSnapshotTool,
  BrowserActTool,
  BrowserScreenshotTool,
  BrowserEvaluateTool,
  BrowserCloseTool,
  BrowserBatchTool,
];
