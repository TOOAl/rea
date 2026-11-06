import { describe, expect, it } from "vitest";
import {
  judgeAtomicClaimAfterPreparation,
  type AtomicClaim,
  type ClaimEvidence,
  type PreparationPlan,
  type ToolExecutionPolicy,
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
  id: "evidence-1",
  sourceId: "provided-record-1",
  informationNeedId: "need-1",
  collectionStepId: "step-1",
  claim,
};

const plan: PreparationPlan = {
  task: {
    question: "제공된 증거가 주장을 뒷받침하는가?",
    objective: "구조화된 주장 필드만 비교한다.",
    scope: "표준 대기압의 물",
    timeScope: "현재 실험",
  },
  informationNeeds: [
    {
      id: "need-1",
      question: "비교할 증거가 있는가?",
      purpose: "주장 필드와 증거를 연결한다.",
      required: true,
      expectedScope: "표준 대기압",
      expectedTimeScope: "현재 실험",
      acceptableEvidenceKinds: ["provided-structured-record"],
    },
  ],
  collectionPlan: {
    steps: [
      {
        id: "step-1",
        informationNeedIds: ["need-1"],
        sourceTypes: ["caller-provided"],
        method: "이미 제공된 구조화 입력을 확인한다.",
        expectedOutput: "구조화된 증거 입력",
        acceptanceChecks: ["필수 필드가 존재한다."],
        verificationSteps: ["필드와 provenance ID를 확인한다."],
      },
    ],
    sourceSelectionCriteria: ["외부 수집을 하지 않는다."],
    crossCheckPlan: ["불일치는 결과에 보존한다."],
    stopConditions: ["필수 입력이 빠지면 판단하지 않는다."],
  },
  toolPlan: {
    requiredCapabilities: [],
    criteria: [],
    candidates: [],
    candidateAssessments: [],
    selectedToolIds: [],
    selectionRationale: "도구 없이 제공 입력만 비교한다.",
    noToolRequiredReason: "필요한 구조화 증거가 이미 입력에 포함되어 있다.",
    useSteps: [],
    fallbackPlan: [],
  },
  constraints: {
    dataSensitivity: "internal",
    prohibitedDataHandling: ["외부 전송을 하지 않는다."],
    sourceRequirements: ["caller-provided source ID를 보존한다."],
  },
};

const policy: ToolExecutionPolicy = {
  allowedBoundaries: ["local"],
  allowPaidTools: false,
  approvedToolIds: [],
  executionAuthorized: false,
};

describe("REA-BRAINCORE-IC-0.1 contract", () => {
  it("runs deterministically without mutating inputs or authorizing tool execution", () => {
    const input = {
      plan: structuredClone(plan),
      policy: structuredClone(policy),
      claim: structuredClone(claim),
      evidence: structuredClone([evidence]),
    };
    const before = structuredClone(input);

    const run = () =>
      judgeAtomicClaimAfterPreparation(input.plan, input.policy, input.claim, input.evidence);
    const first = run();
    const second = run();

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(first.status).toBe("judged");
    if (first.status === "judged") {
      expect(first.readiness.plan.toolExecutionPermitted).toBe(false);
      expect(first.judgment.status).toBe("supported");
      expect(first.judgment.assessments).toEqual([
        expect.objectContaining({
          evidenceId: "evidence-1",
          sourceId: "provided-record-1",
          informationNeedId: "need-1",
          collectionStepId: "step-1",
          relation: "supports",
        }),
      ]);
    }
  });

  it("keeps a provenance-valid but non-comparable item and reports insufficient", () => {
    const outsideScope: ClaimEvidence = {
      ...evidence,
      claim: { ...claim, scope: "다른 압력" },
    };
    const result = judgeAtomicClaimAfterPreparation(plan, policy, claim, [outsideScope]);

    expect(result.status).toBe("judged");
    if (result.status === "judged") {
      expect(result.judgment.status).toBe("insufficient");
      expect(result.judgment.nonComparableEvidenceIds).toEqual(["evidence-1"]);
      expect(result.judgment.assessments[0]).toMatchObject({
        evidenceId: "evidence-1",
        relation: "not-comparable",
        reason: "scope-mismatch",
      });
    }
  });

  it("stops when evidence is missing and re-enters only after caller-supplied evidence", () => {
    const stopped = judgeAtomicClaimAfterPreparation(plan, policy, claim, []);
    expect(stopped.status).toBe("needs-information");

    const retried = judgeAtomicClaimAfterPreparation(plan, policy, claim, [evidence]);
    expect(retried.status).toBe("judged");
    if (retried.status === "judged") expect(retried.judgment.status).toBe("supported");
  });
});
