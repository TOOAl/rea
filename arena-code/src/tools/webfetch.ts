import type { Tool, ToolContext } from "./types.js";

export const WebFetchTool: Tool = {
  name: "WebFetch",
  description: "URL에서 문서를 가져와 텍스트로 변환. 외부 문서, API 스펙, 에러 검색에 사용.",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "가져올 URL" },
      prompt: { type: "string", description: "추출할 정보에 대한 힌트 (선택)" },
    },
    required: ["url"],
  },
  isConcurrencySafe: true,

  async execute(input): Promise<string> {
    const url = input.url as string;
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
