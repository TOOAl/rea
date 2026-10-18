import type { BrainConfig } from "./config.ts";
import type {
  BrainResult,
  Claim,
  Conclusion,
  EvidenceItem,
  TaskType,
  Verdict,
} from "./contracts.ts";
import type { LlmProvider } from "./providers/provider.ts";
import type { Collector } from "./collector.ts";
import { ModelRouter } from "./router.ts";
import { Verifier } from "./verifier.ts";
import { LessonStore } from "./lessons.ts";
import { FailureStore } from "./failures.ts";
import { CredibilityModel } from "./credibility.ts";
import { AdjudicationLog } from "./adjudications.ts";
import {
  StrategyRegistry,
  type StrategyName,
  type StrategyPlan,
} from "./strategies.ts";

export interface BrainDeps {
  config: BrainConfig;
  provider: LlmProvider;
  collector: Collector;
  lessons: LessonStore;
  failures: FailureStore;
  credibility: CredibilityModel;
  adjudications: AdjudicationLog;
  strategies: StrategyRegistry;
}

// The brain: command intake, planning, delegation, model routing,
// strategy selection, reasoning, verification, and fail-closed withholding.
export class Brain {
  private deps: BrainDeps;
  private router: ModelRouter;
  private verifier: Verifier;

  constructor(deps: BrainDeps) {
    this.deps = deps;
    this.router = new ModelRouter(deps.config);
    this.verifier = new Verifier({
      provider: deps.provider,
      judgeModel: deps.config.models.judge,
      passConfidence: deps.config.thresholds.passConfidence,
      judgeMinAgreement: deps.config.thresholds.judgeMinAgreement,
      claimSupportMin: deps.config.thresholds.claimSupportMin,
      credibility: deps.credibility,
      failures: deps.failures,
      adjudications: deps.adjudications,
    });
  }

  classify(command: string): TaskType {
    if (/수도|무엇|언제|왜|어떻게/.test(command)) return "factual";
    if (/모순|검증|비교/.test(command)) return "analysis";
    return "reasoning";
  }

  async run(command: string, opts?: { strategy?: StrategyName }): Promise<BrainResult> {
    const taskType = this.classify(command);
    const model = this.router.select(taskType);
    const evidence = await this.deps.collector.collect(command);

    const strategyName: StrategyName =
      opts?.strategy ??
      (this.deps.config.strategy === "auto"
        ? this.deps.strategies.choose(taskType, true)
        : (this.deps.config.strategy as StrategyName));
    const plan = this.deps.strategies.plan(strategyName);

    let feedback: string[] = [];
    let attempts = 0;
    let lastVerdict = null as Verdict | null;
    let recorded = 0;
    const lessonsApplied: string[] = [];
    const failuresApplied: string[] = [];

    while (attempts < this.deps.config.maxAttempts) {
      attempts += 1;
      const prior = this.lessonsRetrieve(command, lessonsApplied, failuresApplied);

      const conclusion = await this.reason(model, plan, command, evidence, prior, feedback);
      const verdict = await this.verifier.check(command, conclusion, evidence, feedback);
      lastVerdict = verdict;

      if (verdict.pass) {
        this.deps.strategies.recordOutcome(strategyName, taskType, true);
        return {
          command,
          taskType,
          model,
          strategy: strategyName,
          withheld: false,
          conclusion,
          verdict,
          attempts,
          lessonsApplied,
          failuresApplied,
          lessonsRecorded: recorded,
        };
      }
      this.deps.lessons.record(command, attempts, verdict.issues);
      recorded += 1;
      feedback = verdict.issues;
    }

    this.deps.strategies.recordOutcome(strategyName, taskType, false);
    // Fail-closed: withhold the conclusion instead of returning something
    // unverified. The verdict explains which level introduced the fault.
    return {
      command,
      taskType,
      model,
      strategy: strategyName,
      withheld: true,
      conclusion: null,
      verdict: lastVerdict as Verdict,
      attempts,
      lessonsApplied,
      failuresApplied,
      lessonsRecorded: recorded,
    };
  }

  private lessonsRetrieve(
    command: string,
    lessonsApplied: string[],
    failuresApplied: string[],
  ): string[] {
    const prior = this.deps.lessons.retrieve(command);
    const failureCtx = this.deps.failures.retrieve(command);
    if (prior.length > 0 && lessonsApplied.length === 0) lessonsApplied.push(...prior);
    if (failureCtx.length > 0 && failuresApplied.length === 0)
      failuresApplied.push(...failureCtx);
    return [...prior, ...failureCtx];
  }

  private async reason(
    model: string,
    plan: StrategyPlan,
    command: string,
    evidence: EvidenceItem[],
    prior: string[],
    feedback: string[],
  ): Promise<Conclusion> {
    const context = [...prior, ...feedback.map((f) => `[피드백] ${f}`)];
    const drafts: Conclusion[] = [];
    for (let sample = 1; sample <= plan.samples; sample++) {
      let extra = context;
      if (plan.critique) {
        const draft = await this.sample(model, plan, command, evidence, extra, sample);
        const critique = await this.selfCritique(model, draft, evidence);
        if (!critique.ok) extra = [...extra, `[자가비판] ${critique.issues.join("; ")}`];
      }
      drafts.push(await this.sample(model, plan, command, evidence, extra, sample));
    }
    return drafts.length === 1 ? drafts[0] : majorityVote(drafts);
  }

  private async sample(
    model: string,
    plan: StrategyPlan,
    command: string,
    evidence: EvidenceItem[],
    context: string[],
    sample: number,
  ): Promise<Conclusion> {
    const system =
      "You are the reasoning core. Output JSON only with shape " +
      '{"answer": string, "claims": [{"text": string, "evidenceIds": string[]}], ' +
      '"confidence": number, "unknowns": string[]}. ' +
      "Every claim must cite evidence ids from the provided evidence list. " +
      "Declare unknowns instead of guessing.";
    const user = [
      `COMMAND: ${command}`,
      `STRATEGY: ${plan.name}`,
      plan.samples > 1 ? `META: sample ${sample}/${plan.samples}` : "",
      `EVIDENCE: ${JSON.stringify(evidence)}`,
      context.length > 0 ? `CONTEXT: ${context.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await this.deps.provider.chat(
      model,
      [
        { role: "system", text: system },
        { role: "user", text: user },
      ],
      { json: true },
    );
    try {
      return JSON.parse(result.text) as Conclusion;
    } catch {
      // Unparseable reasoning output fails the L1 gate downstream with an
      // empty answer rather than being silently accepted.
      return { answer: "", claims: [], confidence: 0, unknowns: ["unparseable output"] };
    }
  }

  private async selfCritique(
    model: string,
    draft: Conclusion,
    evidence: EvidenceItem[],
  ): Promise<{ ok: boolean; issues: string[] }> {
    const conflicts = evidence.flatMap((e) =>
      (e.conflicts ?? []).map((c) => [e.id, c]),
    );
    const result = await this.deps.provider.chat(
      model,
      [
        {
          role: "system",
          text: "SELF CRITIQUE. Output JSON only: {ok: boolean, issues: string[]}",
        },
        {
          role: "user",
          text: [
            `Draft: ${JSON.stringify(draft)}`,
            `Conflicts: ${JSON.stringify(conflicts)}`,
          ].join("\n"),
        },
      ],
      { json: true },
    );
    try {
      return JSON.parse(result.text) as { ok: boolean; issues: string[] };
    } catch {
      return { ok: false, issues: ["critique unparseable"] };
    }
  }
}

// Self-consistency: keep claims supported by a majority of samples,
// take the most common answer, average confidence.
function majorityVote(drafts: Conclusion[]): Conclusion {
  const claimCount = new Map<string, { count: number; claim: Claim }>();
  for (const d of drafts) {
    for (const c of d.claims) {
      const key = c.text.trim();
      const entry = claimCount.get(key);
      if (entry) entry.count += 1;
      else claimCount.set(key, { count: 1, claim: c });
    }
  }
  const need = Math.ceil(drafts.length / 2);
  const claims = [...claimCount.values()]
    .filter((x) => x.count >= need)
    .map((x) => x.claim);

  const answerCount = new Map<string, number>();
  for (const d of drafts) {
    answerCount.set(d.answer, (answerCount.get(d.answer) ?? 0) + 1);
  }
  let answer = drafts[0].answer;
  let best = 0;
  for (const [a, n] of answerCount) {
    if (n > best) {
      best = n;
      answer = a;
    }
  }
  const confidence =
    drafts.reduce((s, d) => s + d.confidence, 0) / Math.max(1, drafts.length);
  const unknowns = [...new Set(drafts.flatMap((d) => d.unknowns))];
  return { answer, claims, confidence, unknowns };
}
