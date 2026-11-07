# REA BrainCore: Decision-Model Evidence, Calibration, and Evaluation Plan v0.1

**Plan ID:** `REA-BRAINCORE-DMEC-0.1`

**Status:** Evaluation protocol; no probability model is currently approved for plan-path use.

**Applies to:** `REA-BRAINCORE-DTS-0.1` and any future `REA-BRAINCORE-PIS-0.1` adapter.

## 1. Decision

The current selector's probability inputs are assumptions, not learned or verified REA forecasts. Do not connect them to planning until this plan's evidence, calibration, robustness, utility, and held-out evaluation gates pass for one narrowly defined task family.

If REA has no sufficient, independently labeled own-task data for a target family, the result is **not enough evidence**. Do not substitute synthetic results, model-generated labels, literature values from a different task, or one expert's point estimate and call the input calibrated.

This plan governs how evidence could make future probability inputs eligible. It does not authorize external search, Provider calls, paid APIs, data collection tools, execution, or memory writes.

## 2. Probability quantities and eligible claims

Keep these quantities distinct and define their conditioning information:

1. **Prior over hypotheses:** `P(H | information available before selecting a test)`. It must be evaluated against independently resolved hypothesis labels for the same task family and scope.
2. **Test-outcome likelihood:** `P(O | H, test, context known at planning time)`. It requires cases where the relevant hypothesis is independently known and the test outcome is recorded. A model's own judgment cannot be used as the ground-truth `H` label.
3. **Predicted outcome distribution:** `P(O | context)`, obtained by combining prior and likelihood. Evaluate it against actual observed outcomes as a separate forecast.
4. **Decision-region probability:** posterior mass over explicitly defined regions/actions. It is not the same as `supported`, `refuted`, `contested`, or `insufficient` evidence status.
5. **Test cost:** an observed or forecast resource quantity, not a probability. Record unit and uncertainty separately. Do not multiply unlike units by a free-form scalar and call the result a validated utility.

Every probability is conditional on a named target population/task family, information cutoff, scope, and model version. No generalization outside those boundaries is permitted without separate evidence.

## 3. Provenance and prediction ledger

For every forecast made before an outcome is known, record an immutable, replayable row with:

- prediction ID and timestamp / information cutoff;
- task family, task/episode ID, scope, and context features available at prediction time;
- hypothesis set and independently specified label schema;
- prior probability vector and its model version;
- candidate test, outcome space, conditional likelihood rows, and their model version;
- decision-region mapping and loss/cost-policy version;
- estimate origin (`empirical`, `expert-elicited`, or `synthetic`), data/evidence references, sample count, time window, method, and known limitations;
- uncertainty representation and how it was constructed;
- selected candidate or abstention, plus all eligible candidate scores;
- later observed outcome, label source, verification/adjudication status, and adjudication date;
- whether the record is development, calibration, or locked evaluation data.

Missing provenance, unverifiable labels, post-outcome input leakage, or conflicting label resolution excludes the row from calibration and triggers a data-quality finding. Preserve excluded rows and the reason; do not silently drop inconvenient outcomes.

### Evidence-origin rules

- **Synthetic records:** use for code/contract correctness and parameter sweeps only; never count them as empirical calibration evidence.
- **Expert-elicited probabilities:** label them as elicitation, retain the elicitation protocol/range, and never describe them as empirically calibrated. They may be used only in explicit sensitivity analysis until independently evaluated.
- **Empirical probabilities:** estimate from REA's own permitted, logged task outcomes with independently resolved labels. The same task episode, near-duplicate, or derived variant cannot leak across data partitions.
- **Unresolved open-world tasks:** retain as unresolved; do not invent a correct hypothesis label to increase sample size.

## 4. Data acquisition and labeling protocol

1. Choose one low-consequence, reversible planning task family and define its hypotheses, action/decision regions, candidate tests, outcome vocabulary, and loss scope before collecting calibration outcomes.
2. Use only REA-owned task records and synthetic fixtures during this core-only stage, subject to the applicable privacy, sensitivity, and retention policy. Minimize sensitive fields and keep evaluation data local. Do not call external models or use external search to create labels.
3. Resolve outcomes independently of the probability model. Prefer deterministic known-answer tasks or an adjudication protocol fixed before labels are examined. Record disagreements and resolution rather than using the selector's output as its own judge.
4. Log the forecast before the outcome is observed. Retrospective forecasts reconstructed after seeing outcomes are not valid calibration rows.
5. Record missing, censored, delayed, and unobservable outcomes explicitly. Define how each is handled before scoring; do not treat missing as a negative result.
6. Keep a complete data manifest with version, hashes, task grouping, label source, split assignment, exclusions, and reasons.

If a task family cannot yield independently resolvable hypothesis labels and test outcomes, it is not yet eligible for prior/likelihood calibration under this plan.

## 5. Data partitions and leakage controls

Maintain three disjoint roles:

- **Development:** design the model, select features, debug algorithms, and define candidate variants.
- **Calibration:** fit any permitted post-hoc probability calibration and choose the uncertainty method.
- **Locked evaluation:** evaluate the frozen model, calibration, selection policy, and thresholds once for a release decision.

Partition by task episode and underlying scenario, not by individual row. Where tasks drift over time, use a chronological holdout. Near-duplicate prompts, shared source records, or alternate phrasings of one scenario must remain in the same partition. Freeze and hash the split manifest before evaluating.

Determine the needed sample size prospectively from the task's maximum acceptable calibration-interval width and decision-harm tolerance. There is no universal fixed row count. If the locked evaluation cannot estimate those quantities precisely enough, report **insufficient evidence** and do not integrate.

## 6. Calibration and predictive-skill measurements

Report each metric separately by task family and by any decision-relevant subgroup with adequate sample size. Always include denominators and uncertainty intervals.

### 6.1 Priors and predicted outcome distributions

For multiclass probability vectors with independently known labels, report:

- multiclass Brier score: `mean_i sum_k (p_ik - 1[y_i = k])^2`;
- logarithmic score: `mean_i -log(p_i,true_label)`, with any clipping rule fixed before evaluation;
- reliability/calibration-in-the-large and classwise calibration plots with uncertainty bands;
- the same metrics for an empirical base-rate / no-context baseline.

### 6.2 Conditional test likelihoods

Within cases where the relevant hypothesis is independently known, score `P(outcome | hypothesis, test, context)` against the observed test outcome using the same proper scores and report calibration by decision-relevant probability range. Also evaluate the marginal predicted test-outcome distribution. Do not claim likelihood calibration from cases whose hypothesis label was inferred by the same system being evaluated.

### 6.3 Calibration diagnostics

Use reliability diagrams and proper scoring rules together. For probability calibration, the CORP approach (or another pre-specified statistically justified method) may be used to avoid arbitrary binning artifacts and to report uncertainty. Do not use Expected Calibration Error alone as the acceptance metric, and do not treat a good overall score as proof of calibration in every subgroup.

Report both:

- **calibration:** whether forecasts at a stated probability match observed frequencies within a predeclared tolerance; and
- **discrimination / skill:** whether the forecasts improve prediction over an appropriate base-rate comparator.

A calibrated but uninformative model is not enough to justify selecting tests; a skillful but miscalibrated model is also not enough.

### 6.4 Cost model

Compare predicted cost with observed cost in its stated unit. Report bias, absolute error, and interval coverage if cost uncertainty is modeled. Keep time, monetary cost, privacy exposure, risk, and user effort separate unless an approved utility policy explicitly converts them. Unknown cost or unknown conversion means abstain.

## 7. Uncertainty and robustness evaluation

- Estimate uncertainty using a method appropriate to grouped task data; use task/episode-clustered resampling or another predeclared method. Report intervals, not point estimates alone.
- Preserve joint probability constraints: priors remain on the simplex, and each conditional outcome-likelihood row sums to one. Do not form invalid combinations by independently choosing incompatible interval endpoints.
- Construct a documented plausible joint uncertainty set for each model version. Include estimation uncertainty, label ambiguity where allowed, and task-family drift supported by data.
- For every candidate, calculate the conservative lower bound on net value over that set. Recommend only when the lower bound is strictly positive and the choice remains stable under all declared stress scenarios.
- Stress at minimum: prior shifts across the supported range; likelihood overstatement/understatement; outcome labels with adjudication uncertainty; task-family or time shift; cost underestimation; ties; and missing outcome data.
- If the recommendation changes, net value crosses zero, or expected harm exceeds the task's predeclared bound in any plausible scenario, the result is `needs-information`/abstention for that use case.

The current 0.10-prior example demonstrates why this is a hard gate: assuming test reliability 0.99 but encountering actual reliability 0.80 can make the downstream signal-following policy worse than taking the prior-dominant action. A point-estimate selector cannot protect against this by input validation alone.

## 8. Decision-selection evaluation

On the locked evaluation partition, compare the full advisory policy with:

1. no additional test (current best decision region);
2. a fixed or deterministic candidate order;
3. entropy-reduction selection using the same candidate set and information budget;
4. an oracle upper bound computed only for analysis from independently known outcomes, never used at runtime.

Report per task and aggregate:

- realized decision error / utility after the test outcome;
- net utility after observed test cost under the predeclared loss policy;
- regret versus no-test and each operational baseline;
- test selection frequency, abstention rate, unresolved outcome rate, and subgroup results;
- 95% uncertainty intervals clustered by task/episode, with sample denominators;
- worst observed harm cases and sensitivity to label/model perturbation.

The comparison must use paired tasks and equal information/cost budgets where applicable. The policy may be integrated only if it meets a predeclared minimum-benefit criterion against no-test and does not exceed a predeclared maximum-harm criterion. Set these thresholds with the task owner before opening the locked set; this plan intentionally does not invent universal numeric tolerances.

## 9. Approval gates

A probability-input model is eligible for one named task family only when all are true:

1. provenance and label completeness meet the task's predeclared coverage requirement;
2. labels are independently resolved and data splits are leakage-controlled;
3. calibration confidence bounds meet the predeclared tolerance in the decision-relevant range;
4. predictive skill is adequate against the base-rate baseline;
5. uncertainty sets are coherent, data-supported, and broad enough to cover measured estimation uncertainty;
6. robustness lower bounds remain positive for recommendations, or the system abstains;
7. decision-policy benefit meets the predeclared held-out criterion and maximum-harm bound;
8. cost units and conversion policy are approved and measured;
9. independent review of the data manifest, evaluation code, and failure cases is complete.

Passing one task family does not qualify another. Refit, new calibration, changed hypothesis definitions, altered costs, new evidence sources, or distribution shift require a new version and evaluation. Failed gates remain recorded; do not relax thresholds after seeing held-out results.

## 10. Required artifacts before any planning-path connection

- versioned decision/action and loss definition;
- provenance-complete forecast ledger and independently resolved labels;
- data manifest, split manifest, and hash-locked evaluation set;
- frozen prior/likelihood/cost model versions with joint uncertainty sets;
- calibration and skill report with denominators and confidence intervals;
- sensitivity and misspecification report, including abstention cases;
- paired decision-selection benchmark against the baselines above;
- signed task-family-specific gate decision and rollback/disable plan;
- the plan-information adapter contract and tests required by `REA-BRAINCORE-PIS-0.1`.

Until those artifacts exist and pass review, BrainCore should continue using explicit non-probabilistic judgments and the isolated synthetic decision-test experiment only.
