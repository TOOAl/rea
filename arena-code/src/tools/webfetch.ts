import type { Tool, _ToolContext } from "./types.js";

export const WebFetchTool: Tool = {
  name: "WebFetch",
  description: "URL에서 문서를 가져와 텍스트로 변환. Firecrawl(CrawlAI 대안) JS 렌더링·추출 지원 — FIRECRAWL_API_KEY가 있으면 Firecrawl API 우선, 없으면 fetch fallback.",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "가져올 URL" },
      prompt: { type: "string", description: "추출할 정보에 대한 힌트 (선택)" },
      useFirecrawl: { type: "boolean", description: "Firecrawl API 사용 여부 (기본: env FIRECRAWL_API_KEY 있으면 true)" },
      extract: { type: "boolean", description: "Firecrawl extract 모드 (선택)" },
    },
    required: ["url"],
  },
  isConcurrencySafe: true,

  async execute(input): Promise<string> {
    const url = input.url as string;
    const useFirecrawl = (input as unknown as { useFirecrawl?: boolean }).useFirecrawl ?? !!process.env.FIRECRAWL_API_KEY;
    // Firecrawl 시도 — api.firecrawl.dev (Gap #12)
    if (useFirecrawl && process.env.FIRECRAWL_API_KEY) {
      try {
        const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
          body: JSON.stringify({ url, formats: ["markdown", "html"], onlyMainContent: true, waitFor: 2000 }),
          signal: AbortSignal.timeout(20000),
        });
        if (fcRes.ok) {
          const data = (await fcRes.json()) as { success?: boolean; data?: { markdown?: string; html?: string; metadata?: unknown } };
          if (data.success && data.data?.markdown) {
            const md = data.data.markdown.slice(0, 15000);
            return `Fetched via Firecrawl: ${url}\n${md}${data.data.markdown.length > 15000 ? "\n... (truncated)" : ""}`;
          }
          if (data.data?.html) {
            const stripped = data.data.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 15000);
            return `Fetched via Firecrawl (html): ${url}\n${stripped}`;
          }
        }
      } catch {
        // fallback to fetch
      }
    }
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "arena-code/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return `Fetch failed: ${res.status} ${res.statusText} for ${url}`;
      const text = await res.text();
      // Simple HTML to text (strip tags)
      const stripped = text
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 15000);
      return `Fetched: ${url} (${text.length} chars)\n${stripped}${text.length > 15000 ? "\n... (truncated)" : ""}`;
    } catch (e: unknown) {
      return `Error fetching ${url}: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
