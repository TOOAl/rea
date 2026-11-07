import { judgeAtomicClaimAfterPreparation } from "./pre-judgment.js";
import type { AtomicClaim, JudgmentResult } from "./judgment.js";
import type { PreJudgmentStatus, PreparedJudgmentAttempt } from "./pre-judgment-types.js";

export interface CandidateHypothesis {
  id: string;
  claim: AtomicClaim;
}

export type HypothesisSetStopStatus = Exclude<PreJudgmentStatus, "ready">;
export type HypothesisFindingCode =
  "missing-hypotheses" | "invalid-hypothesis" | "duplicate-hypothesis-id" | "candidate-not-ready";

export interface HypothesisSetFinding {
  code: HypothesisFindingCode;
  path: string;
  message: string;
  hypothesisId?: string;
  attemptStatus?: HypothesisSetStopStatus;
}

export interface HypothesisJudgment {
  hypothesisId: string;
  judgment: JudgmentResult;
}

export interface HypothesisSetSummary {
  supportedHypothesisIds: string[];
  refutedHypothesisIds: string[];
  contestedHypothesisIds: string[];
  insufficientHypothesisIds: string[];
}

export type HypothesisSetAttempt =
  | {
      status: "evaluated";
      candidateJudgments: HypothesisJudgment[];
      summary: HypothesisSetSummary;
      findings: [];
    }
  | {
      status: HypothesisSetStopStatus;
      findings: HypothesisSetFinding[];
    };

interface NormalizedHypothesis {
  id: string;
  claim: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHypotheses(
  raw: unknown,
):
  | { status: "ready"; hypotheses: NormalizedHypothesis[] }
  | { status: "needs-information" | "invalid"; findings: HypothesisSetFinding[] } {
  if (!Array.isArray(raw)) {
    if (raw === undefined) {
      return {
        status: "needs-information",
        findings: [
          {
            code: "missing-hypotheses",
            path: "hypotheses",
            message: "최소 두 개의 후보 가설이 필요합니다.",
          },
        ],
      };
    }
    return {
      status: "invalid",
      findings: [
        {
          code: "invalid-hypothesis",
          path: "hypotheses",
          message: "hypotheses는 후보 객체의 배열이어야 합니다.",
        },
      ],
    };
  }

  const hypotheses: NormalizedHypothesis[] = [];
  const ids = new Set<string>();
  const findings: HypothesisSetFinding[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    if (!(index in raw)) {
      findings.push({
        code: "invalid-hypothesis",
        path: `hypotheses[${index}]`,
        message: "후보 배열에 비어 있는 항목이 있습니다.",
      });
      continue;
    }
    const value: unknown = raw[index];
    const path = `hypotheses[${index}]`;
    if (!isRecord(value)) {
      findings.push({
        code: "invalid-hypothesis",
        path,
        message: `${path}는 후보 객체여야 합니다.`,
      });
      continue;
    }
    if (typeof value.id !== "string" || !value.id.normalize("NFC").trim()) {
      findings.push({
        code: "invalid-hypothesis",
        path: `${path}.id`,
        message: `${path}.id에는 비어 있지 않은 문자열이 필요합니다.`,
      });
      continue;
    }
    const id = value.id.normalize("NFC").trim();
    if (ids.has(id)) {
      findings.push({
        code: "duplicate-hypothesis-id",
        path: `${path}.id`,
        message: `후보 ID '${id}'가 중복되었습니다.`,
        hypothesisId: id,
      });
      continue;
    }
    ids.add(id);
    hypotheses.push({ id, claim: value.claim });
  }

  if (findings.length > 0) return { status: "invalid", findings };
  if (hypotheses.length < 2) {
    return {
      status: "needs-information",
      findings: [
        {
          code: "missing-hypotheses",
          path: "hypotheses",
          message: "대안을 비교하려면 후보 가설이 최소 두 개 필요합니다.",
        },
      ],
    };
  }
  return { status: "ready", hypotheses };
}

function stopStatus(attempts: readonly PreparedJudgmentAttempt[]): HypothesisSetStopStatus {
  const priority: Record<HypothesisSetStopStatus, number> = {
    invalid: 4,
    blocked: 3,
    "needs-information": 2,
    "needs-tool-selection": 1,
  };
  const statuses = attempts
    .filter(
      (attempt): attempt is Exclude<PreparedJudgmentAttempt, { status: "judged" }> =>
        attempt.status !== "judged",
    )
    .map(({ status }) => status);
  return statuses.reduce(
    (selected, status) => (priority[status] > priority[selected] ? status : selected),
    "needs-tool-selection",
  );
}

/**
 * Evaluate a finite caller-supplied hypothesis set against the same closed evidence.
 * The shared v0.1 gate is applied to every candidate; no partial judgments are exposed.
 */
export function evaluateHypothesisSetAfterPreparation(
  rawPlan: unknown,
  rawPolicy: unknown,
  rawHypotheses: unknown,
  rawEvidence: unknown,
  rawToolCatalog?: unknown,
): HypothesisSetAttempt {
  const parsed = parseHypotheses(rawHypotheses);
  if (parsed.status !== "ready") return parsed;

  const attempts = parsed.hypotheses.map((hypothesis) =>
    judgeAtomicClaimAfterPreparation(
      rawPlan,
      rawPolicy,
      hypothesis.claim,
      rawEvidence,
      rawToolCatalog,
    ),
  );
  if (attempts.some((attempt) => attempt.status !== "judged")) {
    const findings = attempts.flatMap((attempt, index) => {
      if (attempt.status === "judged") return [];
      return [
        {
          code: "candidate-not-ready" as const,
          path: `hypotheses[${index}]`,
          message: `후보 '${parsed.hypotheses[index]!.id}' 판단 준비 실패: ${attempt.status}`,
          hypothesisId: parsed.hypotheses[index]!.id,
          attemptStatus: attempt.status,
        },
      ];
    });
    return { status: stopStatus(attempts), findings };
  }

  const candidateJudgments: HypothesisJudgment[] = attempts.map((attempt, index) => {
    if (attempt.status !== "judged")
      throw new Error("Unreachable: non-judged attempt escaped gate");
    return {
      hypothesisId: parsed.hypotheses[index]!.id,
      judgment: attempt.judgment,
    };
  });
  const summary: HypothesisSetSummary = {
    supportedHypothesisIds: [],
    refutedHypothesisIds: [],
    contestedHypothesisIds: [],
    insufficientHypothesisIds: [],
  };
  candidateJudgments.forEach(({ hypothesisId, judgment }) => {
    switch (judgment.status) {
      case "supported":
        summary.supportedHypothesisIds.push(hypothesisId);
        break;
      case "refuted":
        summary.refutedHypothesisIds.push(hypothesisId);
        break;
      case "contested":
        summary.contestedHypothesisIds.push(hypothesisId);
        break;
      case "insufficient":
        summary.insufficientHypothesisIds.push(hypothesisId);
        break;
    }
  });
  return { status: "evaluated", candidateJudgments, summary, findings: [] };
}
