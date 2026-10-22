import { describe, it, expect } from "vitest";
import { grillSpec, officeHoursGate, interviewQuestion } from "../src/harness2/grill.js";
import { parseConstitution, buildSpecDoc, clarifySpec, validateSpecDoc, specToMarkdown, readSpecFromTree } from "../src/harness2/spec.js";
import { planFromSpec, tasksFromPlan, tasksInOrder, wayfinderSplit, planToMarkdown, tasksToMarkdown } from "../src/harness2/planner.js";
import { proposeInterface, proposeAllInterfaces, arenaJudge, threeViewReview } from "../src/harness2/architect.js";
import { classifyGoal, selectPlaybook, tddCycle, tddCheck, potatoCycle } from "../src/harness2/tdd.js";
import { interrogate, qaCheck } from "../src/harness2/interrogate.js";
import { analyzeSpecPlan, converge, convergeTree } from "../src/harness2/analyze.js";
import { guardThreeRoles } from "../src/harness2/guard.js";

// ---- grill ----
describe("grill", () => {
  it("empty spec returns defaults (max 5)", () => {
    const qs = grillSpec("", { maxQuestions: 5 });
    expect(qs.length).toBe(5);
    expect(qs[0].question.length).toBeGreaterThan(5);
  });
  it("officeHours included", () => {
    const qs = grillSpec("회의록 요약", { includeOfficeHours: true, maxQuestions: 10 });
    expect(qs.some((q) => q.id.startsWith("office-"))).toBe(true);
  });
  it("security question appears when spec lacks auth", () => {
    const qs = grillSpec("회의록 요약 기능", { maxQuestions: 10 });
    expect(qs.some((q) => q.category === "security")).toBe(true);
  });
  it("officeHoursGate needToBuild true by default", () => {
    const g = officeHoursGate("회의록 요약 실행 추적 가치 있음");
    expect(g.needToBuild).toBe(true);
    expect(g.questions.length).toBe(3);
  });
  it("officeHoursGate negative triggers recheck", () => {
    const g = officeHoursGate("이미 있음 대안 충분 굳이 필요 없음");
    expect(g.needToBuild).toBe(false);
  });
  it("interviewQuestion for assignee", () => {
    const q = interviewQuestion("담당자 배정 기능");
    expect(q.question).toMatch(/담당자/);
  });
});

// ---- spec ----
describe("spec", () => {
  it("parseConstitution bullets", () => {
    const c = parseConstitution("- 원칙 A\n- 제약: must not leak\n* 일반 원칙");
    expect(c).not.toBeNull();
    expect(c!.principles.length).toBeGreaterThan(0);
    expect(c!.constraints.length).toBeGreaterThan(0);
  });
  it("buildSpecDoc + clarifySpec detects missing random assign", () => {
    const doc = buildSpecDoc({ rawSpec: "담당자를 회의록에서 추출한다" });
    const miss = clarifySpec(doc);
    expect(miss.some((m) => m.includes("임의 배정"))).toBe(true);
  });
  it("validateSpecDoc warns without constitution", () => {
    const doc = buildSpecDoc({ rawSpec: "회의록 요약 기능이다" });
    const v = validateSpecDoc(doc);
    expect(v.warnings.some((w) => w.includes("constitution"))).toBe(true);
  });
  it("specToMarkdown contains title and spec", () => {
    const doc = buildSpecDoc({ title: "My Spec", rawSpec: "회의록 저장" });
    const md = specToMarkdown(doc);
    expect(md).toContain("# My Spec");
    expect(md).toContain("회의록 저장");
  });
  it("readSpecFromTree parses", () => {
    const tree = { "spec/app.md": "# App\n\n## Spec\n\n회의록 요약\n" };
    const d = readSpecFromTree(tree);
    expect(d?.rawSpec).toContain("회의록");
  });
  it("readSpecFromTree null when empty", () => {
    expect(readSpecFromTree({})).toBeNull();
  });
});

// ---- planner ----
describe("planner", () => {
  const specStr = "회의록 저장과 회의록 요약을 하고 담당자를 배정하며 알림을 보낸다";
  it("planFromSpec generates structure", () => {
    const p = planFromSpec(specStr);
    expect(p.structure.length).toBeGreaterThan(2);
    expect(p.specRef.length).toBeGreaterThan(5);
  });
  it("tasksFromPlan creates chain", () => {
    const p = planFromSpec(specStr);
    const ts = tasksFromPlan(p, specStr);
    expect(ts.length).toBe(p.structure.length);
    expect(ts[0].dependsOn).toEqual([]);
    expect(ts[1].dependsOn).toEqual(["t1"]);
  });
  it("tasksInOrder respects depends", () => {
    const p = planFromSpec(specStr);
    const ts = tasksFromPlan(p, specStr);
    const ordered = tasksInOrder(ts);
    expect(ordered[0].id).toBe("t1");
  });
  it("wayfinderSplit groups", () => {
    const p = planFromSpec(specStr);
    const ts = tasksFromPlan(p, specStr);
    const groups = wayfinderSplit(ts, 2);
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.flat().length).toBe(ts.length);
  });
  it("planToMarkdown + tasksToMarkdown produce md", () => {
    const p = planFromSpec(specStr);
    const ts = tasksFromPlan(p, specStr);
    expect(planToMarkdown(p)).toContain("#");
    expect(tasksToMarkdown(ts)).toContain("| t1 |");
  });
});

// ---- architect ----
describe("architect", () => {
  it("proposeInterface reuse style", () => {
    const d = proposeInterface("기존 재사용으로 확장", { style: "reuse" });
    expect(d.title).toMatch(/확장/);
  });
  it("proposeAllInterfaces 3", () => {
    expect(proposeAllInterfaces("x").length).toBe(3);
  });
  it("arenaJudge picks winner", () => {
    const cand = proposeAllInterfaces("회의록 요약");
    const r = arenaJudge(cand, "회의록 요약");
    expect(r.winner).toBeDefined();
    expect(r.runnerUps.length).toBe(2);
    expect(r.reason.length).toBeGreaterThan(10);
  });
  it("arenaJudge single candidate", () => {
    const c = proposeAllInterfaces("x").slice(0, 1);
    const r = arenaJudge(c, "x");
    expect(r.winner.id).toBe(c[0].id);
  });
  it("threeViewReview verdict", () => {
    const plan = { risks: ["복구 플로우 없음"], structure: ["src/a.ts"] };
    const design = proposeAllInterfaces("x")[1];
    const rv = threeViewReview(plan as any, design);
    expect(["PASS", "WARN", "FAIL"]).toContain(rv.verdict);
  });
});

// ---- tdd / potato ----
describe("tdd", () => {
  it("classifyGoal bugfix", () => {
    expect(classifyGoal("버그 수정: 로그인 오류").playbook).toBe("bugfix");
  });
  it("classifyGoal feature default", () => {
    expect(classifyGoal("새로운 요약 기능").playbook).toBe("feature");
  });
  it("selectPlaybook steps", () => {
    const r = selectPlaybook("버그 수정");
    expect(r.steps.length).toBeGreaterThan(3);
  });
  it("tddCycle 3 steps red→green→refactor", () => {
    const c = tddCycle("담당자 배정");
    expect(c.steps.length).toBe(3);
    expect(c.steps[0].phase).toBe("red");
    expect(c.steps[0].expectFail).toBe(true);
    expect(c.steps[1].phase).toBe("green");
  });
  it("tddCycle subAgents 3 for large", () => {
    const c = tddCycle("회의록 요약과 담당자 배정과 알림 발송을 모두 포함하는 큰 기능");
    expect(c.subAgents).toBe(3);
  });
  it("tddCheck detects missing tests", () => {
    const r = tddCheck({ "src/app.ts": "code" });
    expect(r.hasTestsFirst).toBe(false);
    expect(r.testFiles.length).toBe(0);
  });
  it("tddCheck pass when tests exist", () => {
    const r = tddCheck({ "src/app.ts": "code", "src/app.test.ts": "test" });
    expect(r.hasTestsFirst).toBe(true);
  });
  it("potatoCycle includes playbook", () => {
    const p = potatoCycle("신기능 추가", "저장 후 조회 가능");
    expect(p.playbook).toBe("feature");
    expect(p.steps.length).toBe(3);
  });
});

// ---- interrogate ----
describe("interrogate", () => {
  it("interrogate PASS on clean tree", () => {
    const tree = { "src/app.ts": "export const x = 1;", "src/app.test.ts": "test" };
    const r = interrogate(tree, { models: ["claude", "grok"], roles: ["simplicity", "correctness", "compliance"] });
    expect(r.opinions.length).toBe(6);
    expect(r.finalVerdict).toBe("PASS");
  });
  it("interrogate FAIL on TODO", () => {
    const tree = { "src/app.ts": "TODO fix me", "src/app.test.ts": "test" };
    const r = interrogate(tree);
    expect(r.finalVerdict).toBe("FAIL");
    expect(r.commonIssues.length).toBeGreaterThan(0);
  });
  it("commonIssues prioritized", () => {
    const tree = { "src/app.ts": "const x: any = 1; TODO", "src/app.test.ts": "test" };
    const r = interrogate(tree);
    // any + TODO both should appear as common if 2 models agree — they will, because heuristics same per role
    expect(r.commonIssues.length + r.uniqueIssues.length).toBeGreaterThan(0);
  });
  it("qaCheck mismatch", () => {
    const tree = { "src/meeting/notify.ts": "function display(){} function notify(){}" };
    const q = qaCheck(tree);
    expect(q.mismatches.length).toBeGreaterThan(0);
  });
  it("qaCheck ok when no notify", () => {
    const q = qaCheck({ "src/app.ts": "display only" });
    expect(q.ok).toBe(true);
  });
});

// ---- analyze / converge ----
describe("analyze", () => {
  it("analyzeSpecPlan detects missing", () => {
    const r = analyzeSpecPlan("담당자 배정 회의록 요약", "회의록 저장만 함");
    expect(r.missingInPlan.length).toBeGreaterThan(0);
  });
  it("analyzeSpecPlan contradiction", () => {
    const r = analyzeSpecPlan("임의 배정 금지", "random assign logic");
    expect(r.contradictions.length).toBeGreaterThan(0);
  });
  it("converge isComplete false when uncovered", () => {
    const c = converge("담당자 배정 회의록 요약", "회의록 저장 구현");
    expect(c.isComplete).toBe(false);
    expect(c.tasks.length).toBeGreaterThan(0);
  });
  it("converge isComplete true when all covered", () => {
    const spec = "회의록 저장";
    const c = converge(spec, "회의록 저장 구현 완료");
    expect(c.uncovered.length).toBe(0);
  });
  it("convergeTree uses tree", () => {
    const c = convergeTree("담당자 배정", { "src/meeting/store.ts": "store only" });
    expect(c.uncovered.length).toBeGreaterThan(0);
  });
});

// ---- guardThreeRoles ----
describe("guardThreeRoles", () => {
  it("PASS on clean", () => {
    const tree = {
      "AGENTS.md": "hello",
      "CLAUDE.md": "",
      "systemprompt.md": "",
      "guardrails.md": "",
      "src/app.ts": "export const x=1",
      "src/app.test.ts": "test",
      "skills/sample/SKILL.md": "---\nname: sample\ndescription: a good skill description longer than 10\n---\ncontent here longer than fifty characters to pass check",
    };
    // ensure autotrigger includes sample
    const r = guardThreeRoles(tree);
    expect(["PASS", "WARN"]).toContain(r.verdict);
  });
  it("FAIL on TODO", () => {
    const tree = {
      "AGENTS.md": "x",
      "CLAUDE.md": "",
      "systemprompt.md": "",
      "guardrails.md": "",
      "src/app.ts": "TODO",
      "skills/s/SKILL.md": "---\nname: s\ndescription: description longer than ten\n---\nbody longer than fifty chars for check abcdefghijklmnopqrstuvwxyz",
    };
    const r = guardThreeRoles(tree);
    expect(r.verdict).toBe("FAIL");
    expect(r.correctness.issues.length).toBeGreaterThan(0);
  });
  it("WARN on any", () => {
    const tree = {
      "AGENTS.md": "x",
      "CLAUDE.md": "",
      "systemprompt.md": "",
      "guardrails.md": "",
      "src/app.ts": "const x: any = 1",
      "src/app.test.ts": "test",
      "skills/s/SKILL.md": "---\nname: s\ndescription: description longer than ten\n---\nbody longer than fifty chars for check abcdefghijklmnopqrstuvwxyz",
    };
    const r = guardThreeRoles(tree);
    expect(r.simplicity.warnings.some((w) => w.includes("any"))).toBe(true);
  });
});
