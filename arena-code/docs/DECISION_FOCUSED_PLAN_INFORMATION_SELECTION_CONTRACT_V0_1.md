# REA BrainCore: Plan Information-Selection Integration Contract v0.1

**Contract ID:** `REA-BRAINCORE-PIS-0.1`

**Status:** Normative integration design; **not yet implemented or authorized for runtime connection**.

**Depends on:** `REA-BRAINCORE-IC-0.1`, `REA-BRAINCORE-HSET-0.1`, `REA-BRAINCORE-DTS-0.1`, and the probability-input evaluation gates in [`DECISION_MODEL_EVIDENCE_CALIBRATION_EVALUATION_PLAN_V0_1.md`](DECISION_MODEL_EVIDENCE_CALIBRATION_EVALUATION_PLAN_V0_1.md).

## 1. Purpose

When all eligibility gates are met, provide a caller with an advisory recommendation for which already-planned information need or local test to consider next, based on its expected effect on a clearly defined decision region, model uncertainty, and declared cost.

The integration must advance REA's own planning and evidence-validation capabilities. It is not a search feature, tool selector, autonomous collector, or mechanism for declaring a hypothesis true.

## 2. Current no-go decision

The v0.1 pilot `selectDecisionFocusedTest` is **not ready to be called from the BrainCore planning path**. It accepts point priors, point outcome likelihoods, equal 0–1 loss over decision regions, and a scalar cost penalty supplied by the caller. It does not verify the empirical basis or calibration of those values and has no uncertainty-set robustness guarantee. The synthetic misspecification probe shows that a downstream policy following an assumed 0.99 test reliability can lose 10 percentage points of expected correctness if actual reliability is 0.80 in the constructed case.

Keep the current function as a pure, isolated experiment until every gate in §8 passes. Do not treat its current TypeScript input validation as statistical validation.

## 3. Integration boundary

### Included

- Consider only a finite list of caller-supplied, already-planned candidate information needs/tests.
- Require each candidate to map to one or more existing `InformationNeed.id` and `CollectionStep.id` values, or to an explicitly allowed caller-mediated question/local computation.
- Use a validated, versioned model snapshot to estimate whether an outcome may change the preferred decision region.
- Return, at most, one **recommendation to the caller** with its model, evidence, cost, and uncertainty references.
- Permit a later, new invocation after the caller supplies evidence or revises the plan.

### Excluded

- Generating hypotheses, action alternatives, information needs, tests, sources, or collection steps.
- Searching, browsing, calling Providers, executing tools, delegating work, acquiring evidence, or writing memory.
- Changing the plan, deleting or downgrading required information needs, changing authorization, or automatically invoking judgment.
- Treating selection as evidence, verification, or authorization.
- Mapping `supported`, `refuted`, `contested`, or `insufficient` directly to a decision region. These are evidence-judgment statuses, not action semantics.

During the current core-only phase, candidates must be caller-supplied and limited to local computation or caller-mediated information requests. The recommendation does not dispatch either one. External or paid actions remain outside this contract and require a separate future decision.

## 4. Required input contract

The runtime adapter may not pass raw caller probabilities directly to `selectDecisionFocusedTest`. It must first validate the following information and retain references to it:

1. **Plan link:** candidate ID, `informationNeedId`, `collectionStepId`, expected scope/time, acceptable evidence kind, and the planned verification step.
2. **Hypothesis/action model:** finite hypothesis IDs and an explicit mapping from every hypothesis to a decision region defined by the task owner. The mapping must not be inferred from evidence-judgment status.
3. **Prior model:** estimates and joint uncertainty set, task-family applicability, training/estimation data reference, observation window, sample size, model version, and known limitations.
4. **Outcome model:** for each candidate test, the outcome space and `P(outcome | hypothesis)` estimates, with the same provenance, sample, scope, and version fields. The probability rows must be jointly coherent and sum to one within a declared numerical tolerance.
5. **Uncertainty representation:** a validated joint set or distribution over priors and outcome likelihoods. Intervals must respect simplex constraints; independently combining interval endpoints in a way that violates probability normalization is not allowed.
6. **Loss/cost policy:** versioned decision loss and cost definitions, units, authority, and applicability. Unknown, incomparable, or high-consequence costs make the input ineligible.
7. **Boundary authorization:** a declaration that candidate actions meet the current local/caller-mediated boundary. This is not execution authorization.

Every probability/cost datum must have an evidence or dataset reference. If references, applicability, or uncertainty are missing, return `needs-information` or `blocked` without a recommendation. A syntactically valid probability vector without a documented empirical basis is not an eligible model.

## 5. Decision and selection rule

### Initial eligible use

The first integrated use is restricted to **low-consequence, reversible prioritization of information gathering**. It does not make the downstream substantive decision. If the task has asymmetric, irreversible, safety-sensitive, or otherwise high-consequence outcomes, the equal-loss v0.1 selector is ineligible; a separately reviewed utility model would be required.

For an eligible model, compare:

- the best decision region without a new test; and
- the expected decision utility after each candidate test, under its possible outcomes.

A test is recommendable only when its **conservative net value remains strictly positive across the validated joint uncertainty set**:

```text
robustNetValue(test) = inf over eligible model parameters θ of netValue(test; θ)
recommend test* only if robustNetValue(test*) > 0
                 and test* is the unique best candidate throughout the set
```

The uncertainty set and loss/cost policy must be versioned and justified. A point estimate alone is insufficient. If the set cannot be constructed, the best candidate changes across plausible models, or a tie remains after the predeclared tie tolerance, abstain rather than choosing arbitrarily.

Until a task-specific utility contract has been accepted, the only permitted interpretation is the pilot's equal 0–1 loss across decision regions, for low-risk prioritization only. Its `costPenalty` cannot be chosen ad hoc at invocation time; it must be derived from a documented, versioned policy. If that conversion is unavailable, return `needs-information`.

## 6. Output and state behavior

An integration result is a recommendation object, not a modified plan. It must include:

- status: `recommended`, `no-positive-value`, `needs-information`, `blocked`, or `invalid`;
- selected candidate ID and linked plan IDs only when `recommended`;
- baseline and conservative expected decision-utility change;
- uncertainty/model-set reference, prior/likelihood model versions, and cost-policy version;
- a concise rationale and the main assumptions/limitations;
- a `callerActionRequired: true` marker for any recommendation that asks for new information.

For all non-recommendation statuses, expose no selected candidate. Ties must be deterministic; unresolved ties or unstable selection across the validated uncertainty set result in abstention rather than arbitrary selection.

The returned object must not mutate `PreparationPlan`, `InformationNeed.required`, `CollectionPlan`, `ToolExecutionPolicy`, or evidence. A recommendation never satisfies a required information need. The existing `inspectPreJudgmentReadiness` and evidence provenance checks remain authoritative; judgment is still a separate caller-mediated invocation after required evidence is supplied.

## 7. Failure and abstention rules

Return without recommendation when any of these apply:

- missing or invalid plan references, hypothesis-to-region mappings, probabilities, provenance, or cost policy;
- insufficient data or an uncertainty set too wide to establish positive conservative net value;
- the selected candidate changes under plausible model perturbations;
- all candidates have non-positive conservative net value;
- a candidate requires an external/paid tool, unapproved execution, or an unplanned source;
- the task exceeds the low-consequence reversible-prioritization scope;
- mandatory evidence, readiness, or authorization constraints would be bypassed.

The safe default is no recommendation, not a fabricated likelihood, default cost, or forced next step.

## 8. Integration acceptance gates

Do not wire the adapter into the planning path until all gates pass and the user-facing behavior is reviewed:

1. **Semantic gate:** the task owner defines action/decision regions and confirms the loss scope; no judgment status is used as a proxy.
2. **Evidence gate:** every prior and outcome likelihood has traceable, scope-appropriate data and an uncertainty representation accepted under the companion evaluation plan.
3. **Calibration gate:** calibration and predictive-skill criteria are met on locked, independently labeled evaluation data for the intended task family; uncertainty is reported.
4. **Robustness gate:** conservative net value is positive over the declared joint uncertainty set; stress cases with miscalibrated priors/likelihoods abstain or do not cause unacceptable harm.
5. **Utility gate:** cost units and penalty conversion are documented and versioned; a sensitivity analysis covers cost misspecification.
6. **Plan gate:** candidate IDs link to existing plan items, required needs remain required, and no collection/execution occurs automatically.
7. **Evaluation gate:** on a locked held-out set, the advisory method meets predeclared improvement and maximum-harm criteria against no-test, fixed-order, and entropy-based baselines. Thresholds are set before inspecting held-out results.
8. **Purity gate:** unit/contract tests, source review, and replay confirm determinism, input immutability, no I/O/network/Provider/tool/memory effects, and no bypass of current readiness/provenance checks.
9. **Rollout gate:** first run in shadow/advisory mode; keep the existing plan unchanged, record both recommendation and baseline, and review failures before considering any broader use.

## 9. Required tests for a future adapter

- valid, source-backed and calibrated input can recommend only a plan-linked candidate;
- missing provenance, unknown model applicability, or broad uncertainty abstains;
- decision-region mapping is explicit and invalid mappings stop;
- `supported`/`refuted` labels are never implicitly converted to actions;
- high-consequence/asymmetric-loss cases are blocked under the v0.1 equal-loss scope;
- a required information need remains required after recommendation;
- recommendation alone cannot pass pre-judgment or evidence readiness;
- external/paid/unapproved candidates are not dispatched or recommended;
- cost and probability perturbations are replayable and produce the documented robust result;
- repeated calls are deterministic, inputs are not mutated, and source review finds no side effects.

## 10. Current next action

The next authorized work is to complete the companion probability-data and calibration protocol, define a low-risk target task family and its decision regions, and build a provenance-complete evaluation fixture. No planning-path code integration is authorized by this contract alone.
