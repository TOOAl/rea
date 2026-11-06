export type ToolBoundary = "local" | "external";
export type ToolCostClass = "free" | "paid" | "unknown";
export type CriterionImportance = "required" | "preferred";
export type CriterionOutcome = "pass" | "fail" | "unknown";
export type PreparationPlanStatus =
  "ready" | "needs-information" | "needs-tool-selection" | "blocked" | "invalid";

export type ToolCriterionKind =
  | "capability-fit"
  | "permission-policy"
  | "privacy-security"
  | "cost"
  | "environment-compatibility"
  | "provenance-auditability"
  | "output-validation"
  | "reproducibility"
  | "reliability";

export interface TaskDefinition {
  question: string;
  objective: string;
  scope: string;
  timeScope: string;
}

export interface InformationNeed {
  id: string;
  question: string;
  purpose: string;
  required: boolean;
  expectedScope: string;
  expectedTimeScope: string;
  acceptableEvidenceKinds: string[];
}

export interface CollectionStep {
  id: string;
  informationNeedIds: string[];
  sourceTypes: string[];
  method: string;
  expectedOutput: string;
  acceptanceChecks: string[];
  verificationSteps: string[];
}

export interface CollectionPlan {
  steps: CollectionStep[];
  sourceSelectionCriteria: string[];
  crossCheckPlan: string[];
  stopConditions: string[];
}

export interface ToolCapabilityNeed {
  id: string;
  capability: string;
  purpose: string;
}

export interface ToolSelectionCriterion {
  id: string;
  kind: ToolCriterionKind;
  importance: CriterionImportance;
  acceptanceRule: string;
}

/** A plan can name a tool, but cannot define what that tool can do. */
export interface ToolCandidate {
  id: string;
}

export interface ToolCapabilityCatalogEntry {
  id: string;
  label: string;
  capabilities: string[];
  boundary: ToolBoundary;
  costClass: ToolCostClass;
  /** Traceable implementation and test paths, not a behavioral guarantee. */
  verificationRefs: string[];
}

export interface ToolCapabilityCatalog {
  revision: string;
  entries: ToolCapabilityCatalogEntry[];
}

export interface ToolCriterionAssessment {
  criterionId: string;
  outcome: CriterionOutcome;
  basis: string;
  evidenceRefs: string[];
  rationale: string;
}

export interface ToolCandidateAssessment {
  candidateId: string;
  criteria: ToolCriterionAssessment[];
}

export interface ToolUseStep {
  id: string;
  toolId: string;
  capabilityNeedId: string;
  action: string;
  inputDescription: string;
  expectedOutput: string;
  outputVerification: string;
  onFailure: string;
  stopCondition: string;
}

export interface ToolPlan {
  requiredCapabilities: ToolCapabilityNeed[];
  criteria: ToolSelectionCriterion[];
  candidates: ToolCandidate[];
  candidateAssessments: ToolCandidateAssessment[];
  selectedToolIds: string[];
  selectionRationale: string;
  noToolRequiredReason?: string;
  useSteps: ToolUseStep[];
  fallbackPlan: string[];
}

export interface PreparationConstraints {
  dataSensitivity: "public" | "internal" | "confidential" | "sensitive";
  prohibitedDataHandling: string[];
  sourceRequirements: string[];
}

export interface PreparationPlan {
  task: TaskDefinition;
  informationNeeds: InformationNeed[];
  collectionPlan: CollectionPlan;
  toolPlan: ToolPlan;
  constraints: PreparationConstraints;
}

/** Explicit policy input; a complete plan does not itself authorize execution. */
export interface ToolExecutionPolicy {
  allowedBoundaries: ToolBoundary[];
  allowPaidTools: boolean;
  approvedToolIds: string[];
  executionAuthorized: boolean;
}

export interface PlanReadinessFinding {
  code:
    | "missing-information"
    | "invalid-input"
    | "duplicate-id"
    | "unresolved-reference"
    | "tool-selection-required"
    | "tool-ineligible"
    | "policy-blocked"
    | "execution-not-authorized";
  path: string;
  message: string;
}

export interface PreparationPlanReadiness {
  status: PreparationPlanStatus;
  planningComplete: boolean;
  toolExecutionPermitted: boolean;
  missingInformation: PlanReadinessFinding[];
  invalidInputs: PlanReadinessFinding[];
  selectionIssues: PlanReadinessFinding[];
  policyIssues: PlanReadinessFinding[];
}
