#!/usr/bin/env node
/**
 * Provider-free known-answer evaluation for the bounded BrainCore v0.1 contract.
 * This is a visible regression suite, not a held-out or general-capability score.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  judgeAtomicClaimAfterPreparation,
  type AtomicClaim,
  type ClaimEvidence,
  type PreparationPlan,
  type ToolExecutionPolicy,
} from "../src/brainCore/index.js";

interface ExpectedAssessment {
  evidenceId: string;
  relation: string;
  reason: string;
}

interface ExpectedResult {
  invocationStatus: string;
  judgmentStatus?: string;
  assessments?: ExpectedAssessment[];
}

interface KnownAnswerCase {
  id: string;
  evidence: ClaimEvidence[];
  expected: ExpectedResult;
}

interface KnownAnswerSuite {
  suiteId: string;
  version: string;
  description: string;
  targetClaim: AtomicClaim;
  cases: KnownAnswerCase[];
}

const suitePath = fileURLToPath(
  new URL("../evals/brainCore-v0.1/known-answer-cases.json", import.meta.url),
);
const suite = JSON.parse(readFileSync(suitePath, "utf8")) as KnownAnswerSuite;

const plan: PreparationPlan = {
  task: {
    question: "Do the supplied structured records support the target claim?",
    objective: "Apply the frozen BrainCore v0.1 comparison contract.",
    scope: "synthetic known-answer fixtures only",
    timeScope: "fixed suite version 0.1.0",
  },
  informationNeeds: [
    {
      id: "need-checksum",
      question: "Is there a structured record for the checksum claim?",
      purpose: "Provide test evidence for the explicit field comparator.",
      required: true,
      expectedScope: "ingest-region-east",
      expectedTimeScope: "2026-11-06T09:00Z",
      acceptableEvidenceKinds: ["synthetic-structured-record"],
    },
  ],
  collectionPlan: {
    steps: [
      {
        id: "step-inspect",
        informationNeedIds: ["need-checksum"],
        sourceTypes: ["suite-fixture"],
        method: "Read only the fixed local JSON fixture.",
        expectedOutput: "Structured evidence records from the fixture.",
        acceptanceChecks: ["Each evidence record has complete explicit claim fields."],
        verificationSteps: ["Compare output with the fixture's fixed expected result."],
      },
    ],
    sourceSelectionCriteria: ["No source acquisition; use only checked-in synthetic data."],
    crossCheckPlan: ["Use the fixed expected answer for each case."],
    stopConditions: ["Malformed inputs must not be judged."],
  },
  toolPlan: {
    requiredCapabilities: [],
    criteria: [],
    candidates: [],
    candidateAssessments: [],
    selectedToolIds: [],
    selectionRationale: "The evaluator uses only local in-process BrainCore code.",
    noToolRequiredReason: "The fixtures are already local and structured.",
    useSteps: [],
    fallbackPlan: [],
  },
  constraints: {
    dataSensitivity: "internal",
    prohibitedDataHandling: ["No network access, Provider call, or external evidence acquisition."],
    sourceRequirements: ["Keep synthetic fixture IDs attached to every assessment."],
  },
};

const policy: ToolExecutionPolicy = {
  allowedBoundaries: ["local"],
  allowPaidTools: false,
  approvedToolIds: [],
  executionAuthorized: false,
};

function sameExpectedResult(actual: ExpectedResult, expected: ExpectedResult): boolean {
  if (actual.invocationStatus !== expected.invocationStatus) return false;
  if (actual.judgmentStatus !== expected.judgmentStatus) return false;
  if (expected.assessments === undefined) return true;
  return JSON.stringify(actual.assessments) === JSON.stringify(expected.assessments);
}

function runCase(testCase: KnownAnswerCase) {
  const attempt = judgeAtomicClaimAfterPreparation(
    plan,
    policy,
    suite.targetClaim,
    testCase.evidence,
  );
  const actual: ExpectedResult =
    attempt.status === "judged"
      ? {
          invocationStatus: attempt.status,
          judgmentStatus: attempt.judgment.status,
          assessments: attempt.judgment.assessments.map(({ evidenceId, relation, reason }) => ({
            evidenceId,
            relation,
            reason,
          })),
        }
      : { invocationStatus: attempt.status };
  return {
    id: testCase.id,
    passed: sameExpectedResult(actual, testCase.expected),
    expected: testCase.expected,
    actual,
  };
}

function main(): void {
  if (!suite.suiteId || !suite.version || !Array.isArray(suite.cases) || suite.cases.length === 0) {
    throw new Error("Known-answer fixture is missing suite metadata or cases.");
  }
  const caseIds = suite.cases.map(({ id }) => id);
  if (caseIds.some((id) => !id) || new Set(caseIds).size !== caseIds.length) {
    throw new Error("Known-answer case IDs must be non-empty and unique.");
  }

  const results = suite.cases.map(runCase);
  const passed = results.filter(({ passed: isPassed }) => isPassed).length;
  console.log(
    JSON.stringify(
      {
        suiteId: suite.suiteId,
        version: suite.version,
        description: suite.description,
        passed,
        total: results.length,
        results,
        interpretation:
          "Visible synthetic contract regression only; not a held-out benchmark, source verification, or general brain-capability score.",
      },
      null,
      2,
    ),
  );
  if (passed !== results.length) process.exitCode = 1;
}

main();
