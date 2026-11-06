import { judgeAtomicClaim } from "./judgment.js";
import { inspectPreparationPlanReadiness } from "./planning.js";
import type {
  EvidenceProvenanceFinding,
  PreJudgmentReadiness,
  PreparedJudgmentAttempt,
} from "./pre-judgment-types.js";
import { inspectJudgmentReadiness } from "./readiness.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inspectEvidenceProvenance(
  rawPlan: unknown,
  evidence: readonly { id: string; informationNeedId: string; collectionStepId: string }[],
): EvidenceProvenanceFinding[] {
  const findings: EvidenceProvenanceFinding[] = [];
  if (
    !isRecord(rawPlan) ||
    !Array.isArray(rawPlan.informationNeeds) ||
    !isRecord(rawPlan.collectionPlan)
  ) {
    findings.push({
      code: "unresolved-information-need",
      path: "plan",
      message: "검증된 계획의 정보 필요성 및 수집 단계를 읽을 수 없습니다.",
    });
    return findings;
  }
  const needIds = new Set<string>();
  const requiredNeedIds = new Set<string>();
  rawPlan.informationNeeds.forEach((value) => {
    if (!isRecord(value) || typeof value.id !== "string") return;
    const id = value.id.normalize("NFC").trim();
    needIds.add(id);
    if (value.required === true) requiredNeedIds.add(id);
  });
  const rawSteps = rawPlan.collectionPlan.steps;
  if (!Array.isArray(rawSteps)) {
    findings.push({
      code: "unresolved-collection-step",
      path: "plan.collectionPlan.steps",
      message: "계획의 수집 단계 목록을 읽을 수 없습니다.",
    });
    return findings;
  }
  const stepNeeds = new Map<string, Set<string>>();
  rawSteps.forEach((value) => {
    if (
      !isRecord(value) ||
      typeof value.id !== "string" ||
      !Array.isArray(value.informationNeedIds)
    )
      return;
    const stepId = value.id.normalize("NFC").trim();
    stepNeeds.set(
      stepId,
      new Set(
        value.informationNeedIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.normalize("NFC").trim()),
      ),
    );
  });

  const evidencedRequiredNeeds = new Set<string>();
  evidence.forEach((item, index) => {
    const path = `evidence[${index}]`;
    if (!needIds.has(item.informationNeedId)) {
      findings.push({
        code: "unresolved-information-need",
        path: `${path}.informationNeedId`,
        message: `정보 필요성 '${item.informationNeedId}'가 계획에 없습니다.`,
      });
      return;
    }
    const stepNeedIds = stepNeeds.get(item.collectionStepId);
    if (!stepNeedIds) {
      findings.push({
        code: "unresolved-collection-step",
        path: `${path}.collectionStepId`,
        message: `수집 단계 '${item.collectionStepId}'가 계획에 없습니다.`,
      });
      return;
    }
    if (!stepNeedIds.has(item.informationNeedId)) {
      findings.push({
        code: "step-does-not-cover-need",
        path: `${path}.collectionStepId`,
        message: `수집 단계 '${item.collectionStepId}'는 정보 필요성 '${item.informationNeedId}'를 다루지 않습니다.`,
      });
      return;
    }
    evidencedRequiredNeeds.add(item.informationNeedId);
  });
  requiredNeedIds.forEach((needId) => {
    if (!evidencedRequiredNeeds.has(needId)) {
      findings.push({
        code: "missing-evidence-for-required-need",
        path: "evidence",
        message: `필수 정보 '${needId}'에 연결된 증거가 필요합니다.`,
      });
    }
  });
  return findings;
}

function provenanceStatus(
  findings: readonly EvidenceProvenanceFinding[],
): "ready" | "needs-information" | "invalid" {
  if (
    findings.some(
      ({ code }) =>
        code === "unresolved-information-need" ||
        code === "unresolved-collection-step" ||
        code === "step-does-not-cover-need",
    )
  ) {
    return "invalid";
  }
  return findings.length > 0 ? "needs-information" : "ready";
}

export function inspectPreJudgmentReadiness(
  rawPlan: unknown,
  rawPolicy: unknown,
  rawClaim: unknown,
  rawEvidence: unknown,
  rawToolCatalog?: unknown,
): PreJudgmentReadiness {
  const plan = inspectPreparationPlanReadiness(rawPlan, rawPolicy, rawToolCatalog);
  const inputs = inspectJudgmentReadiness(rawClaim, rawEvidence);
  const noProvenanceFindings: [] = [];
  if (plan.status === "invalid" || inputs.status === "invalid") {
    return {
      status: "invalid",
      canJudge: false,
      plan,
      inputs,
      evidenceProvenanceFindings: noProvenanceFindings,
    };
  }
  if (plan.status === "blocked") {
    return {
      status: "blocked",
      canJudge: false,
      plan,
      inputs,
      evidenceProvenanceFindings: noProvenanceFindings,
    };
  }
  if (plan.status === "needs-information" || inputs.status === "needs-information") {
    return {
      status: "needs-information",
      canJudge: false,
      plan,
      inputs,
      evidenceProvenanceFindings: noProvenanceFindings,
    };
  }
  if (plan.status === "needs-tool-selection") {
    return {
      status: "needs-tool-selection",
      canJudge: false,
      plan,
      inputs,
      evidenceProvenanceFindings: noProvenanceFindings,
    };
  }
  if (inputs.status !== "ready") {
    return {
      status: inputs.status,
      canJudge: false,
      plan,
      inputs,
      evidenceProvenanceFindings: noProvenanceFindings,
    };
  }

  const evidenceProvenanceFindings = inspectEvidenceProvenance(rawPlan, inputs.normalizedEvidence);
  const provenance = provenanceStatus(evidenceProvenanceFindings);
  if (provenance !== "ready") {
    return {
      status: provenance,
      canJudge: false,
      plan,
      inputs,
      evidenceProvenanceFindings,
    };
  }
  return {
    status: "ready",
    canJudge: true,
    plan,
    inputs,
    evidenceProvenanceFindings: noProvenanceFindings,
  };
}

/** Judge only after plan, inputs, and evidence-to-plan provenance are ready. */
export function judgeAtomicClaimAfterPreparation(
  rawPlan: unknown,
  rawPolicy: unknown,
  rawClaim: unknown,
  rawEvidence: unknown,
  rawToolCatalog?: unknown,
): PreparedJudgmentAttempt {
  const readiness = inspectPreJudgmentReadiness(
    rawPlan,
    rawPolicy,
    rawClaim,
    rawEvidence,
    rawToolCatalog,
  );
  if (!readiness.canJudge) return { status: readiness.status, readiness };
  return {
    status: "judged",
    readiness,
    judgment: judgeAtomicClaim(
      readiness.inputs.normalizedClaim,
      readiness.inputs.normalizedEvidence,
    ),
  };
}
