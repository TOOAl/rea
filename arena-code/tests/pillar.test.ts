import { describe, expect, it } from "vitest";
import { classifyIntent, isIntentClear } from "../src/loop/intent.js";
import { EvidenceLedger } from "../src/loop/evidenceLedger.js";
import { qualityGate } from "../src/loop/outputQuality.js";

describe("Pillar 1: EvidenceLedger - 문맥 파악", () => {
  it("truncated 플래그 보존", () => {
    const l = new EvidenceLedger();
    l.fromToolResult("Read", { file: "a.txt" }, "x".repeat(6000), { maxLen: 5000 });
    const e = l.list()[0];
    expect(e.truncated).toBe(true);
    expect(e.confidence).toBe(0.8);
    expect(l.summarizeForPrompt()).toContain("TRUNCATED");
  });
  it("summarize 보존 — 관찰/출처 구분", () => {
    const l = new EvidenceLedger();
    l.add({ kind: "observation", source: "UserAttach(image-1.png)", content: "what leaders pay...", confidence: 0.9 });
    expect(l.summarizeForPrompt()).toContain("observation");
  });
});

describe("Pillar 2: Intent Analyzer - 의도 파악", () => {
  it("DaVinci Resolve 요청은 generation으로 분류", () => {
    const intent = classifyIntent([{ role: "user", content: "DaVinci Resolve 21.3.7로 편집 가이드 만들어줘" }]);
    expect(intent.kind).toBe("generation");
    expect(intent.confidence).toBeGreaterThan(0.5);
  });
  it("밑줄 어법 문항은 question으로 분류, ambiguities 없음", () => {
    const intent = classifyIntent([{ role: "user", content: "29 다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?" }]);
    expect(intent.kind).toBe("question");
  });
  it("짧고 모호한 프롬프트는 confidence 낮음", () => {
    const intent = classifyIntent([{ role: "user", content: "해줘" }]);
    expect(intent.confidence).toBeLessThan(0.5);
    expect(isIntentClear(intent)).toBe(false);
  });
});

describe("Pillar 3: OutputQualityGate - 고품질 결과물", () => {
  it("밑줄 누락 FAIL", () => {
    const report = qualityGate([{ type: "text", text: "밑줄 없이 그냥 텍스트" }], { expectedUnderlineCount: 5 });
    expect(report.ok).toBe(false);
    expect(report.issues.join()).toContain("밑줄");
  });
  it("정답 누출 FAIL (첫 800자에 정답 있으면)", () => {
    const report = qualityGate([{ type: "text", text: "정답: ③ 입니다. 본문은... <span class=\"ul\">a</span><span class=\"ul\">b</span><span class=\"ul\">c</span><span class=\"ul\">d</span><span class=\"ul\">e</span>" }], { expectedUnderlineCount: 5 });
    expect(report.ok).toBe(false);
    expect(report.checks.find(c => c.id === "answerLeak")?.passed).toBe(false);
  });
  it("정상 출력 PASS", () => {
    const html = `<span class="ul">a</span><span class="ul">b</span><span class="ul">c</span><span class="ul">d</span><span class="ul">e</span><p>본문</p>`;
    // 정답은 뒤에
    const filler = "x".repeat(900);
    const report = qualityGate([{ type: "text", text: html + filler + "정답: ③" }], { expectedUnderlineCount: 5 });
    expect(report.ok).toBe(true);
  });
});
