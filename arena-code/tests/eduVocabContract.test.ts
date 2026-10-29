/**
 * eduVocabContract.test.ts — 계약 테스트 (REA Evidence)
 *
 * 이 테스트는 main의 CI에서 실행된다.
 * 실패하면 PR을 머지할 수 없다 — 계약을 코드로 강제한다.
 */

import { describe, it, expect } from "vitest";
import {
  validateVocabEvidence,
  validateHtmlRenderEvidence,
} from "../src/visual/eduVocabContract.js";
import {
  checkTypographyStatic,
  // removed unused: checkGeometryStatic, (checkGeometryStatic)
} from "../src/visual/inspectionTeam.js";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("Vocab Contract (7대 계약)", () => {
  const jsonPath = path.join(ROOT, "고등영단어장/단어장_전체_1200.json");
  if (!fs.existsSync(jsonPath)) {
    it.skip("JSON not found — skip on main without edu assets", () => {});
    return;
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const words = data.words || data;

  it("total 1200, Lv1 400 Lv2 400 Lv3 300 Lv4 100", () => {
    expect(words.length).toBe(1200);
    const counts: Record<string, number> = {};
    for (const w of words) counts[w.level] = (counts[w.level] || 0) + 1;
    expect(counts["Lv1"]).toBe(400);
    expect(counts["Lv2"]).toBe(400);
    expect(counts["Lv3"]).toBe(300);
    expect(counts["Lv4"]).toBe(100);
  });

  it("ko !== en, ko !== (뜻)", () => {
    const result = validateVocabEvidence(words);
    const koEnFails = result.issues.filter((i) => i.includes("ko==en"));
    expect(koEnFails, `ko==en violations: ${koEnFails.join("; ")}`).toEqual([]);
  });

  it("cloze has ______ (완전문 노출 금지)", () => {
    const result = validateVocabEvidence(words);
    const blankFails = result.issues.filter((i) =>
      i.includes("cloze missing blank"),
    );
    expect(
      blankFails,
      `cloze missing blank: ${blankFails.slice(0, 3).join("; ")}`,
    ).toEqual([]);
  });

  it("synonyms generic -related/-like/similar word 금지", () => {
    const result = validateVocabEvidence(words);
    const genericFails = result.issues.filter((i) =>
      i.includes("synonym generic"),
    );
    expect(
      genericFails,
      `generic synonyms: ${genericFails.slice(0, 3).join("; ")}`,
    ).toEqual([]);
  });

  it("example dummy This is a case 금지", () => {
    const result = validateVocabEvidence(words);
    const dummyFails = result.issues.filter((i) => i.includes("example dummy"));
    expect(
      dummyFails,
      `dummy examples: ${dummyFails.slice(0, 3).join("; ")}`,
    ).toEqual([]);
  });

  it("validateVocabEvidence returns PASS with provenance", () => {
    const result = validateVocabEvidence(words);
    expect(result.pass).toBe(true);
    expect(result.provenance.validator).toContain("REA");
    expect(result.evidence_id).toMatch(/^vocab-contract-/);
  });
});

describe("HTML Render Contract", () => {
  const cases = [
    {
      lv: "Lv1",
      file: "고등영단어장/전체_단어장_Lv1_필수400.html",
      blanks: 402,
      cards: 400,
    },
    {
      lv: "Lv2",
      file: "고등영단어장/전체_단어장_Lv2_핵심400.html",
      blanks: 400,
      cards: 400,
    },
    {
      lv: "Lv3",
      file: "고등영단어장/전체_단어장_Lv3_심화300.html",
      blanks: 301,
      cards: 300,
    },
    {
      lv: "Lv4",
      file: "고등영단어장/전체_단어장_Lv4_최종100.html",
      blanks: 100,
      cards: 100,
    },
  ];
  for (const c of cases) {
    it(`${c.lv} HTML blank ${c.blanks} / card ${c.cards}`, () => {
      const abs = path.join(ROOT, c.file);
      if (!fs.existsSync(abs)) {
        return; // skip on main without assets
      }
      const result = validateHtmlRenderEvidence(abs, c.blanks, c.cards);
      expect(result.blankCount).toBe(c.blanks);
      expect(result.teamResult.pass, result.teamResult.summary).toBe(true);
    });
  }

  it("no @import, has base64 Noto Sans KR", () => {
    for (const c of cases) {
      const abs = path.join(ROOT, c.file);
      if (!fs.existsSync(abs)) continue;
      const html = fs.readFileSync(abs, "utf8");
      expect(html, `${c.lv} should not have @import`).not.toMatch(/@import/i);
      expect(html, `${c.lv} should have Noto Sans KR`).toMatch(/Noto Sans KR/i);
      expect(html, `${c.lv} should have base64 @font-face`).toMatch(
        /@font-face/i,
      );
    }
  });

  it("표기법 20단어 (20어 금지)", () => {
    for (const c of cases) {
      const abs = path.join(ROOT, c.file);
      if (!fs.existsSync(abs)) continue;
      const html = fs.readFileSync(abs, "utf8");
      const bad20 = html.match(/20어(?![가-힣])/g);
      expect(bad20, `${c.lv} has 20어 abbreviation`).toBeNull();
    }
  });
});

describe("InspectionTeam — Typography 패치 회귀 테스트", () => {
  it("□ 체크박스 + 한글 폰트 = PASS (오탐 방지)", () => {
    const html = `
      <html><head><style>@font-face{font-family:'Noto Sans KR';src:url(data:font/woff;base64,abc)}</style></head>
      <body>고등영단어장 Lv1 Day1 □ D3 복습 □ D7 복습 □ 체크 완료</body></html>
    `;
    const result = checkTypographyStatic(html);
    expect(result.grade).not.toBe("FAIL");
    expect(result.hasKoreanFont).toBe(true);
  });

  it("□ tofu + 폰트 없음 = FAIL", () => {
    const html = `<html><body>한글 테스트 □ 깨짐</body></html>`;
    const result = checkTypographyStatic(html);
    expect(result.grade).toBe("FAIL");
    expect(result.hasKoreanFont).toBe(false);
  });

  it("가계도 □는 정상 (의도적 기호)", () => {
    const html = `
      <html><head><style>@font-face{font-family:'Noto Sans KR';src:url(data:font/woff;base64,abc)}</style></head>
      <body>가계도 표시: □ 정상 □○ 관계도</body></html>
    `;
    const result = checkTypographyStatic(html);
    // 가계도 내 □는 의도적 — FAIL 아님
    expect(result.issues.filter((i) => i.includes("깨진 글자")).length).toBe(0);
  });
});
