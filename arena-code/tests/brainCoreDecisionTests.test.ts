import { describe, expect, it } from "vitest";
import { selectDecisionFocusedTest } from "../src/brainCore/index.js";
import type { DecisionTestSelectionInput } from "../src/brainCore/index.js";

const input: DecisionTestSelectionInput = {
  hypotheses: [
    { id: "H-a", prior: 0.45, decisionRegionId: "continue" },
    { id: "H-b", prior: 0.45, decisionRegionId: "continue" },
    { id: "H-c", prior: 0.1, decisionRegionId: "stop" },
  ],
  tests: [
    {
      id: "detail-within-action",
      cost: 0,
      outcomes: [
        {
          id: "x",
          likelihoodByHypothesis: { "H-a": 1, "H-b": 0, "H-c": 1 },
        },
        {
          id: "y",
          likelihoodByHypothesis: { "H-a": 0, "H-b": 1, "H-c": 0 },
        },
      ],
    },
    {
      id: "cross-decision-boundary",
      cost: 0,
      outcomes: [
        {
          id: "continue",
          likelihoodByHypothesis: { "H-a": 1, "H-b": 1, "H-c": 0 },
        },
        {
          id: "stop",
          likelihoodByHypothesis: { "H-a": 0, "H-b": 0, "H-c": 1 },
        },
      ],
    },
  ],
  costPenalty: 0,
};

function outcomeEntropy(test: DecisionTestSelectionInput["tests"][number]): number {
  const outcomes = test.outcomes.map(({ likelihoodByHypothesis }) =>
    input.hypotheses.reduce(
      (mass, hypothesis) => mass + hypothesis.prior * (likelihoodByHypothesis[hypothesis.id] ?? 0),
      0,
    ),
  );
  return outcomes.reduce(
    (entropy, probability) =>
      probability === 0 ? entropy : entropy - probability * Math.log2(probability),
    0,
  );
}

describe("REA-BRAINCORE-DTS-0.1 experiment", () => {
  it("prefers information that separates decisions over greater within-decision entropy", () => {
    const result = selectDecisionFocusedTest(input);

    expect(outcomeEntropy(input.tests[0]!)).toBeGreaterThan(outcomeEntropy(input.tests[1]!));
    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.selectedTestId).toBe("cross-decision-boundary");
      expect(result.baselineCorrectDecisionProbability).toBeCloseTo(0.9);
      expect(result.assessments).toHaveLength(2);
      expect(result.assessments[0]).toEqual({
        testId: "detail-within-action",
        expectedCorrectDecisionProbabilityAfterTest: 0.9,
        expectedDecisionErrorReduction: 0,
        cost: 0,
        netValue: 0,
      });
      expect(result.assessments[1]?.testId).toBe("cross-decision-boundary");
      expect(result.assessments[1]?.expectedCorrectDecisionProbabilityAfterTest).toBeCloseTo(1);
      expect(result.assessments[1]?.expectedDecisionErrorReduction).toBeCloseTo(0.1);
      expect(result.assessments[1]?.cost).toBe(0);
      expect(result.assessments[1]?.netValue).toBeCloseTo(0.1);
    }
  });

  it("returns no-positive-value-test when every test's decision benefit is consumed by cost", () => {
    const result = selectDecisionFocusedTest({
      ...input,
      tests: input.tests.map((test) => ({ ...test, cost: 1 })),
      costPenalty: 0.2,
    });

    expect(result.status).toBe("no-positive-value-test");
    if (result.status === "no-positive-value-test") {
      expect(result.assessments[1]?.netValue).toBeCloseTo(-0.1);
    }
  });

  it("computes expected decision benefit for a stochastic caller-supplied test model", () => {
    const stochasticTest = {
      hypotheses: [
        { id: "H-left", prior: 0.5, decisionRegionId: "left" },
        { id: "H-right", prior: 0.5, decisionRegionId: "right" },
      ],
      tests: [
        {
          id: "noisy-sign",
          cost: 0,
          outcomes: [
            { id: "left", likelihoodByHypothesis: { "H-left": 0.75, "H-right": 0.25 } },
            { id: "right", likelihoodByHypothesis: { "H-left": 0.25, "H-right": 0.75 } },
          ],
        },
      ],
      costPenalty: 0,
    };

    const result = selectDecisionFocusedTest(stochasticTest);
    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.baselineCorrectDecisionProbability).toBeCloseTo(0.5);
      expect(result.assessments[0]?.expectedCorrectDecisionProbabilityAfterTest).toBeCloseTo(0.75);
      expect(result.assessments[0]?.expectedDecisionErrorReduction).toBeCloseTo(0.25);
    }
  });

  it("does not select a test that only distinguishes hypotheses in the same decision region", () => {
    const withinRegionOnly = {
      hypotheses: [
        { id: "H-a", prior: 0.5, decisionRegionId: "same" },
        { id: "H-b", prior: 0.5, decisionRegionId: "same" },
      ],
      tests: [
        {
          id: "split-hypotheses",
          cost: 0,
          outcomes: [
            { id: "a", likelihoodByHypothesis: { "H-a": 1, "H-b": 0 } },
            { id: "b", likelihoodByHypothesis: { "H-a": 0, "H-b": 1 } },
          ],
        },
      ],
      costPenalty: 0,
    };

    expect(selectDecisionFocusedTest(withinRegionOnly).status).toBe("no-positive-value-test");
  });

  it("requires normalized priors and complete normalized test likelihoods", () => {
    const invalidPrior = selectDecisionFocusedTest({
      ...input,
      hypotheses: input.hypotheses.map((hypothesis) => ({ ...hypothesis, prior: 0.3 })),
    });
    expect(invalidPrior.status).toBe("invalid");

    const invalidLikelihood = structuredClone(input);
    invalidLikelihood.tests[0]!.outcomes[0]!.likelihoodByHypothesis["H-a"] = 0.7;
    const invalidModel = selectDecisionFocusedTest(invalidLikelihood);
    expect(invalidModel.status).toBe("invalid");
    if (invalidModel.status === "invalid") {
      expect(invalidModel.findings.some(({ code }) => code === "invalid-probability-model")).toBe(
        true,
      );
    }

    const overflowCost = selectDecisionFocusedTest({
      ...input,
      tests: input.tests.map((test) => ({ ...test, cost: 1e308 })),
      costPenalty: 1e308,
    });
    expect(overflowCost.status).toBe("invalid");
  });

  it("returns needs-information for absent candidates and rejects malformed top-level arrays", () => {
    expect(selectDecisionFocusedTest({ tests: input.tests, costPenalty: 0 }).status).toBe(
      "needs-information",
    );
    expect(
      selectDecisionFocusedTest({
        hypotheses: input.hypotheses,
        tests: [],
        costPenalty: 0,
      }).status,
    ).toBe("needs-information");
    expect(
      selectDecisionFocusedTest({ hypotheses: null, tests: input.tests, costPenalty: 0 }).status,
    ).toBe("invalid");
  });

  it("is deterministic and does not mutate caller input", () => {
    const mutableInput = structuredClone(input);
    const before = structuredClone(mutableInput);
    const run = () => selectDecisionFocusedTest(mutableInput);

    expect(run()).toEqual(run());
    expect(mutableInput).toEqual(before);
  });
});
