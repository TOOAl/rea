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

// Stage 2 verification: one pass over layered checks.
//  L1  deterministic gates (citations resolve, schema, ranges) — free, exact.
//  L3a claim support (per-claim judge vs cited evidence) — paid, probabilistic.
//  L3b conflict adjudication — WHO IS RIGHT, not blind blocking:
//      score both sides with the credibility model (prior x level x learned),
//      let decisive ground-truth failure cases override, ask the
//      adjudication judge to explain the pick. Sufficient margin ->
//      side with the winner, loser becomes a disputed unknown.
//      Insufficient margin -> withhold (fail-closed).
//  L2  independent overall judge — paid, probabilistic.
// Checks run cheapest-first; a failed layer skips the layers above it.
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

  constructor(opts: {
    provider: LlmProvider;
    judgeModel: string;
    passConfidence: number;
    judgeMinAgreement: number;
    claimSupportMin: number;
    credibility: CredibilityModel;
    failures: FailureStore;
    adjudications: AdjudicationLog;
  }) {
    this.provider = opts.provider;
    this.judgeModel = opts.judgeModel;
    this.passConfidence = opts.passConfidence;
    this.judgeMinAgreement = opts.judgeMinAgreement;
    this.claimSupportMin = opts.claimSupportMin;
    this.credibility = opts.credibility;
    this.failures = opts.failures;
    this.adjudications = opts.adjudications;
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
      "L3c 전제-결론 논리 모순 (단계 3)",
      "L3d 과거 결론과의 불일치 (단계 4)",
    ];

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
    if (l1Pass) {
      const citedIds = new Set(conclusion.claims.flatMap((c) => c.evidenceIds));
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

    // ---- L2 independent overall judge ----
    let judgeAgree = true;
    let judgeConfidence = 1;
    let judgeIssues: string[] = [];
    if (l1Pass && l3aPass && l3bPass) {
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
      judgeAgree &&
      conclusion.confidence >= this.passConfidence &&
      judgeConfidence >= this.judgeMinAgreement;

    return { pass, confidence, issues, warnings, checks, skipped };
  }
}
