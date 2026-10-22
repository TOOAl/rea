/**
 * Data Workbench — 6종 흡수 검증 (Polymer/Akkio/Rows/Formula Bot/Sheets Gemini/Excel Copilot) v2.16.0
 */
import { describe, it, expect } from "vitest";
import { suggestChartsInternal, DataVizTool } from "../src/tools/dataViz.js";
import { trainPredictorInternal, forecastInternal, chatExploreInternal, PredictTool } from "../src/tools/predict.js";
import { BATCH_LIMIT, SheetsTool } from "../src/tools/sheets.js";
import { nlToFormulaInternal, explainFormulaInternal, fixFormulaInternal, nlToSqlInternal, FormulaTool } from "../src/tools/formula.js";
import { buildRegistry } from "../src/tools/index.js";
import { SkillManager } from "../src/skills/index.js";

const csvSimple = `date,sales,region
2023-01-01,100,Seoul
2023-02-01,150,Seoul
2023-03-01,120,Busan`;
const csvCategory = `product,amount,status
A,100,Paid
B,200,Unpaid
A,150,Paid`;
const csvNumeric = `name,score,churn
alice,80,no
bob,20,yes
carol,90,no`;
const seriesNums = [10,12,15,13,16];

// ── DataViz (Polymer) ──
describe("DataViz — Polymer 흡수", () => {
  it("date+number → line 추천", () => {
    const { specs, colTypes } = suggestChartsInternal(csvSimple);
    expect(colTypes["date"]).toBe("date");
    expect(colTypes["sales"]).toBe("number");
    expect(specs.some(s=>s.type==="line")).toBe(true);
  });
  it("category+number → bar 추천", () => {
    const { specs } = suggestChartsInternal(csvCategory);
    expect(specs.some(s=>s.type==="bar")).toBe(true);
  });
  it("low-cardinality category → pie", () => {
    const csv = `region,sales
Seoul,100
Busan,200
Jeju,150`;
    const { specs } = suggestChartsInternal(csv);
    expect(specs.some(s=>s.type==="pie")).toBe(true);
  });
  it("2 numeric → scatter", () => {
    const csv = `a,b
1,10
2,20
3,15`;
    const { specs } = suggestChartsInternal(csv);
    expect(specs.some(s=>s.type==="scatter")).toBe(true);
  });
  it("empty → no specs", () => {
    const { specs } = suggestChartsInternal("");
    expect(specs.length).toBe(0);
  });
  it("DataViz tool execute suggest", async () => {
    const out = await DataVizTool.execute({ data: csvSimple }, { cwd: "/tmp" });
    expect(out).toContain("Columns:");
    expect(out).toContain("Suggestions");
  });
  it("DataViz render returns vega spec", async () => {
    const out = await DataVizTool.execute({ data: csvSimple, action: "render", spec_index: "0" }, { cwd: "/tmp" });
    const parsed = JSON.parse(out);
    expect(parsed.vega).toBeDefined();
    expect(parsed.spec).toBeDefined();
  });
});

// ── Predict (Akkio) ──
describe("Predict — Akkio 흡수", () => {
  it("train numeric target → accuracy + coeff", () => {
    const { model } = trainPredictorInternal(csvSimple, "sales");
    expect(model.kind).toBe("numeric");
    expect(model.accuracy).toBeGreaterThan(0.5);
    expect(model.coeff).toBeDefined();
  });
  it("train categorical target → classes", () => {
    const { model } = trainPredictorInternal(csvNumeric, "churn");
    expect(model.kind).toBe("categorical");
    expect(model.classes).toContain("yes");
  });
  it("train missing target → throw", () => {
    expect(()=> trainPredictorInternal(csvSimple, "nope")).toThrow();
  });
  it("forecast horizon 3", () => {
    const out = forecastInternal(seriesNums, 3);
    expect(out.length).toBe(3);
    expect(out.every(n=> typeof n==="number")).toBe(true);
  });
  it("forecast empty → zeros", () => {
    expect(forecastInternal([], 2)).toEqual([0,0]);
  });
  it("chatExplore top/sum", () => {
    const { answer } = chatExploreInternal(csvSimple, "top sales");
    expect(answer).toMatch(/Matched|Sum/i);
  });
  it("Predict tool train", async () => {
    const out = await PredictTool.execute({ data: csvNumeric, target: "churn", action: "train" }, { cwd: "/tmp" });
    expect(out).toContain("Model trained");
  });
  it("Predict tool forecast with series", async () => {
    const out = await PredictTool.execute({ data: csvSimple, action: "forecast", series: "10,12,15", horizon: "2" }, { cwd: "/tmp" });
    expect(out).toContain("Forecast");
  });
});

// ── Sheets (Rows + Google + Excel) ──
describe("Sheets — Rows/Google/Excel 흡수", () => {
  it("extract email", async () => {
    const csv = `name,contact
alice,alice@example.com
bob,bob@test.org`;
    const out = await SheetsTool.execute({ data: csv, operation: "extract", column: "contact", pattern: "email" }, { cwd: "/tmp" });
    expect(out).toContain("alice@example.com");
  });
  it("categorize", async () => {
    const csv = `feedback,score
good product,5
bad service,1`;
    const out = await SheetsTool.execute({ data: csv, operation: "categorize", column: "feedback", categories: "positive,negative" }, { cwd: "/tmp" });
    expect(out).toContain("positive");
  });
  it("sentiment", async () => {
    const csv = `review
I love this great product
I hate this bad thing`;
    const out = await SheetsTool.execute({ data: csv, operation: "sentiment", column: "review" }, { cwd: "/tmp" });
    expect(out).toContain("positive");
  });
  it("analyst header+5 rows only", async () => {
    const out = await SheetsTool.execute({ data: csvSimple, operation: "analyst", instruction: "trend analysis" }, { cwd: "/tmp" });
    expect(out).toContain("header+5 rows");
  });
  it("transform dedupe", async () => {
    const csv = `a,b
1,x
1,x
2,y`;
    const out = await SheetsTool.execute({ data: csv, operation: "transform", instruction: "중복 제거" }, { cwd: "/tmp" });
    expect(out).toContain("deduplicated");
  });
  it("agent mode plan", async () => {
    const out = await SheetsTool.execute({ data: csvSimple, operation: "agent", agent_goal: "대시보드 만들어줘" }, { cwd: "/tmp" });
    expect(out).toContain("Agent Mode plan");
  });
  it("BATCH_LIMIT is 350", () => {
    expect(BATCH_LIMIT).toBe(350);
  });
});

// ── Formula (Formula Bot + Sheets Gemini + Excel) ──
describe("Formula — Formula Bot/Sheets/Excel 흡수", () => {
  it("AVERAGEIF from Korean prompt", () => {
    const { formula } = nlToFormulaInternal("B열이 Paid면 A열 평균");
    expect(formula).toContain("AVERAGEIF");
  });
  it("SUMIF pattern", () => {
    const { formula } = nlToFormulaInternal("Sum A when B marketing");
    expect(formula).toContain("SUMIF");
  });
  it("XLOOKUP", () => {
    const { formula } = nlToFormulaInternal("xlookup for value");
    expect(formula).toContain("XLOOKUP");
  });
  it("explain SUMIF", () => {
    const exp = explainFormulaInternal("=SUMIF(B:B,\"Paid\",A:A)");
    expect(exp).toContain("조건");
  });
  it("fix DIV/0 → IFERROR", () => {
    const { fixed } = fixFormulaInternal("=A1/B1", "#DIV/0!");
    expect(fixed).toContain("IFERROR");
  });
  it("nlToSql", () => {
    const sql = nlToSqlInternal("show users where active", "postgres");
    expect(sql.toLowerCase()).toContain("select");
  });
  it("Formula tool generate", async () => {
    const out = await FormulaTool.execute({ prompt: "B열이 Paid면 A열 평균", action: "generate" }, { cwd: "/tmp" });
    expect(out).toContain("Formula:");
  });
  it("Formula tool explain", async () => {
    const out = await FormulaTool.execute({ prompt: "explain", action: "explain", formula: "=SUM(A1:A10)" }, { cwd: "/tmp" });
    expect(out.toLowerCase()).toContain("sum");
  });
  it("Formula tool fix", async () => {
    const out = await FormulaTool.execute({ prompt: "=A1/B1", action: "fix", formula: "=A1/B1", error: "#DIV/0!" }, { cwd: "/tmp" });
    expect(out).toContain("Fixed:");
  });
});

// ── Registry & Skill ──
describe("Data Workbench registry/skill", () => {
  it("buildRegistry includes 4 data tools", () => {
    const reg = buildRegistry();
    expect(reg.has("DataViz")).toBe(true);
    expect(reg.has("Predict")).toBe(true);
    expect(reg.has("Sheets")).toBe(true);
    expect(reg.has("Formula")).toBe(true);
  });
  it("skill data-workbench loaded", () => {
    const m = new SkillManager("/home/user/rea/arena-code");
    expect(m.has("data-workbench")).toBe(true);
    const s = m.get("data-workbench")!;
    expect(s.triggers).toContain("polymer");
  });
});
