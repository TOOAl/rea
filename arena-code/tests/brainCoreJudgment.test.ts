import { describe, expect, it } from "vitest";
import { judgeAtomicClaim, type AtomicClaim, type ClaimEvidence } from "../src/brainCore/index.js";

const claim: AtomicClaim = {
  subject: "물",
  predicate: "끓는 온도는",
  object: "100°C",
  polarity: "positive",
  scope: "표준 대기압",
  timeScope: "현재 실험",
};

function evidence(id: string, polarity: AtomicClaim["polarity"]): ClaimEvidence {
  return {
    id,
    sourceId: `source-${id}`,
    informationNeedId: "need-1",
    collectionStepId: "collect-1",
    claim: { ...claim, polarity },
  };
}

describe("atomic claim comparison", () => {
  it("marks matching structured claims as supported", () => {
    const result = judgeAtomicClaim(claim, [evidence("e1", "positive")]);
    expect(result.status).toBe("supported");
    expect(result.supportingEvidenceIds).toEqual(["e1"]);
  });

  it("marks opposite polarity with otherwise matching fields as contradictory", () => {
    const result = judgeAtomicClaim(claim, [evidence("e2", "negative")]);
    expect(result.status).toBe("refuted");
    expect(result.contradictingEvidenceIds).toEqual(["e2"]);
  });

  it("preserves mixed support and contradiction as contested", () => {
    const result = judgeAtomicClaim(claim, [
      evidence("e1", "positive"),
      evidence("e2", "negative"),
    ]);
    expect(result.status).toBe("contested");
    expect(result.supportingEvidenceIds).toEqual(["e1"]);
    expect(result.contradictingEvidenceIds).toEqual(["e2"]);
  });

  it("does not compare different scopes as direct support", () => {
    const result = judgeAtomicClaim(claim, [
      { ...evidence("e3", "positive"), claim: { ...claim, scope: "다른 압력" } },
    ]);
    expect(result.status).toBe("insufficient");
    expect(result.assessments[0]?.reason).toBe("scope-mismatch");
  });
});
