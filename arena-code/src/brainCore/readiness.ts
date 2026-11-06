import { judgeAtomicClaim } from "./judgment.js";
import type { AtomicClaim, ClaimEvidence, JudgmentResult } from "./judgment.js";

export type ReadinessStatus = "ready" | "needs-information" | "invalid";
export type ReadinessFindingCode = "missing-information" | "invalid-input" | "duplicate-id";

export interface ReadinessFinding {
  code: ReadinessFindingCode;
  path: string;
  message: string;
}

export type JudgmentReadiness =
  | {
      status: "ready";
      normalizedClaim: AtomicClaim;
      normalizedEvidence: ClaimEvidence[];
      findings: ReadinessFinding[];
    }
  | {
      status: Exclude<ReadinessStatus, "ready">;
      findings: ReadinessFinding[];
    };

export type JudgmentAttempt =
  | {
      status: "judged";
      readiness: Extract<JudgmentReadiness, { status: "ready" }>;
      judgment: JudgmentResult;
    }
  | {
      status: Exclude<ReadinessStatus, "ready">;
      readiness: Exclude<JudgmentReadiness, { status: "ready" }>;
    };

const FIELDS: readonly ("subject" | "predicate" | "object" | "scope" | "timeScope")[] = [
  "subject",
  "predicate",
  "object",
  "scope",
  "timeScope",
];

function isMissingText(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && !value.normalize("NFC").trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readClaim(
  value: unknown,
  path: string,
  findings: ReadinessFinding[],
): AtomicClaim | undefined {
  if (!isRecord(value)) {
    findings.push({
      code: value === undefined ? "missing-information" : "invalid-input",
      path,
      message: `${path}는 객체여야 합니다.`,
    });
    return undefined;
  }
  const claim: Partial<AtomicClaim> = {};
  for (const field of FIELDS) {
    const item = value[field];
    if (typeof item !== "string" || !item.normalize("NFC").trim()) {
      const absent = isMissingText(item);
      findings.push({
        code: absent ? "missing-information" : "invalid-input",
        path: `${path}.${field}`,
        message: `${path}.${field}에 비어 있지 않은 문자열이 필요합니다.`,
      });
    } else {
      claim[field] = item.normalize("NFC").trim();
    }
  }
  if (value.polarity !== "positive" && value.polarity !== "negative") {
    findings.push({
      code: value.polarity === undefined ? "missing-information" : "invalid-input",
      path: `${path}.polarity`,
      message: `${path}.polarity는 positive 또는 negative여야 합니다.`,
    });
  } else {
    claim.polarity = value.polarity;
  }
  if (FIELDS.some((field) => claim[field] === undefined) || claim.polarity === undefined) {
    return undefined;
  }
  return claim as AtomicClaim;
}

export function inspectJudgmentReadiness(
  rawClaim: unknown,
  rawEvidence: unknown,
): JudgmentReadiness {
  const findings: ReadinessFinding[] = [];
  const normalizedClaim = readClaim(rawClaim, "claim", findings);
  if (!Array.isArray(rawEvidence)) {
    findings.push({
      code: rawEvidence === undefined ? "missing-information" : "invalid-input",
      path: "evidence",
      message: "evidence는 증거 객체의 배열이어야 합니다.",
    });
  } else if (rawEvidence.length === 0) {
    findings.push({
      code: "missing-information",
      path: "evidence",
      message: "비교할 증거가 하나 이상 필요합니다.",
    });
  }

  const normalizedEvidence: ClaimEvidence[] = [];
  const evidenceIds = new Set<string>();
  if (Array.isArray(rawEvidence)) {
    for (let index = 0; index < rawEvidence.length; index += 1) {
      if (!(index in rawEvidence)) {
        findings.push({
          code: "invalid-input",
          path: `evidence[${index}]`,
          message: "증거 배열에 비어 있는 항목이 있습니다.",
        });
      }
    }
    rawEvidence.forEach((value, index) => {
      const path = `evidence[${index}]`;
      if (!isRecord(value)) {
        findings.push({
          code: value === undefined ? "missing-information" : "invalid-input",
          path,
          message: `${path}는 객체여야 합니다.`,
        });
        return;
      }
      const id = value.id;
      const sourceId = value.sourceId;
      const informationNeedId = value.informationNeedId;
      const collectionStepId = value.collectionStepId;
      if (typeof id !== "string" || !id.normalize("NFC").trim()) {
        findings.push({
          code: isMissingText(id) ? "missing-information" : "invalid-input",
          path: `${path}.id`,
          message: `${path}.id에 비어 있지 않은 문자열이 필요합니다.`,
        });
      } else if (evidenceIds.has(id.normalize("NFC").trim())) {
        findings.push({
          code: "duplicate-id",
          path: `${path}.id`,
          message: `증거 ID '${id}'가 중복되었습니다.`,
        });
      } else {
        evidenceIds.add(id.normalize("NFC").trim());
      }
      if (typeof sourceId !== "string" || !sourceId.normalize("NFC").trim()) {
        findings.push({
          code: isMissingText(sourceId) ? "missing-information" : "invalid-input",
          path: `${path}.sourceId`,
          message: `${path}.sourceId에 비어 있지 않은 출처 ID가 필요합니다.`,
        });
      }
      for (const [key, reference] of [
        ["informationNeedId", informationNeedId],
        ["collectionStepId", collectionStepId],
      ] as const) {
        if (typeof reference !== "string" || !reference.normalize("NFC").trim()) {
          findings.push({
            code: isMissingText(reference) ? "missing-information" : "invalid-input",
            path: `${path}.${key}`,
            message: `${path}.${key}에 비어 있지 않은 provenance ID가 필요합니다.`,
          });
        }
      }
      const evidenceClaim = readClaim(value.claim, `${path}.claim`, findings);
      if (
        typeof id === "string" &&
        id.normalize("NFC").trim() &&
        typeof sourceId === "string" &&
        sourceId.normalize("NFC").trim() &&
        typeof informationNeedId === "string" &&
        informationNeedId.normalize("NFC").trim() &&
        typeof collectionStepId === "string" &&
        collectionStepId.normalize("NFC").trim() &&
        evidenceClaim
      ) {
        normalizedEvidence.push({
          id: id.normalize("NFC").trim(),
          sourceId: sourceId.normalize("NFC").trim(),
          informationNeedId: informationNeedId.normalize("NFC").trim(),
          collectionStepId: collectionStepId.normalize("NFC").trim(),
          claim: evidenceClaim,
        });
      }
    });
  }

  if (findings.length > 0 || !normalizedClaim) {
    return {
      status: findings.some(
        (finding) => finding.code === "invalid-input" || finding.code === "duplicate-id",
      )
        ? "invalid"
        : "needs-information",
      findings,
    };
  }
  return { status: "ready", normalizedClaim, normalizedEvidence, findings };
}

export function judgeAtomicClaimWhenReady(
  rawClaim: unknown,
  rawEvidence: unknown,
): JudgmentAttempt {
  const readiness = inspectJudgmentReadiness(rawClaim, rawEvidence);
  if (readiness.status !== "ready") return { status: readiness.status, readiness };
  return {
    status: "judged",
    readiness,
    judgment: judgeAtomicClaim(readiness.normalizedClaim, readiness.normalizedEvidence),
  };
}
