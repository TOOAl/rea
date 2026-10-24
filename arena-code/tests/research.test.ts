import { describe, it, expect } from "vitest";
import { research, decomposeQuery } from "../src/loop/research.js";
import { buildRegistry } from "../src/tools/index.js";
import { RagIndex } from "../src/rag/index.js";

describe("Research Loop — decomposeQuery", () => {
  it("한글 질의는 원인/비교 확장", () => {
    const qs = decomposeQuery("코스피 반등 원인");
    expect(qs.length).toBeGreaterThanOrEqual(1);
    expect(qs[0]).toContain("코스피");
  });
  it("영문 질의 확장", () => {
    const qs = decomposeQuery("ghidra p-code");
    expect(qs.some(q => q.includes("cause") || q.includes("p-code"))).toBe(true);
  });
});

describe("Research Loop — research() API-free", () => {
  it("로컬 문서로 research 전체 파이프라인 (WebSearch→fetch→표→출처)", async () => {
    const report = await research("BASE_CAPABILITY_IMPROVEMENT 문맥 의도 품질", { count: 3, fetchCount: 2, cwd: process.cwd() });
    expect(report.query).toContain("BASE_CAPABILITY_IMPROVEMENT");
    expect(report.hits.length).toBeGreaterThan(0);
    expect(report.comparisonTable).toContain("|");
    expect(report.sourcesBlock).toContain("출처");
    expect(report.summary).toContain("요약");
    // local file이면 Read로 전문 확보 — file:// 경로는 Read로 읽힘
    const hasContent = report.hits.some(h => h.content && h.content.length > 50);
    // 비교표는 스니펫이라도 있어야 함 (content 없으면 search snippet으로 fallback)
    expect(hasContent || report.comparisonTable.includes("BASE_CAPABILITY")).toBe(true);
    expect(report.sourcesBlock).toContain("file://");
  });

  it("nonsense query도 fail-open으로 결과 반환 (낮은 점수라도 표 생성)", async () => {
    const report = await research("qwerty_no_match_12345_xyz", { count: 3, fetchCount: 2, cwd: process.cwd() });
    // TF-IDF는 nonsense에도 낮은 점수로 hits 반환할 수 있음 — 중요한 건 죽지 않고 표/출처가 생성된다는 것
    expect(report.comparisonTable.length).toBeGreaterThan(0);
    expect(report.sourcesBlock).toContain("출처");
    expect(report.summary).toContain("요약");
  });
});

describe("Research Tool — Registry", () => {
  it("Research가 CORE_TOOLS에 등록됨", () => {
    const reg = buildRegistry();
    expect(reg.has("Research")).toBe(true);
    expect(reg.has("WebSearch")).toBe(true);
    const tool = reg.get("Research")!;
    expect(tool.description).toMatch(/고정 연구 루프|Research/);
  });
});

describe("RagIndex.fromWorkspace — 자동 색인", () => {
  it(".memory-bank + harness2/library + docs 자동 색인 (API 0)", async () => {
    const idx = await RagIndex.fromWorkspace(process.cwd(), { domain: "test-workspace" });
    // 최소 docs는 있음
    expect(idx.size).toBeGreaterThan(0);
    const hits = idx.search("BASE_CAPABILITY_IMPROVEMENT", 2);
    expect(hits.length).toBeGreaterThan(0);
  });
});
