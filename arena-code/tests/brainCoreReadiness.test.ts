import { describe, expect, it } from "vitest";
import {
  inspectJudgmentReadiness,
  judgeAtomicClaimWhenReady,
  type AtomicClaim,
  type ClaimEvidence,
} from "../src/brainCore/index.js";

const claim: AtomicClaim = {
  subject: "물",
  predicate: "끓는 온도는",
  object: "100°C",
  polarity: "positive",
  scope: "표준 대기압",
  timeScope: "현재 실험",
};
const evidence: ClaimEvidence = {
  id: "E1",
  sourceId: "lab-record",
  informationNeedId: "need-1",
  collectionStepId: "collect-1",
  claim,
};

describe("claim and evidence readiness", () => {
  it("accepts complete, source-linked structured evidence", () => {
    expect(inspectJudgmentReadiness(claim, [evidence]).status).toBe("ready");
  });

  it("requests a missing claim field", () => {
    const result = inspectJudgmentReadiness({ ...claim, scope: " " }, [evidence]);
    expect(result.status).toBe("needs-information");
    expect(result.findings.some(({ path }) => path === "claim.scope")).toBe(true);
  });

  it("rejects sparse evidence arrays instead of silently skipping entries", () => {
    const sparse: ClaimEvidence[] = [];
    sparse.length = 1;
    const result = inspectJudgmentReadiness(claim, sparse);
    expect(result.status).toBe("invalid");
    expect(result.findings.some(({ path }) => path === "evidence[0]")).toBe(true);
  });

  it("rejects duplicate evidence IDs", () => {
    const result = inspectJudgmentReadiness(claim, [evidence, evidence]);
    expect(result.status).toBe("invalid");
    expect(result.findings.some(({ code }) => code === "duplicate-id")).toBe(true);
  });

  it("does not judge when evidence is absent", () => {
    const result = judgeAtomicClaimWhenReady(claim, []);
    expect(result.status).toBe("needs-information");
    expect(result.status).not.toBe("judged");
  });

  it("judges only after input validation succeeds", () => {
    const result = judgeAtomicClaimWhenReady(claim, [evidence]);
    expect(result.status).toBe("judged");
    if (result.status === "judged") expect(result.judgment.status).toBe("supported");
  });
});
