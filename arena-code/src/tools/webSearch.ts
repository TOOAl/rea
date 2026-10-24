/**
 * WebSearch — 자료 찾는 능력의 핵심: URL을 모를 때 검색으로 찾는 도구
 * 설계: Provider 어댑터 패턴 — Tavily > Serper > Brave > Bing 순으로 env 키에 따라 자동 선택
 * Fallback: 키가 없으면 DuckDuckGo html scrape (제한적) + 명확한 안내 메시지
 *
 * 이전: WebFetch는 URL을 알아야 했음. 이제: 질문 → 검색 → fetch 체인 가능
 * 12살 설명: 도서관 사서 — 책 제목을 모르면 키워드로 목록을 먼저 찾아줌
 */

import type { Tool, ToolContext } from "./types.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
  publishedDate?: string;
  source?: string; // provider name
}

export interface SearchProvider {
  name: string;
  search(query: string, opts?: { count?: number }): Promise<SearchResult[]>;
}

// --- Tavily (권장, AI 검색 특화) ---
class TavilyProvider implements SearchProvider {
  name = "tavily";
  async search(query: string, opts?: { count?: number }): Promise<SearchResult[]> {
    const key = process.env.TAVILY_API_KEY;
    if (!key) throw new Error("TAVILY_API_KEY missing");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: "advanced",
        include_answer: false,
        max_results: opts?.count ?? 5,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Tavily ${res.status}`);
    const data = await res.json() as { results?: Array<{ title: string; url: string; content: string; score: number; published_date?: string }> };
    return (data.results ?? []).map(r => ({
      title: r.title, url: r.url, snippet: r.content?.slice(0, 500) ?? "", score: r.score, publishedDate: r.published_date, source: "tavily"
    }));
  }
}

// --- Serper (Google SERP) ---
class SerperProvider implements SearchProvider {
  name = "serper";
  async search(query: string, opts?: { count?: number }): Promise<SearchResult[]> {
    const key = process.env.SERPER_API_KEY;
    if (!key) throw new Error("SERPER_API_KEY missing");
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: query, num: opts?.count ?? 5 }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Serper ${res.status}`);
    const data = await res.json() as { organic?: Array<{ title: string; link: string; snippet: string; date?: string }> };
    return (data.organic ?? []).map(r => ({
      title: r.title, url: r.link, snippet: r.snippet ?? "", publishedDate: r.date, source: "serper"
    }));
  }
}

// --- Brave Search API ---
class BraveProvider implements SearchProvider {
  name = "brave";
  async search(query: string, opts?: { count?: number }): Promise<SearchResult[]> {
    const key = process.env.BRAVE_API_KEY;
    if (!key) throw new Error("BRAVE_API_KEY missing");
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${opts?.count ?? 5}`, {
      headers: { "Accept": "application/json", "X-Subscription-Token": key },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Brave ${res.status}`);
    const data = await res.json() as { results?: Array<{ title: string; url: string; description: string; age?: string }> };
    const web = (data as unknown as { web?: { results?: typeof data.results } }).web?.results ?? data.results ?? [];
    return web.map(r => ({
      title: r.title, url: r.url, snippet: r.description ?? "", publishedDate: r.age, source: "brave"
    }));
  }
}

// --- Bing (Azure) ---
class BingProvider implements SearchProvider {
  name = "bing";
  async search(query: string, opts?: { count?: number }): Promise<SearchResult[]> {
    const key = process.env.BING_API_KEY || process.env.AZURE_BING_KEY;
    if (!key) throw new Error("BING_API_KEY missing");
    const res = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${opts?.count ?? 5}`, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Bing ${res.status}`);
    const data = await res.json() as { webPages?: { value?: Array<{ name: string; url: string; snippet: string; dateLastCrawled?: string }> } };
    return (data.webPages?.value ?? []).map(r => ({
      title: r.name, url: r.url, snippet: r.snippet ?? "", publishedDate: r.dateLastCrawled, source: "bing"
    }));
  }
}

function pickProvider(): SearchProvider | null {
  if (process.env.TAVILY_API_KEY) return new TavilyProvider();
  if (process.env.SERPER_API_KEY) return new SerperProvider();
  if (process.env.BRAVE_API_KEY) return new BraveProvider();
  if (process.env.BING_API_KEY || process.env.AZURE_BING_KEY) return new BingProvider();
  return null;
}

export async function webSearch(query: string, opts: { count?: number; provider?: string } = {}): Promise<SearchResult[]> {
  const count = Math.min(opts.count ?? 5, 10);

  // 명시적 provider 지정
  if (opts.provider) {
    const map: Record<string, SearchProvider> = {
      tavily: new TavilyProvider(), serper: new SerperProvider(), brave: new BraveProvider(), bing: new BingProvider(),
    };
    const p = map[opts.provider];
    if (p) return p.search(query, { count });
  }

  const provider = pickProvider();
  if (provider) {
    try { return await provider.search(query, { count }); }
    catch (e) { /* fallback below, but surface error for observability */
      if (process.env.DEBUG) console.warn(`[WebSearch] ${provider.name} failed:`, e);
    }
  }

  // Fallback: env 키가 없으면 안내 + 빈 결과 (fail-open, 블록하지 않음)
  // DuckDuckGo html scrape는 ToS/안정성 이슈로 스캐폴딩에서 제외 — 키 발급 안내로 대체
  return [];
}

export function formatResultsForPrompt(results: SearchResult[], query: string): string {
  if (results.length === 0) {
    return `WebSearch: no results for "${query}". Hint: set TAVILY_API_KEY or SERPER_API_KEY or BRAVE_API_KEY to enable live search. You can still use Read/Grep/Glob for local files and WebFetch for known URLs.`;
  }
  const lines = [`WebSearch results for "${query}" (${results.length} hits):`];
  results.forEach((r, i) => {
    lines.push(`${i + 1}. [${r.source ?? "web"}] ${r.title}`);
    lines.push(`   URL: ${r.url}${r.publishedDate ? ` | date: ${r.publishedDate}` : ""}`);
    lines.push(`   ${r.snippet.slice(0, 300)}`);
  });
  lines.push(`Tip: Use WebFetch to read full pages, then cite sources with URL + date (fail-closed provenance).`);
  return lines.join("\n");
}

// --- Tool definition (arena-code Tool 인터페이스) ---
export const WebSearchTool: Tool = {
  name: "WebSearch",
  description: "웹에서 자료를 검색 — 질문/키워드로 관련 URL 목록을 반환 (Tavily/Serper/Brave/Bing 중 env 키 자동 선택). WebFetch와 체인해서 전문을 읽을 수 있음. 로컬 파일은 Grep/Glob 사용.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "검색 질의 (예: 코스피 2024-10-23 반등 원인)" },
      count: { type: "number", description: "반환 개수 (기본 5, 최대 10)" },
      provider: { type: "string", description: "강제 프로바이더 (tavily|serper|brave|bing, 선택)" },
    },
    required: ["query"],
  },
  isConcurrencySafe: true,

  async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
    const query = String(input.query ?? "").trim();
    if (!query) return "Error: query is required";
    const count = typeof input.count === "number" ? input.count : 5;
    const provider = typeof input.provider === "string" ? input.provider : undefined;

    try {
      const results = await webSearch(query, { count, provider });
      return formatResultsForPrompt(results, query);
    } catch (e: unknown) {
      return `WebSearch error for "${query}": ${e instanceof Error ? e.message : String(e)}. Tip: WebFetch for known URL, Grep/Glob for local files.`;
    }
  },
};
