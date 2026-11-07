# REA BrainCore: Decision-Focused Test Selection Experiment v0.1

**Experiment ID:** `REA-BRAINCORE-DTS-0.1`

**Status:** Isolated synthetic pilot; not integrated into the cognition cycle.

## Purpose

Select one caller-supplied test when its modeled outcomes are expected to reduce the chance of choosing the wrong decision region, accounting for an explicit test-cost penalty. The experiment tests the literature-derived idea that decision-relevant information can be more useful than information that merely distinguishes hypotheses.

This is an auxiliary pure function. It does not modify the v0.1 judgment or finite-hypothesis contracts.

## Input model

- At least two hypotheses, each with a unique non-empty ID, a caller-supplied prior, and one decision-region ID.
- At least one candidate test with a unique ID, non-negative caller-defined cost, and one or more possible outcomes.
- Each outcome supplies `P(outcome | hypothesis)` for every hypothesis. For each hypothesis, the probabilities across one test's outcomes must sum to 1.
- `costPenalty` converts the caller's cost units to decision-error probability units.
- Priors must be in `[0, 1]` and sum to 1.

IDs are normalized to NFC and trimmed before uniqueness checks. Every malformed or incomplete probability model is rejected; no silent renormalization occurs.

## Selection rule

Assume equal 0–1 loss across decision regions. The baseline probability of choosing the correct region is the prior mass of the most probable region. For each test, compute its expected post-test correct-region probability from the caller-supplied priors and outcome likelihoods. Then compute:

```text
expectedDecisionErrorReduction = max(0, expectedCorrectAfterTest - baselineCorrect)
netValue = expectedDecisionErrorReduction - costPenalty * testCost
```

Select the test with the greatest positive net value. Exact or near ties retain input order. If no test has positive net value, return `no-positive-value-test`; do not force a query.

The returned expectation is conditional on the supplied model. It is not a calibrated probability that any real-world hypothesis is true.

## Boundaries

- No prior or outcome likelihood is learned, inferred, or verified by this function.
- No evidence retrieval, question generation, execution, persistence, Provider call, or tool call occurs.
- No hypothesis is ranked, selected, or declared true.
- Costs and equal loss across decision regions are caller assumptions; the experiment does not establish that these assumptions are appropriate for a real task.
- This is a one-step selector, not the multi-step Bayesian active-learning algorithm or its guarantee from the cited paper.
- The function is not wired into `evaluateHypothesisSetAfterPreparation` or the cognition-cycle entry point.

## Synthetic discriminating case

Three hypotheses have priors `0.45, 0.45, 0.10`. The first two map to one decision region; the third maps to another.

- `detail-within-action` distinguishes the first two hypotheses, yielding more outcome entropy, but cannot change the best decision region.
- `cross-decision-boundary` distinguishes the two decision regions, yielding less outcome entropy but a modeled decision-error reduction of `0.10`.

The expected behavior is to choose `cross-decision-boundary`, while a pure outcome-entropy heuristic would prefer `detail-within-action`. This is a fixture-specific property, not an empirical utility claim.

## Acceptance criteria

1. Invalid priors, incomplete likelihood maps, out-of-range probabilities, and non-normalized likelihoods return `invalid`.
2. Missing/undersized hypothesis sets or an empty/missing test list return `needs-information`.
3. A test that only distinguishes hypotheses within the same decision region has zero decision-error reduction.
4. The selector prefers a decision-boundary test over a higher-entropy within-region test in the synthetic discriminating case.
5. A cost penalty that consumes all modeled benefit returns `no-positive-value-test`.
6. Ties are deterministic and preserve candidate input order; inputs are not mutated.
7. Evaluation is local and deterministic with no I/O or side effects.

## Run

```sh
npx vitest run tests/brainCoreDecisionTests.test.ts
```
