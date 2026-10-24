/**
 * Research Loop — 고정 루프: WebSearch 5개 → 병렬 WebFetch → 비교표 → 출처 블록
 * API 없이도 동작: WebSearch가 local-rag로 흡수된 경우 file:// 결과를 Read로, 웹 결과는 WebFetch로
 * 12살 설명: 기자의 취재 순서 — (1) 목록 찾기 (2) 기사 5개 읽고 (3) 비교표 만들고 (4) 출처 달기
 */

import { webSearch, type SearchResult } from "../tools/webSearch.js";
import { WebFetchTool } from "../tools/webfetch.js";
import { ReadTool } from "../tools/read.js";

export interface ResearchOptions {
  count?: number; // WebSearch 결과 수, 기본 5
  fetchCount?: number; // WebFetch 병렬 수, 기본 5
  cwd?: string;
}

export interface ResearchHit {
  search: SearchResult;
  content?: string; // fetch/read 결과 텍스트 (5000자 이내)
  error?: string;
}

export interface ResearchReport {
  query: string;
  hits: ResearchHit[];
  comparisonTable: string; // markdown
  sourcesBlock: string; // 출처 블록
  summary: string;
}

/** 쿼리 분해: 간단 휴리스틱 — 원본 + 확장 2개 (원인/비교) — LLM 없이도 동작, 나중에 LLM 분해로 교체 가능 */
export function decomposeQuery(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  // 이미 길면 그대로, 짧으면 확장
  const subs: string[] = [q];
  // 한글 질의면 원인/전망 확장, 영문이면 cause/comparison
  const isKo = /[가-힣]/.test(q);
  if (isKo) {
    if (!q.includes("원인") && !q.includes("이유")) subs.push(`${q} 원인 분석`);
    if (!q.includes("비교") && !q.includes("전망")) subs.push(`${q} 비교 전망`);
  } else {
    if (!/cause|reason/i.test(q)) subs.push(`${q} cause analysis`);
    if (!/comparison|outlook/i.test(q)) subs.push(`${q} comparison outlook`);
  }
  return subs.slice(0, 3);
}

function dedupeByUrl(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = r.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

async function fetchOne(hit: SearchResult, cwd: string): Promise<{ content?: string; error?: string }> {
  const url = hit.url;
  try {
    if (url.startsWith("file://")) {
      // local-rag: Read로 흡수 (API 0) — ReadTool은 file_path 키
      const rel = url.replace("file://", "");
      const res = await ReadTool.execute({ file_path: rel }, { cwd });
      if (res.startsWith("Error reading")) return { error: res.slice(0, 200) };
      return { content: res.slice(0, 6000) };
    } else {
      const res = await WebFetchTool.execute({ url }, { cwd });
      return { content: res.slice(0, 6000) };
    }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function research(query: string, opts: ResearchOptions = {}): Promise<ResearchReport> {
  const count = Math.min(opts.count ?? 5, 10);
  const fetchCount = Math.min(opts.fetchCount ?? 5, 10);
  const cwd = opts.cwd ?? process.cwd();

  // 1) WebSearch (API 있으면 웹, 없으면 local-rag로 흡수)
  const subQueries = decomposeQuery(query);
  let allResults: SearchResult[] = [];
  for (const sq of subQueries) {
    try {
      const r = await webSearch(sq, { count });
      allResults.push(...r);
      if (allResults.length >= count) break;
    } catch {}
  }
  // fallback: subQuery 실패 시 원본만
  if (allResults.length === 0) {
    try { allResults = await webSearch(query, { count }); } catch {}
  }

  const deduped = dedupeByUrl(allResults).slice(0, count);

  // 2) 병렬 WebFetch/Read (5개)
  const toFetch = deduped.slice(0, fetchCount);
  const fetched = await Promise.all(toFetch.map(async (hit) => {
    const { content, error } = await fetchOne(hit, cwd);
    return { search: hit, content, error } as ResearchHit;
  }));

  // 아직 fetch 못한 나머지 (search만)
  const remaining = deduped.slice(fetchCount).map(r => ({ search: r } as ResearchHit));
  const hits: ResearchHit[] = [...fetched, ...remaining];

  // 3) 비교표 + 출처 블록 생성 (결정적 템플릿 — LLM 없이도 구조 보장, 나중에 LLM 요약으로 교체 가능)
  const comparisonTable = buildComparisonTable(query, hits);
  const sourcesBlock = buildSourcesBlock(hits);
  const summary = buildSummary(query, hits);

  return { query, hits, comparisonTable, sourcesBlock, summary };
}

function buildComparisonTable(query: string, hits: ResearchHit[]): string {
  if (hits.length === 0) return `| 항목 | 내용 |\n|---|---|\n| 질의 | ${query} |\n| 결과 | 검색 결과 없음 — Read/Grep으로 로컬 문서 직접 탐색 필요 |\n`;
  const header = `| # | 출처 | 핵심 스니펫 | 상태 |\n|---|---|---|---|`;
  const rows = hits.map((h, i) => {
    const title = h.search.title.replace(/\|/g, "/").slice(0, 40);
    const snippet = (h.content ?? h.search.snippet).replace(/\n/g, " ").replace(/\|/g, "/").slice(0, 100);
    const status = h.error ? `실패: ${h.error.slice(0, 30)}` : h.content ? `확보 ${h.content.length}자` : "스니펫만";
    return `| ${i + 1} | [${h.search.source ?? "web"}] ${title} | ${snippet}... | ${status} |`;
  });
  return [header, ...rows].join("\n");
}

function buildSourcesBlock(hits: ResearchHit[]): string {
  if (hits.length === 0) return `> 출처: 없음 (검색 결과 0 — 로컬 문서 재검색 권장)`;
  const lines = ["> **출처 (provenance, fail-closed 인용)**"];
  hits.forEach((h, i) => {
    const date = h.search.publishedDate ? ` (${h.search.publishedDate})` : "";
    const localHint = h.search.source?.startsWith("local") ? " — Read로 전문 확인 가능" : "";
    lines.push(`> ${i + 1}. ${h.search.title} — ${h.search.url}${date}${localHint}`);
  });
  lines.push(`> Rule: 위 출처에 없는 주장은 "출처 미확인"으로 표기, 날짜 없는 웹 출처는 수집일로 표기.`);
  return lines.join("\n");
}

function buildSummary(query: string, hits: ResearchHit[]): string {
  const got = hits.filter(h => h.content).length;
  const total = hits.length;
  if (total === 0) return `요약: "${query}"에 대해 검색 결과 없음. 로컬 문서나 다른 키워드로 재시도 필요.`;
  return `요약: "${query}"에 대해 ${total}개 출처 중 ${got}개 전문 확보. 비교표와 출처 블록을 근거로 답변 작성 가능. 미확보 ${total - got}개는 스니펫으로 인용.`;
}

// --- Tool 정의 (arena-code Registry에 등록 가능) ---
import type { Tool, ToolContext } from "../tools/types.js";

export const ResearchTool: Tool = {
  name: "Research",
  description: "고정 연구 루프 — WebSearch(5) → 병렬 WebFetch(5) → 비교표 + 출처 블록 생성. API 없이도 local-rag로 동작, 있으면 라이브 웹으로 승격. 12살 설명: 기자 취재 — 목록→기사읽기→표→출처.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "연구 질의 (예: 코스피 2024-10-23 반등 원인 비교)" },
      count: { type: "number", description: "검색 결과 수 (기본 5, 최대 10)" },
      fetchCount: { type: "number", description: "전문 확보 수 (기본 5, 최대 10)" },
    },
    required: ["query"],
  },
  isConcurrencySafe: true,

  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
    const query = String(input.query ?? "").trim();
    if (!query) return "Error: query is required";
    const count = typeof input.count === "number" ? input.count : 5;
    const fetchCount = typeof input.fetchCount === "number" ? input.fetchCount : 5;
    const report = await research(query, { count, fetchCount, cwd: ctx.cwd });
    const parts = [
      `# Research: ${report.query}`,
      ``,
      report.summary,
      ``,
      `## 비교표 (5개 병렬 확보)`,
      report.comparisonTable,
      ``,
      `## 출처 블록 (인용 필수)`,
      report.sourcesBlock,
    ];
    return parts.join("\n");
  },
};
