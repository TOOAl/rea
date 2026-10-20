import type {
  Conclusion,
  EvidenceItem,
  Verdict,
  CheckResult,
  AdjudicationRecord,
} from "./contracts.ts";
import type { LlmProvider } from "./providers/provider.ts";
import type { CredibilityModel } from "./credibility.ts";
import type { FailureStore } from "./failures.ts";
import type { AdjudicationLog } from "./adjudications.ts";
import type { ConclusionStore } from "./conclusions.ts";

// Stage 3 verification: one pass over layered checks, cheapest-first.
//  L1  deterministic gates (citations resolve, schema, ranges) — free, exact.
//  L3a claim support (per-claim judge vs cited evidence) — paid, probabilistic.
//  L3b conflict adjudication — WHO IS RIGHT, not blind blocking
//      (credibility score, decisive failure cases, judge rationale).
//  L3c premise-conclusion logic — new in stage 3:
//      (a) deterministic overclaim check: hedged evidence must not be
//          promoted to a categorical answer,
//      (b) premise logic judge: causal/necessary premises in the answer
//          must exist in the cited evidence.
//  L3d past-conclusion consistency — new in stage 3:
//      compare against the long-term conclusion memory; contradictions
//      are resolved by failure-case ground truth or a credibility margin
//      (auditable supersede), otherwise WITHHELD (no silent flip-flop).
//  L2  independent overall judge — paid, probabilistic.
// Verification is fail-closed: an unparseable judge verdict is a
// rejection, never a silent pass. Planned-but-unimplemented checks are
// disclosed in `skipped`, never silently dropped.
export class Verifier {
  private provider: LlmProvider;
  private judgeModel: string;
  private passConfidence: number;
  private judgeMinAgreement: number;
  private claimSupportMin: number;
  private credibility: CredibilityModel;
  private failures: FailureStore;
  private adjudications: AdjudicationLog;
  private conclusions: ConclusionStore;

  constructor(opts: {
    provider: LlmProvider;
    judgeModel: string;
    passConfidence: number;
    judgeMinAgreement: number;
    claimSupportMin: number;
    credibility: CredibilityModel;
    failures: FailureStore;
    adjudications: AdjudicationLog;
    conclusions: ConclusionStore;
  }) {
    this.provider = opts.provider;
    this.judgeModel = opts.judgeModel;
    this.passConfidence = opts.passConfidence;
    this.judgeMinAgreement = opts.judgeMinAgreement;
    this.claimSupportMin = opts.claimSupportMin;
    this.credibility = opts.credibility;
    this.failures = opts.failures;
    this.adjudications = opts.adjudications;
    this.conclusions = opts.conclusions;
  }

  async check(
    command: string,
    conclusion: Conclusion,
    evidence: EvidenceItem[],
    feedback: string[],
  ): Promise<Verdict> {
    const checks: CheckResult[] = [];
    const issues: string[] = [];
    const warnings: string[] = [];
    const skipped = [
      "L4 임베딩 유사도 기반 근거 대조 (실모델 전환 시)",
      "L5 다중 에이전트 토론 심판 (선택)",
    ];
    const hedgeRe =
      /일부|대부분|본다|보는|보인다|보지만|추정|견해|가설|아마|이라는 설|이라는 주장/;

    // ---- L1 deterministic gates ----
    checks.push({
      gate: "answer-nonempty",
      ok: conclusion.answer.trim().length > 0,
      detail: `answer length ${conclusion.answer.trim().length}`,
    });
    checks.push({
      gate: "confidence-range",
      ok: conclusion.confidence >= 0 && conclusion.confidence <= 1,
      detail: `confidence ${conclusion.confidence}`,
    });
    const known = new Set(evidence.map((e) => e.id));
    const unknownRefs = conclusion.claims.flatMap((c) =>
      c.evidenceIds.filter((id) => !known.has(id)),
    );
    checks.push({
      gate: "citations-resolve",
      ok: unknownRefs.length === 0,
      detail:
        unknownRefs.length > 0
          ? `unknown evidence ids: ${[...new Set(unknownRefs)].join(", ")}`
          : "all claims cite known evidence",
    });
    checks.push({
      gate: "claims-cited",
      ok: conclusion.claims.every((c) => c.evidenceIds.length > 0),
      detail: conclusion.claims.every((c) => c.evidenceIds.length > 0)
        ? "every claim cites evidence"
        : "uncited claim present",
    });
    const l1Pass = checks.every((c) => c.ok);
    issues.push(
      ...checks.filter((c) => !c.ok).map((c) => `L1:${c.gate}: ${c.detail}`),
    );
    const citedIds = new Set(conclusion.claims.flatMap((c) => c.evidenceIds));

    // ---- L3a claim support (judge per claim set) ----
    let l3aPass = false;
    if (l1Pass) {
      const prompt = [
        "CLAIM SUPPORT JUDGE",
        `MIN_SIMILARITY: ${this.claimSupportMin}`,
        `Claims: ${JSON.stringify(conclusion.claims)}`,
        `Evidence: ${JSON.stringify(evidence)}`,
        `Feedback: ${feedback.join(" | ")}`,
      ].join("\n");
      const result = await this.provider.chat(
        this.judgeModel,
        [
          {
            role: "system",
            text: "CLAIM SUPPORT JUDGE. Output JSON only: {supported: boolean[], reasons: string[]}",
          },
          { role: "user", text: prompt },
        ],
        { json: true },
      );
      try {
        const judge = JSON.parse(result.text) as {
          supported: boolean[];
          reasons?: string[];
        };
        const unsupported = conclusion.claims.filter((_, i) => !judge.supported[i]);
        l3aPass = unsupported.length === 0;
        checks.push({
          gate: "claims-supported",
          ok: l3aPass,
          detail: l3aPass
            ? "every claim is supported by its cited evidence"
            : `unsupported claims: ${unsupported.map((c) => c.text).join(" / ")}`,
        });
        if (!l3aPass) {
          issues.push(...unsupported.map((c) => `L3a: 지지되지 않은 주장: ${c.text}`));
        }
      } catch {
        l3aPass = false;
        issues.push("L3a: claim-support judge output unparseable");
      }
    }

    // ---- L3b conflict adjudication: decide WHO IS RIGHT ----
    let l3bPass = true;
    let adjudicated = false;
    if (l1Pass && l3aPass) {
      const byId = new Map(evidence.map((e) => [e.id, e]));
      const seen = new Set<string>();
      for (const a of evidence) {
        for (const bId of a.conflicts ?? []) {
          const pairKey = [a.id, bId].sort().join("|");
          if (seen.has(pairKey)) continue;
          seen.add(pairKey);
          const b = byId.get(bId);
          if (!b) continue;
          const aCited = citedIds.has(a.id);
          const bCited = citedIds.has(b.id);
          if (!aCited && !bCited) continue;

          const scoreA = this.credibility.score(a);
          const scoreB = this.credibility.score(b);
          const failureCase = this.failures.findByPair(a.id, b.id);

          let winner = scoreA >= scoreB ? a : b;
          let loser = winner.id === a.id ? b : a;
          let decidedBy: AdjudicationRecord["decidedBy"] = "credibility-model";
          let reason = `신뢰도 점수 ${winner.id}=${(winner.id === a.id ? scoreA : scoreB).toFixed(2)} > ${loser.id}=${(loser.id === a.id ? scoreA : scoreB).toFixed(2)} (prior x level x learned)`;
          const marginOk =
            Math.abs(scoreA - scoreB) >= this.credibility.margin;

          if (failureCase) {
            // Decisive ground truth: reality already refuted one side.
            const confirmed = byId.get(failureCase.actual) ?? winner;
            const refuted = byId.get(failureCase.picked) ?? loser;
            winner = confirmed;
            loser = refuted;
            decidedBy = "failure-case";
            reason = `과거 실패사례가 실증한 바: ${failureCase.picked}(${failureCase.pickedSource})를 택했으나 실제는 ${failureCase.actual}(${failureCase.actualSource}) — ${failureCase.reason}`;
          } else if (!marginOk) {
            l3bPass = false;
            issues.push(
              `L3b: 상충 판정 불가 — ${a.id}(${scoreA.toFixed(2)}) vs ${b.id}(${scoreB.toFixed(2)}) 신뢰도 차이가 ${this.credibility.margin} 미만 (보류: fail-closed)`,
            );
            continue;
          }

          adjudicated = true;
          this.adjudications.record({
            command,
            pair: [a.id, b.id],
            winner: winner.id,
            winnerSource: winner.source,
            loser: loser.id,
            loserSource: loser.source,
            winnerScore: this.credibility.score(winner),
            loserScore: this.credibility.score(loser),
            decidedBy,
            reason,
          });

          const winnerCited = citedIds.has(winner.id);
          const loserCited = citedIds.has(loser.id);
          if (aCited && bCited) {
            l3bPass = false;
            issues.push(
              `L3b: 상충 근거 양쪽을 모두 인용 — ${loser.id}(${loser.text}) 인용을 제거하고 승자 ${winner.id} 기준으로 재작성하라. 판단 근거: ${reason}`,
            );
          } else if (loserCited && !winnerCited) {
            l3bPass = false;
            issues.push(
              `L3b: 결론이 판정에서 패배한 근거 ${loser.id}에 의존 — 승자 ${winner.id}(${winner.text}) 기준으로 재작성하라. 판단 근거: ${reason}`,
            );
          } else {
            warnings.push(
              `L3b adjudicated(${decidedBy}): ${loser.id}(${loser.text})는 배제됨 — ${reason}`,
            );
          }
        }
      }
      checks.push({
        gate: "evidence-conflict-adjudication",
        ok: l3bPass,
        detail: l3bPass
          ? adjudicated
            ? "상충 판정 완료 — 승자 근거만 인용됨"
            : "인용된 근거 간 상충 없음"
          : "상충 판정 실패(재작성 필요 또는 판정 불가)",
      });
    }

    // ---- L3c premise-conclusion logic ----
    let l3cPass = true;
    if (l1Pass && l3aPass && l3bPass) {
      // (a) deterministic overclaim check
      const citedTexts = evidence
        .filter((e) => citedIds.has(e.id))
        .map((e) => e.text)
        .join(" ");
      const evidenceHedged = hedgeRe.test(citedTexts);
      const answerHedged = hedgeRe.test(conclusion.answer);
      if (evidenceHedged && !answerHedged) {
        l3cPass = false;
        issues.push(
          "L3c: 과잉 주장 — 근거는 유보적(~로 본다/추정)이나 결론이 단정 표현이다. 유보 표현으로 수정하거나 unknown으로 선언하라",
        );
      }
      // (b) premise logic judge
      const prompt = [
        "PREMISE LOGIC JUDGE",
        "RUBRIC: the answer's causal or necessary premises must appear in the cited evidence; unsupported premises must be declared unknown.",
        `Answer: ${conclusion.answer}`,
        `Claims: ${JSON.stringify(conclusion.claims)}`,
        `Evidence: ${JSON.stringify(evidence.filter((e) => citedIds.has(e.id)))}`,
      ].join("\n");
      const result = await this.provider.chat(
        this.judgeModel,
        [
          {
            role: "system",
            text: "PREMISE LOGIC JUDGE. Output JSON only: {supported: boolean, issues: string[]}",
          },
          { role: "user", text: prompt },
        ],
        { json: true },
      );
      try {
        const judge = JSON.parse(result.text) as {
          supported: boolean;
          issues?: string[];
        };
        if (!judge.supported) {
          l3cPass = false;
          issues.push(
            ...(judge.issues ?? ["전제가 근거에서 뒷받침되지 않음"]).map(
              (i) => `L3c: ${i}`,
            ),
          );
        }
      } catch {
        l3cPass = false;
        issues.push("L3c: premise-logic judge output unparseable");
      }
      checks.push({
        gate: "premise-conclusion-logic",
        ok: l3cPass,
        detail: l3cPass
          ? "전제-결론 정합 (과잉 주장 없음, 전제가 근거로 뒷받침됨)"
          : "전제-결론 논리 모순 또는 과잉 주장",
      });
    }

    // ---- L3d past-conclusion consistency ----
    let l3dPass = true;
    let supersede: { oldAnswer: string; reason: string } | undefined;
    if (l1Pass && l3aPass && l3bPass && l3cPass) {
      const past = this.conclusions.latestSimilar(command);
      if (past) {
        // Conflict is decided at CLAIM level: same fact slot (high
        // text similarity) with disjoint year values. Question wording
        // similarity alone must never trigger this — "when did X start"
        // and "when did Y start" are different topics.
        const claimConflict =
          conclusion.claims.length > 0 && past.claims.length > 0
            ? conclusion.claims
                .map((cNew) => ({
                  cNew,
                  cPast: past!.claims.find((cp) => {
                    if (textSim(cNew.text, cp.text) < 0.6) return false;
                    const yN = years(cNew.text);
                    const yP = years(cp.text);
                    return (
                      yN.length > 0 &&
                      yP.length > 0 &&
                      !yN.some((y) => yP.includes(y))
                    );
                  }),
                }))
                .find((x) => x.cPast)
            : undefined;
        const answerConflict =
          !claimConflict &&
          (conclusion.claims.length === 0 || past.claims.length === 0);
        const yNew = claimConflict
          ? years(claimConflict.cNew.text)
          : years(conclusion.answer);
        const yPast = claimConflict?.cPast
          ? years(claimConflict.cPast.text)
          : years(past.answer);
        const disjoint =
          (claimConflict ? true : answerConflict) &&
          yNew.length > 0 &&
          yPast.length > 0 &&
          !yNew.some((y) => yPast.includes(y));
        const hedgedNew = hedgeRe.test(
          claimConflict ? claimConflict.cNew.text : conclusion.answer,
        );
        const hedgedPast = hedgeRe.test(
          claimConflict?.cPast ? claimConflict.cPast.text : past.answer,
        );

        if (disjoint && (hedgedNew || hedgedPast)) {
          warnings.push(
            `L3d: 이전 결론("${past.answer}")과 다른 주장 병존 (유보적 표현) — 병기 기록됨`,
          );
        } else if (disjoint) {
          // Hard contradiction between categorical answers. Resolve by
          // decisive ground truth first, then by credibility margin.
          const pastIds = new Set(past.evidence.map((e) => e.id));
          const fc = this.failures
            .list()
            .reverse()
            .find(
              (f) =>
                (citedIds.has(f.actual) && pastIds.has(f.picked)) ||
                (citedIds.has(f.picked) && pastIds.has(f.actual)),
            );
          const scoreNew = avg(
            evidence.filter((e) => citedIds.has(e.id)).map((e) => this.credibility.score(e)),
          );
          const scorePast = avg(
            past.evidence.map((e) => this.credibility.score(e as EvidenceItem)),
          );

          if (fc && citedIds.has(fc.actual)) {
            supersede = {
              oldAnswer: past.answer,
              reason: `실패사례 실증: ${fc.reason}`,
            };
            warnings.push(
              `L3d: 이전 결론("${past.answer}")을 대체 — ${supersede.reason}`,
            );
          } else if (fc && citedIds.has(fc.picked)) {
            l3dPass = false;
            issues.push(
              `L3d: 실패사례가 반박한 쪽(${fc.picked})에 의존한 결론 — 실증된 ${fc.actual} 기준으로 재작성하라`,
            );
          } else if (scoreNew - scorePast >= this.credibility.margin) {
            supersede = {
              oldAnswer: past.answer,
              reason: `새 근거 신뢰도 우위 (${scoreNew.toFixed(2)} vs ${scorePast.toFixed(2)})`,
            };
            warnings.push(
              `L3d: 이전 결론("${past.answer}")을 대체 — ${supersede.reason}`,
            );
          } else {
            l3dPass = false;
            issues.push(
              `L3d: 과거 결론("${past.answer}", 신뢰도 ${scorePast.toFixed(2)})과 불일치 — 새 결론 신뢰도 ${scoreNew.toFixed(2)}, 우위 근거 없음 (보류: fail-closed, 무음 전환 금지)`,
            );
          }
        }
        checks.push({
          gate: "past-conclusion-consistency",
          ok: l3dPass,
          detail: !past
            ? "비교할 과거 결론 없음"
            : l3dPass
              ? disjoint
                ? supersede
                  ? "과거 결론 대체(감사 기록)"
                  : "유보적 주장 병기"
                : "과거 결론과 정합"
              : "과거 결론과 해소 불가한 불일치",
        });
      } else {
        checks.push({
          gate: "past-conclusion-consistency",
          ok: true,
          detail: "비교할 과거 결론 없음",
        });
      }
    }

    // ---- L2 independent overall judge ----
    let judgeAgree = true;
    let judgeConfidence = 1;
    let judgeIssues: string[] = [];
    if (l1Pass && l3aPass && l3bPass && l3cPass && l3dPass) {
      const prompt = [
        "VERIFICATION JUDGE",
        "Rubric: the answer must follow only from the cited evidence; no unsupported claims; unknowns must be declared.",
        `Draft: ${JSON.stringify(conclusion)}`,
        `Evidence: ${JSON.stringify(evidence)}`,
        `Feedback: ${feedback.join(" | ")}`,
      ].join("\n");
      const result = await this.provider.chat(
        this.judgeModel,
        [
          {
            role: "system",
            text: "VERIFICATION JUDGE. Output JSON only: {agree: boolean, confidence: number, issues: string[]}",
          },
          { role: "user", text: prompt },
        ],
        { json: true },
      );
      try {
        const judge = JSON.parse(result.text) as {
          agree: boolean;
          confidence: number;
          issues?: string[];
        };
        judgeAgree = judge.agree;
        judgeConfidence = judge.confidence;
        judgeIssues = judge.issues ?? [];
      } catch {
        judgeAgree = false;
        judgeIssues = ["judge output unparseable"];
      }
    }
    issues.push(...judgeIssues.map((i) => `L2: ${i}`));
    if (!judgeAgree && judgeIssues.length === 0) {
      issues.push("L2: judge disagreed without stating issues");
    }
    if (conclusion.confidence < this.passConfidence) {
      issues.push(
        `confidence ${conclusion.confidence} below pass threshold ${this.passConfidence}`,
      );
    }

    // Non-blocking warnings reduce reported confidence.
    const confidence = Math.max(
      0,
      Math.min(conclusion.confidence, judgeConfidence) - warnings.length * 0.05,
    );

    const pass =
      l1Pass &&
      l3aPass &&
      l3bPass &&
      l3cPass &&
      l3dPass &&
      judgeAgree &&
      conclusion.confidence >= this.passConfidence &&
      judgeConfidence >= this.judgeMinAgreement;

    const verdict: Verdict = { pass, confidence, issues, warnings, checks, skipped };
    if (supersede) verdict.supersede = supersede;
    return verdict;
  }
}

function years(text: string): string[] {
  return [...text.matchAll(/(\d{4})/g)].map((m) => m[1]);
}

function avg(xs: number[]): number {
  return xs.length === 0 ? 0.5 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Character bigram containment — same metric as retrieval/memory.
function textSim(a: string, b: string): number {
  const bg = (s: string) => {
    const out = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
  };
  const A = bg(a);
  const B = bg(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / Math.min(A.size, B.size);
}
