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
  id: "E1",
  sourceId: "lab-record",
  informationNeedId: "provided-evidence",
  collectionStepId: "inspect-input",
  claim,
};
const plan: PreparationPlan = {
  task: {
    question: "관찰이 주장을 뒷받침하는가?",
    objective: "제공된 구조화 증거를 직접 비교한다.",
    scope: "표준 대기압의 물",
    timeScope: "현재 실험",
  },
  informationNeeds: [
    {
      id: "provided-evidence",
      question: "출처와 조건이 명시된 증거인가?",
      purpose: "판단에 필요한 값을 확인한다.",
      required: true,
      expectedScope: "표준 대기압",
      expectedTimeScope: "현재 실험",
      acceptableEvidenceKinds: ["실험 기록"],
    },
  ],
  collectionPlan: {
    steps: [
      {
        id: "inspect-input",
        informationNeedIds: ["provided-evidence"],
        sourceTypes: ["사용자가 제공한 구조화 입력"],
        method: "필드와 출처 ID를 확인한다.",
        expectedOutput: "검증된 구조화 입력",
        acceptanceChecks: ["출처와 범위가 존재한다."],
        verificationSteps: ["요청된 필드와 대조한다."],
      },
    ],
    sourceSelectionCriteria: ["출처를 식별할 수 있어야 한다."],
    crossCheckPlan: ["불일치는 그대로 보존한다."],
    stopConditions: ["필수 정보가 모호하면 보류한다."],
  },
  toolPlan: {
    requiredCapabilities: [],
    criteria: [],
    candidates: [],
    candidateAssessments: [],
    selectedToolIds: [],
    selectionRationale: "외부 도구가 필요하지 않다.",
    noToolRequiredReason: "증거가 이미 구조화된 입력으로 제공되었다.",
    useSteps: [],
    fallbackPlan: [],
  },
  constraints: {
    dataSensitivity: "public",
    prohibitedDataHandling: ["외부 전송을 하지 않는다."],
    sourceRequirements: ["출처 ID를 보존한다."],
  },
};
const policy: ToolExecutionPolicy = {
  allowedBoundaries: ["local"],
  allowPaidTools: false,
  approvedToolIds: [],
  executionAuthorized: false,
};

describe("full pre-judgment gate", () => {
  it("judges only when both preparation and evidence are ready", () => {
    const result = judgeAtomicClaimAfterPreparation(plan, policy, claim, [evidence]);
    expect(result.status).toBe("judged");
    if (result.status === "judged") {
      expect(result.readiness.canJudge).toBe(true);
      expect(result.readiness.plan.toolExecutionPermitted).toBe(false);
      expect(result.judgment.status).toBe("supported");
    }
  });

  it("blocks judgment when the plan is incomplete", () => {
    const incomplete = structuredClone(plan);
    incomplete.collectionPlan.crossCheckPlan = [];
    const result = judgeAtomicClaimAfterPreparation(incomplete, policy, claim, [evidence]);
    expect(result.status).toBe("needs-information");
  });

  it("rejects evidence whose collection step is not in the plan", () => {
    const wrongStep = { ...evidence, collectionStepId: "not-in-plan" };
    const result = judgeAtomicClaimAfterPreparation(plan, policy, claim, [wrongStep]);
    expect(result.status).toBe("invalid");
    if (result.status !== "judged") {
      expect(result.readiness.evidenceProvenanceFindings[0]?.code).toBe(
        "unresolved-collection-step",
      );
    }
  });

  it("requires evidence linked to every required information need", () => {
    const withOptionalNeed = structuredClone(plan);
    withOptionalNeed.informationNeeds.push({
      id: "optional-note",
      question: "보조 관찰이 있는가?",
      purpose: "추가 맥락을 확인한다.",
      required: false,
      expectedScope: "표준 대기압",
      expectedTimeScope: "현재 실험",
      acceptableEvidenceKinds: ["실험 메모"],
    });
    withOptionalNeed.collectionPlan.steps.push({
      id: "collect-optional-note",
      informationNeedIds: ["optional-note"],
      sourceTypes: ["실험 메모"],
      method: "보조 메모를 확인한다.",
      expectedOutput: "보조 관찰 메모",
      acceptanceChecks: ["메모의 출처가 있다."],
      verificationSteps: ["원문 메모와 대조한다."],
    });
    const optionalEvidence = {
      ...evidence,
      informationNeedId: "optional-note",
      collectionStepId: "collect-optional-note",
    };

    const result = judgeAtomicClaimAfterPreparation(withOptionalNeed, policy, claim, [
      optionalEvidence,
    ]);
    expect(result.status).toBe("needs-information");
    if (result.status !== "judged") {
      expect(result.readiness.evidenceProvenanceFindings).toMatchObject([
        { code: "missing-evidence-for-required-need" },
      ]);
    }
  });

  it("rejects a collection step that does not cover the cited information need", () => {
    const withOptionalNeed = structuredClone(plan);
    withOptionalNeed.informationNeeds.push({
      id: "optional-note",
      question: "보조 관찰이 있는가?",
      purpose: "추가 맥락을 확인한다.",
      required: false,
      expectedScope: "표준 대기압",
      expectedTimeScope: "현재 실험",
      acceptableEvidenceKinds: ["실험 메모"],
    });
    const mismatchedEvidence = {
      ...evidence,
      informationNeedId: "optional-note",
      collectionStepId: "inspect-input",
    };
    const result = judgeAtomicClaimAfterPreparation(withOptionalNeed, policy, claim, [
      mismatchedEvidence,
    ]);
    expect(result.status).toBe("invalid");
    if (result.status !== "judged") {
      expect(result.readiness.evidenceProvenanceFindings).toEqual(
        expect.arrayContaining([
          {
            code: "step-does-not-cover-need",
            path: expect.any(String),
            message: expect.any(String),
          },
        ]),
      );
    }
  });

  it("blocks judgment when structured evidence is incomplete", () => {
    const incompleteClaim = { ...claim, scope: " " };
    const result = judgeAtomicClaimAfterPreparation(plan, policy, incompleteClaim, [evidence]);
    expect(result.status).toBe("needs-information");
  });
});
