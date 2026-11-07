import { describe, expect, it } from "vitest";
import {
  evaluateHypothesisSetAfterPreparation,
  type AtomicClaim,
  type ClaimEvidence,
  type PreparationPlan,
  type ToolExecutionPolicy,
} from "../src/brainCore/index.js";

const positiveClaim: AtomicClaim = {
  subject: "batch-41",
  predicate: "checksum status",
  object: "valid",
  polarity: "positive",
  scope: "ingest-region-east",
  timeScope: "2026-11-06T09:00Z",
};
const negativeClaim: AtomicClaim = { ...positiveClaim, polarity: "negative" };
const evidence: ClaimEvidence = {
  id: "evidence-1",
  sourceId: "synthetic-record-1",
  informationNeedId: "need-checksum",
  collectionStepId: "step-inspect",
  claim: positiveClaim,
};
const plan: PreparationPlan = {
  task: {
    question: "Which supplied candidate matches the records?",
    objective: "Compare finite caller-supplied alternatives only.",
    scope: "synthetic batch-checksum fixture",
    timeScope: "2026-11-06T09:00Z",
  },
  informationNeeds: [
    {
      id: "need-checksum",
      question: "Is there a checksum record for this batch?",
      purpose: "Compare each candidate with the same evidence.",
      required: true,
      expectedScope: "ingest-region-east",
      expectedTimeScope: "2026-11-06T09:00Z",
      acceptableEvidenceKinds: ["synthetic-record"],
    },
  ],
  collectionPlan: {
    steps: [
      {
        id: "step-inspect",
        informationNeedIds: ["need-checksum"],
        sourceTypes: ["caller-provided fixture"],
        method: "Read the supplied structured record.",
        expectedOutput: "Structured claim fields.",
        acceptanceChecks: ["All explicit fields are present."],
        verificationSteps: ["Check evidence ID and plan linkage."],
      },
    ],
    sourceSelectionCriteria: ["No external source acquisition."],
    crossCheckPlan: ["Preserve contradictions."],
    stopConditions: ["Stop if required evidence is absent."],
  },
  toolPlan: {
    requiredCapabilities: [],
    criteria: [],
    candidates: [],
    candidateAssessments: [],
    selectedToolIds: [],
    selectionRationale: "The fixture is already supplied.",
    noToolRequiredReason: "No tool is needed for explicit field comparison.",
    useSteps: [],
    fallbackPlan: [],
  },
  constraints: {
    dataSensitivity: "internal",
    prohibitedDataHandling: ["Do not transmit the fixture externally."],
    sourceRequirements: ["Preserve the synthetic source ID."],
  },
};
const policy: ToolExecutionPolicy = {
  allowedBoundaries: ["local"],
  allowPaidTools: false,
  approvedToolIds: [],
  executionAuthorized: false,
};

describe("REA-BRAINCORE-HSET-0.1", () => {
  it("evaluates all alternatives against the same evidence without selecting a winner", () => {
    const result = evaluateHypothesisSetAfterPreparation(
      plan,
      policy,
      [
        { id: "H-positive", claim: positiveClaim },
        { id: "H-negative", claim: negativeClaim },
      ],
      [evidence],
    );

    expect(result.status).toBe("evaluated");
    if (result.status === "evaluated") {
      expect(
        result.candidateJudgments.map(({ hypothesisId, judgment }) => [
          hypothesisId,
          judgment.status,
        ]),
      ).toEqual([
        ["H-positive", "supported"],
        ["H-negative", "refuted"],
      ]);
      expect(result.summary).toEqual({
        supportedHypothesisIds: ["H-positive"],
        refutedHypothesisIds: ["H-negative"],
        contestedHypothesisIds: [],
        insufficientHypothesisIds: [],
      });
      expect(result).not.toHaveProperty("winner");
    }
  });

  it("preserves multiple supported candidates instead of ranking identical claims", () => {
    const result = evaluateHypothesisSetAfterPreparation(
      plan,
      policy,
      [
        { id: "H-a", claim: positiveClaim },
        { id: "H-b", claim: { ...positiveClaim } },
      ],
      [evidence],
    );

    expect(result.status).toBe("evaluated");
    if (result.status === "evaluated") {
      expect(result.summary.supportedHypothesisIds).toEqual(["H-a", "H-b"]);
      expect(result.candidateJudgments).toHaveLength(2);
      expect(result).not.toHaveProperty("winner");
    }
  });

  it("returns no partial candidate judgments when shared evidence is missing", () => {
    const result = evaluateHypothesisSetAfterPreparation(
      plan,
      policy,
      [
        { id: "H-positive", claim: positiveClaim },
        { id: "H-negative", claim: negativeClaim },
      ],
      [],
    );

    expect(result.status).toBe("needs-information");
    expect(result).not.toHaveProperty("candidateJudgments");
    if (result.status !== "evaluated") {
      expect(result.findings).toHaveLength(2);
      expect(
        result.findings.every(({ attemptStatus }) => attemptStatus === "needs-information"),
      ).toBe(true);
    }
  });

  it("requires at least two hypotheses and rejects duplicate IDs", () => {
    const single = evaluateHypothesisSetAfterPreparation(
      plan,
      policy,
      [{ id: "H-only", claim: positiveClaim }],
      [evidence],
    );
    expect(single.status).toBe("needs-information");

    const duplicate = evaluateHypothesisSetAfterPreparation(
      plan,
      policy,
      [
        { id: "H-duplicate", claim: positiveClaim },
        { id: "H-duplicate", claim: negativeClaim },
      ],
      [evidence],
    );
    expect(duplicate.status).toBe("invalid");
    if (duplicate.status !== "evaluated") {
      expect(duplicate.findings.some(({ code }) => code === "duplicate-hypothesis-id")).toBe(true);
    }

    const malformed = evaluateHypothesisSetAfterPreparation(
      plan,
      policy,
      [null, { id: "H-valid", claim: positiveClaim }],
      [evidence],
    );
    expect(malformed.status).toBe("invalid");
    if (malformed.status !== "evaluated") {
      expect(malformed.findings.some(({ code }) => code === "invalid-hypothesis")).toBe(true);
    }
  });

  it("is deterministic and does not mutate caller inputs", () => {
    const input = {
      plan: structuredClone(plan),
      policy: structuredClone(policy),
      hypotheses: [
        { id: "H-positive", claim: structuredClone(positiveClaim) },
        { id: "H-negative", claim: structuredClone(negativeClaim) },
      ],
      evidence: structuredClone([evidence]),
    };
    const before = structuredClone(input);
    const run = () =>
      evaluateHypothesisSetAfterPreparation(
        input.plan,
        input.policy,
        input.hypotheses,
        input.evidence,
      );

    expect(run()).toEqual(run());
    expect(input).toEqual(before);
  });
});
