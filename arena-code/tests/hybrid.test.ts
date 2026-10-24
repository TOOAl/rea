import { describe, it, expect } from "vitest";
import { RagIndex } from "../src/rag/index.js";
import { HashEmbedder, getEmbedder } from "../src/rag/embedder.js";
import { estimateTokensAccurate, estimateTokensFallback, checkBudget } from "../src/loop/tokenizer.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Hybrid — js-tiktoken tokenizer 정확도", () => {
  it("estimateTokensAccurate는 fallback과 다른 정확한 값 반환 (한글/영문)", async () => {
    const msgs = [{ role: "user" as const, content: "안녕하세요, 코스피 2024-10-23 반등 원인을 분석해줘. ".repeat(10) }];
    const accurate = await estimateTokensAccurate(msgs);
    const fallback = estimateTokensFallback(msgs);
    expect(accurate).toBeGreaterThan(0);
    expect(fallback).toBeGreaterThan(0);
    // tiktoken은 fallback(4-char)보다 더 정확한 값 — 한글에서 차이가 나야 함
    expect(accurate).not.toBe(fallback);
    // CJK 포함 버짓 체크도 동작
    const report = checkBudget(msgs, 6000);
    expect(report.tokens).toBeGreaterThan(0);
    expect(report.budget).toBe(6000);
  });
});

describe("Hybrid — HashEmbedder + RagIndex 하이브리드", () => {
  it("HashEmbedder는 결정적 128차원 정규화 벡터", () => {
    const emb = new HashEmbedder(128);
    const v1 = emb.embed("코스피 반등");
    const v2 = emb.embed("코스피 반등");
    expect(v1.length).toBe(128);
    expect(v1).toEqual(v2); // 결정적
    const v3 = emb.embed("영농형 태양광");
    expect(emb.similarity(v1, v3)).toBeLessThan(0.9); // 다른 문서는 유사도 낮음
    expect(emb.similarity(v1, v1)).toBeCloseTo(1, 5);
  });

  it("RagIndex buildVectors + searchHybrid 0.5:0.5", async () => {
    const idx = new RagIndex({ domain: "hybrid-test" });
    idx.addDocuments([
      { source: "kospi.md", text: "코스피 2024-10-23 장중 5305 저점 후 5550 마감, 외국인 순매도 9934억 기관 순매수 8723억. ".repeat(5) },
      { source: "solar.md", text: "영농형 태양광 농촌 태양광 보급 현황과 정책. 농업과 에너지 자립을 위한 태양광 패널 설치 사례. ".repeat(5) },
    ]);
    const built = await idx.buildVectors();
    expect(built).toBeGreaterThan(0);
    expect(idx.hasVectors).toBe(true);

    // sparse만 vs hybrid: 둘 다 kospi를 1위로 찾아야 함
    const sparseHits = idx.search("코스피 외국인 순매도", 2);
    const hybridHits = await idx.searchHybrid("코스피 외국인 순매도", 2);
    expect(sparseHits[0].chunk.source).toBe("kospi.md");
    expect(hybridHits[0].chunk.source).toBe("kospi.md");
    // hybrid는 vectorScores 합성으로 점수가 다름
    expect(hybridHits[0].score).not.toBe(sparseHits[0].score);
  });

  it("persist/load 벡터 영속화 (vectors.json)", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "rag-hybrid-"));
    const idx = new RagIndex({ domain: "persist-vec", persistDir: tmp });
    idx.addDocuments([{ source: "a.md", text: "hello hybrid rag world, 영농형 태양광 테스트. ".repeat(10) }]);
    await idx.buildVectors();
    idx.persist();
    // 새 인덱스에서 로드
    const idx2 = new RagIndex({ domain: "persist-vec", persistDir: tmp });
    expect(idx2.load()).toBe(true);
    expect(idx2.loadVectors()).toBe(true);
    expect(idx2.hasVectors).toBe(true);
    const hits = await idx2.searchHybrid("태양광 테스트", 1);
    expect(hits.length).toBeGreaterThan(0);
  });

  it("getEmbedder 싱글톤 교체 가능 (OpenAI/Xenova 슬롯)", () => {
    const emb = getEmbedder();
    expect(emb.dim).toBe(128);
    expect(emb.embed("test").length).toBe(128);
  });
});
