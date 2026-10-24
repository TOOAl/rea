import { describe, it, expect } from "vitest";
import { chunkText } from "../src/rag/chunker.js";
import { RagIndex } from "../src/rag/index.js";
import { webSearch, formatResultsForPrompt } from "../src/tools/webSearch.js";
import { estimateTokens, estimateTokensFallback, checkBudget } from "../src/loop/tokenizer.js";
import { buildStructuralContext, formatStructuralContext } from "../src/loop/structuralContext.js";
import { buildRegistry } from "../src/tools/index.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Scaffolding — RAG chunker", () => {
  it("텍스트를 1600자 단위로 분할 + overlap", () => {
    const text = "hello world. ".repeat(500); // ~6500 chars
    const chunks = chunkText(text, "test.md");
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].source).toBe("test.md");
    // overlap 보존: 두 번째 청크 start < 첫 청크 end
    expect(chunks[1].start).toBeLessThan(chunks[0].end);
  });

  it("짧은 텍스트는 빈 배열 또는 1청크", () => {
    expect(chunkText("", "a.md")).toEqual([]);
    expect(chunkText("hi", "a.md")).toEqual([]);
    expect(chunkText("This is a meaningful sentence with enough length to pass min threshold of 100 chars. ".repeat(2), "b.md").length).toBeGreaterThan(0);
  });
});

describe("Scaffolding — RagIndex", () => {
  it("add + search 하이브리드 랭킹", () => {
    const idx = new RagIndex({ domain: "test-rag" });
    idx.addDocuments([
      { source: "kospi.md", text: "코스피 2024-10-23 장중 5305 저점 후 5550 마감, 외국인 순매도 9934억 기관 순매수 8723억. ".repeat(5) },
      { source: "solar.md", text: "영농형 태양광 농촌 태양광 보급 현황과 정책. 농업과 에너지 자립을 위한 태양광 패널 설치 사례. ".repeat(5) },
      { source: "ghidra.md", text: "Ghidra p-code 분석과 decompile, 바이너리 리버싱에서 중간 표현을 활용한 분석 기법. ".repeat(5) },
    ]);
    expect(idx.size).toBeGreaterThan(2);
    const hits = idx.search("코스피 외국인 순매도", 2);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].chunk.source).toBe("kospi.md");
  });

  it("persist/load 라운드트립", () => {
    const tmp = mkdtempSync(join(tmpdir(), "rag-"));
    const idx = new RagIndex({ domain: "persist-test", persistDir: tmp });
    idx.addDocuments([{ source: "a.md", text: "hello rag world, this is a test document for persistence check. ".repeat(10) }]);
    const p = idx.persist();
    expect(p).not.toBeNull();
    const idx2 = new RagIndex({ domain: "persist-test", persistDir: tmp });
    expect(idx2.load()).toBe(true);
    expect(idx2.size).toBe(idx.size);
  });
});

describe("Scaffolding — WebSearch", () => {
  it("API 없이도 rea 흡수 — 키 없으면 로컬 fallback, 없으면 안내 (fail-open)", async () => {
    const results = await webSearch("test query without keys qwerty_no_match_12345", { count: 3 });
    // nonsense query → 로컬에서도 매치 0 → 빈 배열이지만 죽지 않음 (API 없이 흡수 철학)
    expect(Array.isArray(results)).toBe(true);
    const msg = formatResultsForPrompt(results, "test query without keys");
    // 빈 결과면 키 힌트, 로컬이면 local 태그 — 둘 다 API 없이 흡수된 경로
    if (results.length === 0) {
      expect(msg).toContain("TAVILY_API_KEY");
      expect(msg).toContain("no results");
    } else {
      expect(results[0].source).toMatch(/local/);
      expect(msg).toContain("local");
    }
  });
  it("API 없이 로컬 문서 검색 — rea 내부 흡수 경로", async () => {
    // BASE_CAPABILITY_IMPROVEMENT.md 같은 로컬 문서는 반드시 있으므로 이 쿼리는 local hit이 있어야 함
    const results = await webSearch("BASE_CAPABILITY_IMPROVEMENT 문맥 의도 품질", { count: 3 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].source).toMatch(/local/);
    expect(results[0].url).toContain("file://");
    const msg = formatResultsForPrompt(results, "BASE_CAPABILITY_IMPROVEMENT");
    expect(msg).toContain("local");
  });

  it("ToolRegistry에 WebSearch 포함", () => {
    const reg = buildRegistry();
    expect(reg.has("WebSearch")).toBe(true);
    expect(reg.has("WebFetch")).toBe(true);
    expect(reg.get("WebSearch")?.description).toMatch(/검색/);
  });
});

describe("Scaffolding — Tokenizer + Budget", () => {
  it("한글 CJK 보정으로 토큰 추정 동작", () => {
    const ascii = [{ role: "user" as const, content: "hello world ".repeat(100) }];
    const koreanSameLen = [{ role: "user" as const, content: "가나다라 ".repeat(100) }]; // 500 chars, nonAscii 400
    const tAscii = estimateTokens(ascii);
    const tKorean = estimateTokens(koreanSameLen);
    const tFallback = estimateTokensFallback(ascii);
    // 기본 동작: 토큰 수 >0
    expect(tAscii).toBeGreaterThan(0);
    expect(tKorean).toBeGreaterThan(0);
    expect(tFallback).toBeGreaterThan(0);
    // CJK 보정: 동일 문자 수에서 한글은 ASCII보다 보정으로 인해 더 크게 추정되는지 확인
    // (500 chars ASCII ≈125 tokens, 500 chars 한글 ≈ (500+200)/4=175 토큰)
    const ascii500 = [{ role: "user" as const, content: "a".repeat(500) }];
    const korean500 = [{ role: "user" as const, content: "가".repeat(500) }];
    expect(estimateTokens(korean500)).toBeGreaterThan(estimateTokens(ascii500));
  });

  it("checkBudget 80% 기준", () => {
    const small = [{ role: "user" as const, content: "hi" }];
    const r = checkBudget(small, 6000);
    expect(r.ok).toBe(true);
    expect(r.tokens).toBeGreaterThan(0);
  });
});

describe("Scaffolding — Structural Context", () => {
  it("cwd 구조 스캔이 빈 값 없이 반환", async () => {
    const sc = await buildStructuralContext(process.cwd(), { budgetChars: 2000 });
    expect(sc.topLevelFiles.length).toBeGreaterThan(0);
    expect(sc.budgetChars).toBe(2000);
    const formatted = formatStructuralContext(sc);
    expect(formatted).toContain("Structural Context");
    expect(formatted.length).toBeLessThanOrEqual(3000); // budget 내
  });
});
