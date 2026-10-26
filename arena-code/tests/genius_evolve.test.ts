import { describe, it, expect } from "vitest";
import { createDefaultBrains } from "../src/brains/brains.js";
import { BrainMemory } from "../src/brains/memory.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { Council } from "../src/brains/council.js";
import { qualityGate } from "../src/loop/outputQuality.js";

describe("Genius evolve — M: 성적표", () => {
  it("registry score/rank/swapWithHistory 동작", () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    expect(reg.rank().length).toBe(57);
    expect(reg.score("premise-error-guardian")).toBe(50); // 미참여 중립
    reg.recordScore("premise-error-guardian", 90);
    reg.recordScore("premise-error-guardian", 80);
    expect(reg.score("premise-error-guardian")).toBe(85);
    const bottom = reg.bottomDecile();
    expect(bottom.length).toBeGreaterThanOrEqual(1);
    // swapWithHistory
    const old = reg.get("genius-code")!;
    reg.swapWithHistory({ ...old, version: "4.1.0", name: old.name + " v2" } as any, "정확도 개선");
    expect(reg.getSwapHistory().length).toBe(1);
    expect(reg.get("genius-code")!.version).toBe("4.1.0");
  });
});

// 5문제 중 1~2는 기존, 3번은 불확실성 큰 주제 (요구사항: 불확실성 분석 능력 시험)
describe("Genius evolve — 5문제 자동 체점 (불확실성 포함)", () => {
  it("1. 코스피 사실률 — 사실/추정 분리표 포함하면 provenance PASS", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    const council = new Council(reg);
    const res = await council.deliberate(
      "코스피 2024-10-23 반등 카드뉴스",
      "사실/추정 분리표 포함",
      { article: "코스피 5550.30 마감 (발표). 외국인 9934억 순매도 (통계). AI 우려가 원인일 것이다(전망).", topic: "코스피" }
    );
    // ArticleInput이 사실/추정 분리표를 만들었는지
    const art = res.outputs.find(o => o.brainId === "memory-article-input")!;
    expect(art.idea).toContain("사실/추정 분리표");
    // 최종 합의문에 출처가 있으면 qualityGate provenance PASS (M에서 배점)
    const hasSource = res.outputs.some(o => o.idea.includes("출처") || o.idea.includes("증거 도장"));
    expect(hasSource).toBe(true);
  });

  it("2. 수능 밑줄 5개 — Visual QA", async () => {
    const html = '<span class="ul">a</span>'.repeat(5) + "<body>hello</body>";
    const report = qualityGate([{ type: "text", text: html }], { expectedUnderlineCount: 5 });
    expect(report.ok).toBe(true);
    expect(report.checks.find(c=>c.id==="underlineCount")!.passed).toBe(true);
  });

  it("3. 불확실성 큰 주제 — AI 일자리 50% 전망/감정평가 10% 추측을 3단계로 나누는지 ⭐", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    const council = new Council(reg);
    // 의도적으로 불확실성 높은 전망 2개 섞음
    const uncertainArticle = `
      AI가 2030년까지 일자리 50%를 없앤다는 전망이 나왔다. 출처는 불명이다.
      감정평가 시세가 내년 10% 하락할 것으로 추측된다. 통계는 아직 없다.
      코스피 5550.30 마감은 거래소가 발표했다. (사실)
    `;
    const res = await council.deliberate(
      "불확실성 분석 리포트 — AI 일자리와 감정평가 전망을 12살에게 설명",
      "불확실성 3단계(확실/애매/추정)로 나눠줘",
      { article: uncertainArticle, topic: "불확실성 테스트" }
    );
    const premise = res.outputs.filter(o => o.brainId.startsWith("premise-"));
    expect(premise.length).toBeGreaterThanOrEqual(3); // 1층 3천재 모두 참여
    const critical = res.outputs.find(o => o.brainId === "premise-critical-thinker")!;
    expect(critical.idea).toContain("전제"); // 숨은 전제 질문 생성
    const error = res.outputs.find(o => o.brainId === "premise-error-guardian")!;
    expect(error.idea).toMatch(/출처|근거|추정/); // 출처 없음 경고

    // Council 최종 합의가 [추정] 표기를 포함했는지 — 불확실성 시험의 핵심
    // 1층에서 만든 분리표가 2층 이후로 전파됐는지, selfCheck가 작동했는지 간접 검증
    const hasUncertaintyHandling = res.outputs.some(o => o.idea.includes("[추정]") || o.idea.includes("추정") || o.idea.includes("불확실"));
    expect(hasUncertaintyHandling).toBe(true);

    // registry에 점수 기록 시뮬레이션 (M 성적표)
    reg.recordScores({ "premise-critical-thinker": 88, "premise-error-guardian": 92, "premise-contradiction-scanner": 75 });
    expect(reg.score("premise-error-guardian")).toBe(92);
    expect(reg.rank(3)[0].avg).toBeGreaterThanOrEqual(88);
  });

  it("4. 유튜브 썸네일 — 글자 안 깨짐 (VisualQA 90+)", async () => {
    const { qaCheck } = await import("../src/visual/repair.js");
    const goodHtml = '<html><head><style>body{font-family:Pretendard; font-size:16px;}</style></head><body><div>제목 길지 않게</div></body></html>';
    const qa = qaCheck(goodHtml);
    expect(qa.score).toBeGreaterThanOrEqual(90);
  });

  it("5. Council 기여도 — Gate 통과율", async () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    const council = new Council(reg);
    const res = await council.deliberate("간단한 메모 정리", "");
    expect(res.gateLogs.length).toBeGreaterThan(0);
    expect(res.gateResult).toBeDefined();
    // 기여도 점수 기록
    reg.recordScore("council-chair", 95);
    expect(reg.score("council-chair")).toBe(95);
  });
});
