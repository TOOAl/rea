import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryBank } from "../src/memory/bank.js";
import { coordForText, PALACE_LOCI, distance, vector, palaceWalkOrder, planPath, buildSpatialEdges, gridKeyForCoord } from "../src/memory/space.js";
import { BrainMemory } from "../src/brains/memory.js";
import { SpacePalaceBrain, SpaceNavigatorBrain, SpaceGrapherBrain } from "../src/brains/spaceGenius.js";
import { BrainRegistry } from "../src/brains/registry.js";
import { createDefaultBrains } from "../src/brains/brains.js";

describe("Space — coordForText 결정론 & Place/Grid", () => {
  it("same text → same coord (결정론)", () => {
    const a = coordForText("수학 공식 a^2+b^2=c^2");
    const b = coordForText("수학 공식 a^2+b^2=c^2");
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
    expect(a.locusId).toBe(b.locusId);
    expect(a.zone).toBe(b.zone);
  });
  it("different text → different coord", () => {
    const a = coordForText("수학 공식");
    const b = coordForText("역사 세종대왕");
    expect(a.x).not.toBe(b.x);
    expect(a.zone).not.toBe(b.zone); // math vs history
  });
  it("PALACE 25 loci", () => {
    expect(PALACE_LOCI.length).toBe(25);
    expect(PALACE_LOCI[0].label).toBe("현관-천장");
    expect(PALACE_LOCI[24].label).toBe("다락방-바닥");
  });
  it("zone inference", () => {
    expect(coordForText("삼각함수 미적분 정리").zone).toBe("math");
    expect(coordForText("조선 세종 자격루 발명").zone).toBe("history");
    expect(coordForText("배포 코드 함수 버그").zone).toBe("code");
    expect(coordForText("코스피 투자 수익").zone).toBe("economy");
  });
  it("gridKey coarse/fine", () => {
    const c = { x: 0.2, y: 0.3, z: 0.6 };
    const k = gridKeyForCoord(c, "math");
    expect(k).toContain("math|L1:");
    expect(k).toContain("/L2:");
  });
  it("distance symmetric", () => {
    const a = { x: 0.2, y: 0.3, z: 0.5 }, b = { x: 0.8, y: 0.7, z: 0.6 };
    expect(distance(a, b)).toBeCloseTo(distance(b, a), 5);
    expect(distance(a, a)).toBe(0);
  });
  it("vector heading 8방위", () => {
    const v = vector({ x: 0, y: 0, z: 0.5 }, { x: 1, y: 0, z: 0.5 });
    expect(v.heading).toContain("동");
    const v2 = vector({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0.9 });
    expect(v2.heading).toContain("북");
    expect(v2.heading).toContain("↑");
  });
});

describe("Space — MemoryBank 공간 확장", () => {
  it("addWithSpace → spaceMeta 포함 저장 & list 복원", () => {
    const root = mkdtempSync(join(tmpdir(), "bank-space-"));
    const bank = new MemoryBank({ root, domain: "test-space" });
    const { spaceMeta } = bank.addWithSpace({ id: "m1", cue: "세종 자격루", content: "장영실이 만든 물시계" });
    expect(spaceMeta.zone).toBeDefined();
    expect(spaceMeta.locusLabel).toContain("-");
    const one = bank.get("m1");
    expect(one?.spaceMeta?.x).toBeCloseTo(spaceMeta.x, 5);
    expect(one?.spaceMeta?.locusId).toBe(spaceMeta.locusId);
    // list도 복원
    const all = bank.list();
    expect(all[0].spaceMeta?.gridKey).toBeDefined();
    rmSync(root, { recursive: true, force: true });
  });
  it("palaceWalk locusId 오름차순", () => {
    const root = mkdtempSync(join(tmpdir(), "bank-walk-"));
    const bank = new MemoryBank({ root, domain: "walk" });
    // 5개 다양한 기억 저장
    for (const [i, txt] of ["수학 정리", "역사 이야기", "코드 함수", "과학 실험", "경제 투자"].entries()) {
      bank.addWithSpace({ id: `w${i}`, cue: txt, content: `내용 ${txt} ${i}` });
    }
    const walk = bank.palaceWalk();
    expect(walk.length).toBe(5);
    for (let i = 1; i < walk.length; i++) {
      expect(walk[i].spaceMeta!.locusId).toBeGreaterThanOrEqual(walk[i - 1].spaceMeta!.locusId);
    }
    rmSync(root, { recursive: true, force: true });
  });
  it("nearby 반경 필터", () => {
    const root = mkdtempSync(join(tmpdir(), "bank-near-"));
    const bank = new MemoryBank({ root, domain: "near" });
    const m1 = bank.addWithSpace({ id: "n1", cue: "수학 삼각형", content: "피타고라스" });
    bank.addWithSpace({ id: "n2", cue: "수학 원주율", content: "파이 3.14" });
    bank.addWithSpace({ id: "n3", cue: "역사 세종", content: "한글 창제" });
    // m1 근처: 같은 수학 zone이면 가까울 확률 높음
    const center = m1.spaceMeta;
    const near = bank.nearby(center, 0.5, 5);
    expect(near.length).toBeGreaterThanOrEqual(1);
    expect(near[0].id).toBe("n1");
    rmSync(root, { recursive: true, force: true });
  });
  it("byZone 분류", () => {
    const root = mkdtempSync(join(tmpdir(), "bank-zone-"));
    const bank = new MemoryBank({ root, domain: "zone" });
    bank.addWithSpace({ id: "z1", cue: "수학 공식", content: "x+y" });
    bank.addWithSpace({ id: "z2", cue: "역사 왕", content: "세종" });
    const math = bank.byZone("math");
    expect(math.length).toBeGreaterThanOrEqual(1);
    expect(math[0].spaceMeta!.zone).toBe("math");
    rmSync(root, { recursive: true, force: true });
  });
  it("searchNearby 질의→좌표→반경", () => {
    const root = mkdtempSync(join(tmpdir(), "bank-q-"));
    const bank = new MemoryBank({ root, domain: "q" });
    bank.addWithSpace({ id: "q1", cue: "수학 증명", content: "귀류법으로 증명" });
    bank.addWithSpace({ id: "q2", cue: "역사 전쟁", content: "임진왜란" });
    const hits = bank.searchNearby("수학 증명 귀류법", 0.5, 5);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    rmSync(root, { recursive: true, force: true });
  });
  it("spatialEdges near/adjacent", () => {
    const items = [
      { id: "a", spaceMeta: coordForText("수학 A", "t") },
      { id: "b", spaceMeta: coordForText("수학 B", "t") },
      { id: "c", spaceMeta: coordForText("역사 C", "t") },
    ];
    const edges = buildSpatialEdges(items);
    // edges는 거리순 정렬
    expect(Array.isArray(edges)).toBe(true);
    if (edges.length >= 2) expect(edges[0].distance).toBeLessThanOrEqual(edges[1].distance);
  });
  it("planPath A→B 직선 waypoint", () => {
    const items = [
      { id: "a", spaceMeta: { x: 0.1, y: 0.1, z: 0.5, locusId: 0, zone: "math", gridKey: "math|L1:0,0,1/L2:0,0,2", locusLabel: "현관-천장" } },
      { id: "mid", spaceMeta: { x: 0.5, y: 0.5, z: 0.5, locusId: 12, zone: "math", gridKey: "math|L1:2,2,1/L2:4,4,2", locusLabel: "서재-책상" } },
      { id: "b", spaceMeta: { x: 0.9, y: 0.9, z: 0.5, locusId: 24, zone: "math", gridKey: "math|L1:3,3,1/L2:7,7,2", locusLabel: "다락방-바닥" } },
    ];
    const plan = planPath(items as any, "a", "b");
    expect(plan).not.toBeNull();
    expect(plan!.steps[0].id).toBe("a");
    expect(plan!.steps.at(-1)!.id).toBe("b");
    expect(plan!.totalDist).toBeGreaterThan(0);
    expect(plan!.vectors.length).toBe(plan!.steps.length - 1);
  });
});

describe("Space — 3형제 Brains", () => {
  it("SpacePalaceBrain think 궁전 통계", async () => {
    const root = mkdtempSync(join(tmpdir(), "palace-brain-"));
    const mem = new BrainMemory();
    const brain = new SpacePalaceBrain(mem, root, "test-palace");
    const b = new MemoryBank({ root, domain: "test-palace" });
    b.addWithSpace({ id: "p1", cue: "수학 공식", content: "오일러 공식" });
    const out = await brain.think({ task: "기억궁전 확인", context: "", layer: 1, priorOutputs: [] });
    expect(out.idea).toContain("기억궁전");
    expect(out.idea).toContain("25 loci");
    expect(out.tags).toContain("palace");
    rmSync(root, { recursive: true, force: true });
  });
  it("SpaceNavigatorBrain 경로 시연", async () => {
    const root = mkdtempSync(join(tmpdir(), "nav-brain-"));
    const mem = new BrainMemory();
    const nav = new SpaceNavigatorBrain(mem, root, "test-nav");
    const bank = new MemoryBank({ root, domain: "test-nav" });
    bank.addWithSpace({ id: "n1", cue: "수학 정리", content: "A" });
    bank.addWithSpace({ id: "n2", cue: "역사 왕", content: "B" });
    const out = await nav.think({ task: "경로 탐색", context: "", layer: 1, priorOutputs: [] });
    expect(out.idea).toContain("항법사");
    expect(out.tags).toContain("grid-cell");
    rmSync(root, { recursive: true, force: true });
  });
  it("SpaceGrapherBrain 장면 그래프", async () => {
    const root = mkdtempSync(join(tmpdir(), "graph-brain-"));
    const mem = new BrainMemory();
    const g = new SpaceGrapherBrain(mem, root, "test-graph");
    const bank = new MemoryBank({ root, domain: "test-graph" });
    bank.addWithSpace({ id: "g1", cue: "세종은 자격루를 만들었다", content: "1442년 장영실" });
    const out = await g.think({ task: "장면 그래프 확인", context: "", layer: 1, priorOutputs: [] });
    expect(out.idea).toContain("장면 그래퍼");
    expect(out.tags).toContain("scene-graph");
    rmSync(root, { recursive: true, force: true });
  });
  it("3형제 모두 1층 등록, 68명 체제 유지", () => {
    const mem = new BrainMemory();
    const reg = new BrainRegistry();
    for (const b of createDefaultBrains(mem)) reg.register(b);
    expect(reg.all().length).toBe(68);
    expect(reg.get("space-palace")).toBeDefined();
    expect(reg.get("space-navigator")).toBeDefined();
    expect(reg.get("space-grapher")).toBeDefined();
    expect(reg.byLayer(1).length).toBe(18);
  });
});

describe("Space PR-2 — spatial hybrid + palace canvas", () => {
  it("searchHybrid 공간 가중 — 같은 zone이면 상위 랭크", () => {
    const root = mkdtempSync(join(tmpdir(), "spatial-hybrid-"));
    const bank = new MemoryBank({ root, domain: "hybrid" });
    // 두 기억: 텍스트 유사도 비슷한데 zone 다름
    bank.addWithSpace({ id: "s1", cue: "수학 정리 증명", content: "삼각함수 공식" });
    bank.addWithSpace({ id: "s2", cue: "역사 전쟁 기록", content: "삼각형 진법" }); // '삼각' 단어로 텍스트 유사도 유발
    // 질의: 수학 + 공간도 수학 근처
    const hitsWithSpace = bank.searchHybrid("수학 삼각함수 증명", 2, { spatialBoost: 0.18 });
    const hitsNoSpace = bank.searchHybrid("수학 삼각함수 증명", 2, { spatialBoost: 0 });
    // 공간 가중이 있으면 수학(s1)이 1위일 확률이 더 높거나 최소 점수 차이가 커짐
    expect(hitsWithSpace.length).toBe(2);
    expect(hitsWithSpace[0].id).toBe("s1"); // zone=math가 spatial boost로 1위
    expect(hitsNoSpace.length).toBe(2);
    rmSync(root, { recursive: true, force: true });
  });
  it("generatePalaceHtml 1080×760 + 25 loci + 한글", async () => {
    const { generatePalaceHtml } = await import("../src/visual/palace.js");
    const root = mkdtempSync(join(tmpdir(), "palace-html-"));
    const bank = new MemoryBank({ root, domain: "palace-vis" });
    bank.addWithSpace({ id: "v1", cue: "수학 공식", content: "오일러 e^iπ+1=0" });
    bank.addWithSpace({ id: "v2", cue: "세종 자격루", content: "장영실 물시계" });
    bank.addWithSpace({ id: "v3", cue: "코드 배포", content: "K8s 롤아웃" });
    const entries = bank.list();
    const html = generatePalaceHtml(entries, { title: "테스트 궁전" });
    expect(html).toContain("테스트 궁전");
    expect(html).toContain("<svg");
    expect(html).toContain("현관");
    expect(html).toContain("다락방");
    expect(html).toContain("수학 공식".slice(0, 4));
    // viewBox 검사 — Ghidra P-Code 패턴: SVG viewBox 1080×760
    expect(html).toContain('viewBox="0 0 1080 760"');
    // 한글 깨짐 없음 — Noto Sans KR 포함
    expect(html).toContain("Noto Sans KR");
    // 빈자리 표시 확인
    expect(html).toContain("빈 자리");
    rmSync(root, { recursive: true, force: true });
  });
  it("palace html 308 → 309? 전체 310 이상", async () => {
    const root = mkdtempSync(join(tmpdir(), "palace-count-"));
    const { generatePalaceHtml } = await import("../src/visual/palace.js");
    const bank = new MemoryBank({ root, domain: "cnt" });
    for (let i = 0; i < 5; i++) bank.addWithSpace({ id: `c${i}`, cue: `기억 ${i}`, content: `내용 ${i} 수학` });
    const html = generatePalaceHtml(bank.list());
    const locusDots = (html.match(/#\d+/g) || []).length;
    expect(locusDots).toBeGreaterThanOrEqual(25); // #0 … #24
    rmSync(root, { recursive: true, force: true });
  });
});
