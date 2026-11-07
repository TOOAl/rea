export interface DecisionHypothesis {
  id: string;
  prior: number;
  decisionRegionId: string;
}

export interface TestOutcomeModel {
  id: string;
  /** P(this outcome | hypothesis ID), supplied by the caller. */
  likelihoodByHypothesis: Record<string, number>;
}

export interface CandidateDecisionTest {
  id: string;
  /** Test cost in caller-defined units. */
  cost: number;
  outcomes: TestOutcomeModel[];
}

export interface DecisionTestSelectionInput {
  hypotheses: DecisionHypothesis[];
  tests: CandidateDecisionTest[];
  /** Converts caller-defined test-cost units into decision-error probability units. */
  costPenalty: number;
}

export type DecisionTestFindingCode =
  | "missing-hypotheses"
  | "missing-tests"
  | "invalid-hypothesis"
  | "duplicate-hypothesis-id"
  | "invalid-test"
  | "duplicate-test-id"
  | "invalid-outcome"
  | "duplicate-outcome-id"
  | "invalid-probability-model";

export interface DecisionTestFinding {
  code: DecisionTestFindingCode;
  path: string;
  message: string;
  hypothesisId?: string;
  testId?: string;
  outcomeId?: string;
}

export interface DecisionTestAssessment {
  testId: string;
  expectedCorrectDecisionProbabilityAfterTest: number;
  expectedDecisionErrorReduction: number;
  cost: number;
  netValue: number;
}

export type DecisionTestSelection =
  | {
      status: "selected";
      selectedTestId: string;
      baselineCorrectDecisionProbability: number;
      assessments: DecisionTestAssessment[];
      findings: [];
    }
  | {
      status: "no-positive-value-test";
      baselineCorrectDecisionProbability: number;
      assessments: DecisionTestAssessment[];
      findings: [];
    }
  | {
      status: "needs-information" | "invalid";
      findings: DecisionTestFinding[];
    };

interface NormalizedOutcome {
  id: string;
  likelihoodByHypothesis: Map<string, number>;
}

interface NormalizedTest {
  id: string;
  cost: number;
  outcomes: NormalizedOutcome[];
}

interface NormalizedInput {
  hypotheses: DecisionHypothesis[];
  tests: NormalizedTest[];
  costPenalty: number;
}

const PROBABILITY_TOLERANCE = 1e-9;
const POSITIVE_VALUE_TOLERANCE = 1e-12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.normalize("NFC").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseInput(
  raw: unknown,
):
  | { status: "ready"; input: NormalizedInput }
  | { status: "needs-information" | "invalid"; findings: DecisionTestFinding[] } {
  if (!isRecord(raw)) {
    return {
      status: "invalid",
      findings: [
        {
          code: "invalid-probability-model",
          path: "input",
          message: "입력은 가설, 검사, 비용 가중치를 포함하는 객체여야 합니다.",
        },
      ],
    };
  }

  const rawHypotheses = raw.hypotheses;
  const rawTests = raw.tests;
  const missingFindings: DecisionTestFinding[] = [];
  if (rawHypotheses === undefined || (Array.isArray(rawHypotheses) && rawHypotheses.length < 2)) {
    missingFindings.push({
      code: "missing-hypotheses",
      path: "hypotheses",
      message: "의사결정 정보를 비교하려면 가설이 최소 두 개 필요합니다.",
    });
  }
  if (rawTests === undefined || (Array.isArray(rawTests) && rawTests.length === 0)) {
    missingFindings.push({
      code: "missing-tests",
      path: "tests",
      message: "비교할 수 있는 후보 검사가 최소 하나 필요합니다.",
    });
  }
  if (missingFindings.length > 0) return { status: "needs-information", findings: missingFindings };

  const findings: DecisionTestFinding[] = [];
  if (!Array.isArray(rawHypotheses)) {
    findings.push({
      code: "invalid-hypothesis",
      path: "hypotheses",
      message: "hypotheses는 후보 객체의 배열이어야 합니다.",
    });
  }
  if (!Array.isArray(rawTests)) {
    findings.push({
      code: "invalid-test",
      path: "tests",
      message: "tests는 후보 검사 객체의 배열이어야 합니다.",
    });
  }

  const hypotheses: DecisionHypothesis[] = [];
  const hypothesisIds = new Set<string>();
  if (Array.isArray(rawHypotheses)) {
    rawHypotheses.forEach((value, index) => {
      const path = `hypotheses[${index}]`;
      if (!isRecord(value)) {
        findings.push({
          code: "invalid-hypothesis",
          path,
          message: `${path}는 객체여야 합니다.`,
        });
        return;
      }
      const id = normalizeId(value.id);
      const decisionRegionId = normalizeId(value.decisionRegionId);
      if (
        !id ||
        !decisionRegionId ||
        typeof value.prior !== "number" ||
        !Number.isFinite(value.prior)
      ) {
        findings.push({
          code: "invalid-hypothesis",
          path,
          message: `${path}에는 ID, 의사결정 구역 ID, 유한한 사전확률이 필요합니다.`,
        });
        return;
      }
      if (hypothesisIds.has(id)) {
        findings.push({
          code: "duplicate-hypothesis-id",
          path: `${path}.id`,
          message: `가설 ID '${id}'가 중복되었습니다.`,
          hypothesisId: id,
        });
        return;
      }
      hypothesisIds.add(id);
      hypotheses.push({ id, prior: value.prior, decisionRegionId });
    });
  }

  const rawCostPenalty = raw.costPenalty;
  if (
    typeof rawCostPenalty !== "number" ||
    !Number.isFinite(rawCostPenalty) ||
    rawCostPenalty < 0
  ) {
    findings.push({
      code: "invalid-probability-model",
      path: "costPenalty",
      message: "costPenalty는 0 이상의 유한한 숫자여야 합니다.",
    });
  }

  const tests: NormalizedTest[] = [];
  const testIds = new Set<string>();
  if (Array.isArray(rawTests)) {
    rawTests.forEach((value, testIndex) => {
      const path = `tests[${testIndex}]`;
      if (!isRecord(value)) {
        findings.push({
          code: "invalid-test",
          path,
          message: `${path}는 검사 객체여야 합니다.`,
        });
        return;
      }
      const id = normalizeId(value.id);
      if (!id || typeof value.cost !== "number" || !Number.isFinite(value.cost) || value.cost < 0) {
        findings.push({
          code: "invalid-test",
          path,
          message: `${path}에는 ID와 0 이상의 유한한 비용이 필요합니다.`,
        });
        return;
      }
      if (testIds.has(id)) {
        findings.push({
          code: "duplicate-test-id",
          path: `${path}.id`,
          message: `검사 ID '${id}'가 중복되었습니다.`,
          testId: id,
        });
        return;
      }
      testIds.add(id);
      if (!Array.isArray(value.outcomes) || value.outcomes.length === 0) {
        findings.push({
          code: "invalid-test",
          path: `${path}.outcomes`,
          message: "검사에는 가능한 결과가 최소 하나 있어야 합니다.",
          testId: id,
        });
        return;
      }

      const outcomes: NormalizedOutcome[] = [];
      const outcomeIds = new Set<string>();
      value.outcomes.forEach((rawOutcome, outcomeIndex) => {
        const outcomePath = `${path}.outcomes[${outcomeIndex}]`;
        if (!isRecord(rawOutcome)) {
          findings.push({
            code: "invalid-outcome",
            path: outcomePath,
            message: `${outcomePath}는 결과 객체여야 합니다.`,
            testId: id,
          });
          return;
        }
        const outcomeId = normalizeId(rawOutcome.id);
        const rawLikelihoods = rawOutcome.likelihoodByHypothesis;
        if (!outcomeId || !isRecord(rawLikelihoods)) {
          findings.push({
            code: "invalid-outcome",
            path: outcomePath,
            message: "각 결과에는 ID와 가설별 가능도 객체가 필요합니다.",
            testId: id,
          });
          return;
        }
        if (outcomeIds.has(outcomeId)) {
          findings.push({
            code: "duplicate-outcome-id",
            path: `${outcomePath}.id`,
            message: `검사 '${id}' 안에서 결과 ID '${outcomeId}'가 중복되었습니다.`,
            testId: id,
            outcomeId,
          });
          return;
        }
        outcomeIds.add(outcomeId);

        const likelihoodByHypothesis = new Map<string, number>();
        let invalidLikelihood = false;
        for (const [rawHypothesisId, likelihood] of Object.entries(rawLikelihoods)) {
          const hypothesisId = normalizeId(rawHypothesisId);
          if (
            !hypothesisId ||
            !hypothesisIds.has(hypothesisId) ||
            typeof likelihood !== "number" ||
            !Number.isFinite(likelihood) ||
            likelihood < 0 ||
            likelihood > 1
          ) {
            invalidLikelihood = true;
            break;
          }
          if (likelihoodByHypothesis.has(hypothesisId)) {
            invalidLikelihood = true;
            break;
          }
          likelihoodByHypothesis.set(hypothesisId, likelihood);
        }
        if (
          invalidLikelihood ||
          likelihoodByHypothesis.size !== hypotheses.length ||
          hypotheses.some(({ id: hypothesisId }) => !likelihoodByHypothesis.has(hypothesisId))
        ) {
          findings.push({
            code: "invalid-probability-model",
            path: `${outcomePath}.likelihoodByHypothesis`,
            message: "각 결과는 모든 가설에 대해 0~1 범위의 가능도를 정확히 하나씩 가져야 합니다.",
            testId: id,
            outcomeId,
          });
          return;
        }
        outcomes.push({ id: outcomeId, likelihoodByHypothesis });
      });

      tests.push({ id, cost: value.cost, outcomes });
    });
  }

  if (findings.length > 0) return { status: "invalid", findings };

  for (const test of tests) {
    if (!Number.isFinite((rawCostPenalty as number) * test.cost)) {
      return {
        status: "invalid",
        findings: [
          {
            code: "invalid-test",
            path: `tests[id=${test.id}].cost`,
            message: "검사 비용과 costPenalty의 곱은 유한한 숫자여야 합니다.",
            testId: test.id,
          },
        ],
      };
    }
  }

  const priorTotal = hypotheses.reduce((total, { prior }) => total + prior, 0);
  if (
    hypotheses.some(({ prior }) => prior < 0 || prior > 1) ||
    Math.abs(priorTotal - 1) > PROBABILITY_TOLERANCE
  ) {
    return {
      status: "invalid",
      findings: [
        {
          code: "invalid-probability-model",
          path: "hypotheses[].prior",
          message: "사전확률은 각각 0~1 범위이고 합이 1이어야 합니다.",
        },
      ],
    };
  }

  for (const test of tests) {
    for (const hypothesis of hypotheses) {
      const likelihoodTotal = test.outcomes.reduce(
        (total, outcome) => total + outcome.likelihoodByHypothesis.get(hypothesis.id)!,
        0,
      );
      if (Math.abs(likelihoodTotal - 1) > PROBABILITY_TOLERANCE) {
        return {
          status: "invalid",
          findings: [
            {
              code: "invalid-probability-model",
              path: `tests[id=${test.id}].outcomes`,
              message: `가설 '${hypothesis.id}'에 대한 결과 가능도의 합은 1이어야 합니다.`,
              testId: test.id,
              hypothesisId: hypothesis.id,
            },
          ],
        };
      }
    }
  }

  return {
    status: "ready",
    input: {
      hypotheses,
      tests,
      costPenalty: rawCostPenalty as number,
    },
  };
}

function maxRegionMass(
  hypotheses: readonly DecisionHypothesis[],
  massByHypothesis: ReadonlyMap<string, number>,
): number {
  const massByRegion = new Map<string, number>();
  hypotheses.forEach(({ id, decisionRegionId }) => {
    massByRegion.set(
      decisionRegionId,
      (massByRegion.get(decisionRegionId) ?? 0) + (massByHypothesis.get(id) ?? 0),
    );
  });
  return Math.min(
    1,
    [...massByRegion.values()].reduce((maximum, mass) => Math.max(maximum, mass), 0),
  );
}

function expectedCorrectDecisionProbability(
  hypotheses: readonly DecisionHypothesis[],
  test: NormalizedTest,
): number {
  const expectedCorrect = test.outcomes.reduce((total, outcome) => {
    const jointMassByHypothesis = new Map<string, number>();
    hypotheses.forEach(({ id, prior }) => {
      jointMassByHypothesis.set(id, prior * outcome.likelihoodByHypothesis.get(id)!);
    });
    return total + maxRegionMass(hypotheses, jointMassByHypothesis);
  }, 0);
  return Math.min(1, expectedCorrect);
}

/**
 * Select a caller-supplied test by its expected reduction in decision-region error,
 * less an explicit caller-supplied cost penalty. This is a model-conditional pilot,
 * not a calibrated probability forecast or evidence-acquisition operation.
 */
export function selectDecisionFocusedTest(rawInput: unknown): DecisionTestSelection {
  const parsed = parseInput(rawInput);
  if (parsed.status !== "ready") return parsed;

  const { hypotheses, tests, costPenalty } = parsed.input;
  const priorMassByHypothesis = new Map(hypotheses.map(({ id, prior }) => [id, prior]));
  const baselineCorrectDecisionProbability = maxRegionMass(hypotheses, priorMassByHypothesis);
  const assessments = tests.map((test): DecisionTestAssessment => {
    const expectedCorrectDecisionProbabilityAfterTest = expectedCorrectDecisionProbability(
      hypotheses,
      test,
    );
    const expectedDecisionErrorReduction = Math.max(
      0,
      expectedCorrectDecisionProbabilityAfterTest - baselineCorrectDecisionProbability,
    );
    return {
      testId: test.id,
      expectedCorrectDecisionProbabilityAfterTest,
      expectedDecisionErrorReduction,
      cost: test.cost,
      netValue: expectedDecisionErrorReduction - costPenalty * test.cost,
    };
  });

  let best: DecisionTestAssessment | undefined;
  assessments.forEach((assessment) => {
    if (!best || assessment.netValue > best.netValue + POSITIVE_VALUE_TOLERANCE) {
      best = assessment;
    }
  });

  if (!best || best.netValue <= POSITIVE_VALUE_TOLERANCE) {
    return {
      status: "no-positive-value-test",
      baselineCorrectDecisionProbability,
      assessments,
      findings: [],
    };
  }
  return {
    status: "selected",
    selectedTestId: best.testId,
    baselineCorrectDecisionProbability,
    assessments,
    findings: [],
  };
}
