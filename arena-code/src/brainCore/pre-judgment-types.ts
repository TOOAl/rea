import type { JudgmentReadiness } from "./readiness.js";
import type { PreparationPlanReadiness } from "./planning-types.js";
import type { JudgmentResult } from "./judgment.js";

export type PreJudgmentStatus =
  "ready" | "needs-information" | "needs-tool-selection" | "blocked" | "invalid";

export interface EvidenceProvenanceFinding {
  code:
    | "missing-evidence-for-required-need"
    | "unresolved-information-need"
    | "unresolved-collection-step"
    | "step-does-not-cover-need";
  path: string;
  message: string;
}

export type PreJudgmentReadiness =
  | {
      status: "ready";
      canJudge: true;
      plan: PreparationPlanReadiness;
      inputs: Extract<JudgmentReadiness, { status: "ready" }>;
      evidenceProvenanceFindings: [];
    }
  | {
      status: Exclude<PreJudgmentStatus, "ready">;
      canJudge: false;
      plan: PreparationPlanReadiness;
      inputs: JudgmentReadiness;
      evidenceProvenanceFindings: EvidenceProvenanceFinding[];
    };

export type PreparedJudgmentAttempt =
  | {
      status: "judged";
      readiness: Extract<PreJudgmentReadiness, { status: "ready" }>;
      judgment: JudgmentResult;
    }
  | {
      status: Exclude<PreJudgmentStatus, "ready">;
      readiness: Exclude<PreJudgmentReadiness, { status: "ready" }>;
    };
