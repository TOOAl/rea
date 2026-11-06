# REA BrainCore: Internal Cognition-Cycle Contract v0.1

**Contract ID:** `REA-BRAINCORE-IC-0.1`

**Status:** First bounded contract for the existing `src/brainCore` path.

**Purpose:** Fix one small, reproducible reasoning slice in REA's own brain core without claiming general reasoning or intelligence capability.

## Contract decision

v0.1 is a **single-pass, closed-evidence atomic-claim judgment**. It accepts a caller-supplied task/preparation plan, one structured target claim, and structured evidence; validates readiness and evidence-to-plan links; then compares explicit claim fields. Its only feedback edge is a non-judged readiness result. A caller may correct or add input and invoke it again; this contract does not acquire the input or perform the update.

Canonical entry point:

```ts
judgeAtomicClaimAfterPreparation(
  rawPlan,
  rawPolicy,
  rawClaim,
  rawEvidence,
  rawToolCatalog?,
)
```

It reuses existing `PreparationPlan`, `ToolExecutionPolicy`, `AtomicClaim`, `ClaimEvidence`, and `PreparedJudgmentAttempt` types. It introduces no parallel planner, task, memory, or agent architecture.

## Included behavior

- Validate the supplied plan, policy, claim, and evidence structure.
- Check that each evidence item's `informationNeedId` and `collectionStepId` exist in the plan, that the step covers that need, and that every required need has evidence.
- Compare only explicit claim fields: `subject`, `predicate`, `object`, `polarity`, `scope`, and `timeScope`.
- Return structured results retaining evidence IDs, source IDs, plan links, and comparison reasons.
- Stop without judgment when readiness, policy, or provenance checks fail.

## Explicit exclusions

- Generating/revising tasks, plans, needs, hypotheses, or claims.
- Evidence collection, search/browsing, Provider or paid-model calls, tool execution, or delegated work.
- Verifying that a `sourceId` is real, that evidence accurately represents its source, or that a source is authoritative or reusable. Provenance validation here checks **internal ID relationships only**.
- Natural-language interpretation, semantic equivalence, world-model inference, confidence scoring, voting, or learning.
- Persistent task state, memory writes, automatic retries, replanning, or rollback.

This is a bounded reasoning primitive with an input-feedback edge, **not** an autonomous end-to-end cognition loop or evidence of general brain capability.

## Input and policy contract

A conforming invocation supplies:

1. A `PreparationPlan` with a non-empty task definition, information needs, collection plan, and constraints.
2. A tool-free plan: no selected tools or use steps, with an explicit `noToolRequiredReason`.
3. `ToolExecutionPolicy` constrained to `allowedBoundaries: ["local"]`, `allowPaidTools: false`, `approvedToolIds: []`, and `executionAuthorized: false`.
4. One non-empty `AtomicClaim` with all five text fields non-blank and polarity `positive` or `negative`.
5. At least one `ClaimEvidence` item with a unique non-blank evidence ID, non-blank source ID, non-blank need and step IDs, and a complete structured claim.
6. Evidence links satisfying the provenance rules above.

Evidence is caller-supplied; the cycle does not retrieve or authenticate it. `sourceId` is an attribution handle, not proof of identity or truth.

## Per-invocation states

These are transient outcomes, not persisted state-machine records:

```text
provided input
  ├─ malformed/duplicate/unresolved links ───────────────> invalid
  ├─ policy violation or ineligible selection ───────────> blocked
  ├─ required fields/evidence are absent ────────────────> needs-information
  ├─ tool choice is required but unresolved ─────────────> needs-tool-selection
  └─ plan + policy + claim + evidence are ready ─────────> judged
                                                            ├─ supported
                                                            ├─ refuted
                                                            ├─ contested
                                                            └─ insufficient
```

Only `judged` contains a `JudgmentResult`. Every other result is a stop: do not emit a partial judgment or silently repair input. Re-entry occurs only when a caller supplies corrected/additional input in a new invocation. The no-tool policy keeps `toolExecutionPermitted` false while allowing the pure in-memory comparison to return `judged`; judgment is not tool execution.

## Judgment semantics

Readiness normalizes text to Unicode NFC and trims it; comparison is case-insensitive exact string comparison. No synonym or semantic inference is performed.

- Exact match on subject, predicate, object, scope, and time scope, with the same polarity → `supports` (`claim-match`).
- Exact match on those five fields, with opposite polarity → `contradicts` (`polarity-conflict`).
- A mismatch in those fields → `not-comparable`, recording the first differing field.
- Any support and any contradiction → `contested`.
- Support without contradiction → `supported`; contradiction without support → `refuted`.
- No comparable support or contradiction → `insufficient`; non-comparable items remain listed.

These labels describe comparison against **supplied structured evidence only**. `refuted` does not establish that a real-world proposition is false; `supported` does not independently establish that it is true.

## Observable invariants and acceptance criteria

The contract is accepted only when all criteria hold:

1. **Ready path:** complete tool-free plan and linked evidence can reach `judged` while `toolExecutionPermitted` remains false.
2. **Readiness gate:** missing plan, claim, or evidence does not reach judgment.
3. **Provenance gate:** unknown need/step IDs, a step that does not cover its need, or missing evidence for a required need does not reach judgment.
4. **Input integrity:** malformed and duplicate evidence IDs are rejected rather than silently skipped.
5. **Outcome matrix:** support, contradiction, mixed, and non-comparable evidence produce the specified outcomes and retain their IDs.
6. **Re-entry:** a stopped invocation remains stopped; after the caller supplies the missing evidence, a new invocation can reach judgment.
7. **Purity and boundary:** identical inputs produce identical results; inputs are read-only; source review confirms no acquisition, network, filesystem, Provider, tool-execution, delegation, or persistent-write side effects.
8. **Truthfulness:** report exact structured comparison over caller-supplied evidence, not semantic verification or demonstrated general capability.

### Test evidence

- `tests/brainCorePlanning.test.ts` — plan readiness, tool selection, and policy gates.
- `tests/brainCoreReadiness.test.ts` — claim/evidence validation and duplicate/missing-input behavior.
- `tests/brainCorePreJudgment.test.ts` — integrated ready path and provenance gates.
- `tests/brainCoreJudgment.test.ts` — explicit comparison and aggregate outcomes.
- `tests/brainCoreToolCatalog.test.ts` — catalog and tool-eligibility boundaries.
- `tests/brainCoreCycleContract.test.ts` — whole-path determinism, read-only inputs, no-tool authorization, non-comparable evidence retention, and caller-mediated re-entry.
- `evals/brainCore-v0.1/known-answer-cases.json` + `scripts/brainCoreKnownAnswerEval.ts` — standalone, visible synthetic input/expected-output fixture and provider-free evaluator, separate from unit-test assertions; run with `npx tsx scripts/brainCoreKnownAnswerEval.ts` from `arena-code/`.

The six-file BrainCore suite passed on 2026-11-07: **33 tests**. The separate known-answer evaluator passed **12/12** cases (exact support, polarity conflict, mixed evidence, field mismatches, non-comparable retention, missing evidence, and invalid provenance/IDs). These are visible synthetic contract regressions—not held-out evaluation, real-source verification, or a general capability score. Source review remains required for the closed-boundary criterion.

## Change control / next gate

Do not enlarge this contract by implication. Generated planning, evidence acquisition, memory mutation, learning, retries/replanning, semantic reasoning, and tool execution each require a separate input/output contract, failure/rollback behavior, and independent acceptance tests before implementation. Keep REA's own brain capabilities as the north star; tools and source-research tasks are supporting means, not the objective.
