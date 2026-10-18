import type { LlmProvider, ChatMessage, ChatResult } from "./provider.ts";

// Deterministic stand-in so stage 2 runs without Ollama installed.
// Sections are parsed explicitly so injected context (lessons, feedback,
// failure cases) can never hijack command matching — a real model reads
// the same structure but reasons over it.

function section(text: string, name: string): string {
  const match = text.match(new RegExp(`${name}: (.*?)(?=\\n[A-Za-z]+:|$)`, "s"));
  return match ? match[1] : "";
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

function similarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / Math.min(A.size, B.size);
}

function years(text: string): string[] {
  return [...text.matchAll(/(\d{4})/g)].map((m) => m[1]);
}

// Source-name heuristic standing in for an LLM's world knowledge of
// source reputation (used only inside this mock, never in the brain).
const SOURCE_RANK: Record<string, number> = {
  encyclopedia: 0.9,
  "history-journal": 0.8,
  "public-wiki": 0.8,
  "mock-web": 0.7,
  "insider-blog": 0.4,
  "low-quality-blog": 0.3,
};

interface Claim {
  text: string;
  evidenceIds: string[];
}

interface Evidence {
  id: string;
  source: string;
  text: string;
  conflicts?: string[];
}

export class MockProvider implements LlmProvider {
  readonly kind = "mock";

  async chat(_model: string, messages: ChatMessage[]): Promise<ChatResult> {
    const system = messages.find((m) => m.role === "system")?.text ?? "";
    const user = messages.find((m) => m.role === "user")?.text ?? "";

    // ---- L3a claim-support judge ----
    if (system.includes("CLAIM SUPPORT JUDGE")) {
      try {
        const claims = JSON.parse(section(user, "Claims")) as Claim[];
        const evidence = JSON.parse(section(user, "Evidence")) as Evidence[];
        const minSim = parseFloat(section(user, "MIN_SIMILARITY") || "0.25");
        const byId = new Map(evidence.map((e) => [e.id, e.text]));
        const supported = claims.map((c) => {
          const citedText = c.evidenceIds.map((id) => byId.get(id) ?? "").join(" ");
          const claimYears = years(c.text);
          const citedYears = years(citedText);
          const yearsOk = claimYears.every((y) => citedYears.includes(y));
          return yearsOk && similarity(c.text, citedText) >= minSim;
        });
        return {
          text: JSON.stringify({
            supported,
            reasons: supported.map((s) =>
              s
                ? "cited evidence supports the claim"
                : "claim not supported by cited evidence",
            ),
          }),
        };
      } catch {
        return {
          text: JSON.stringify({ supported: [], reasons: ["parse failure"] }),
        };
      }
    }

    // ---- L3b adjudication judge (explains the pick) ----
    if (system.includes("ADJUDICATION JUDGE")) {
      try {
        const candidates = JSON.parse(section(user, "Candidates")) as Evidence[];
        const failureCases = JSON.parse(section(user, "FailureCases") || "[]") as {
          picked: string;
          actual: string;
          reason: string;
        }[];
        for (const f of failureCases) {
          const ids = new Set(candidates.map((c) => c.id));
          if (ids.has(f.picked) && ids.has(f.actual)) {
            return {
              text: JSON.stringify({
                winner: f.actual,
                reason: `실증된 실패사례: ${f.reason}`,
              }),
            };
          }
        }
        const ranked = [...candidates].sort(
          (a, b) => (SOURCE_RANK[b.source] ?? 0.5) - (SOURCE_RANK[a.source] ?? 0.5),
        );
        return {
          text: JSON.stringify({
            winner: ranked[0].id,
            reason: `출처 신뢰도(${ranked[0].source}=${SOURCE_RANK[ranked[0].source] ?? 0.5})가 상대(${ranked[1]?.source}=${ranked[1] ? SOURCE_RANK[ranked[1].source] ?? 0.5 : 0})보다 높다`,
          }),
        };
      } catch {
        return {
          text: JSON.stringify({ winner: "", reason: "adjudication parse failure" }),
        };
      }
    }

    // ---- L3c premise logic judge ----
    if (system.includes("PREMISE LOGIC JUDGE")) {
      const answer = section(user, "Answer");
      const evidence = JSON.parse(section(user, "Evidence") || "[]") as Evidence[];
      const causal = /때문에|덕분에|로 인해|탓에|효과로|결과로|이끌어|야기/;
      const answerCausal = causal.test(answer);
      const evidenceCausal = evidence.some((e) => causal.test(e.text));
      const supported = !answerCausal || evidenceCausal;
      return {
        text: JSON.stringify({
          supported,
          issues: supported
            ? []
            : [
                "인과 전제가 근거에 존재하지 않음 — 원인을 단정할 수 없고 unknown으로 선언해야 한다",
              ],
        }),
      };
    }

    // ---- Reflect-strategy self-critique ----
    if (system.includes("SELF CRITIQUE")) {
      try {
        const draft = JSON.parse(section(user, "Draft")) as {
          claims: Claim[];
        };
        const conflicts = JSON.parse(section(user, "Conflicts") || "[]") as string[][];
        const cited = new Set(draft.claims.flatMap((c) => c.evidenceIds));
        const conflictHit = conflicts.find(([a, b]) => cited.has(a) && cited.has(b));
        return {
          text: JSON.stringify({
            ok: !conflictHit,
            issues: conflictHit
              ? [`상충 근거(${conflictHit[0]} vs ${conflictHit[1]})를 동시에 인용 — 한쪽으로 수렴 필요`]
              : [],
          }),
        };
      } catch {
        return { text: JSON.stringify({ ok: false, issues: ["critique parse failure"] }) };
      }
    }

    // ---- L2 overall judge ----
    if (system.includes("VERIFICATION JUDGE")) {
      try {
        const draft = JSON.parse(section(user, "Draft")) as {
          answer: string;
          claims: Claim[];
        };
        const evidence = JSON.parse(section(user, "Evidence")) as Evidence[];
        const known = new Set(evidence.map((e) => e.id));
        const badCitation = draft.claims.some((c) =>
          c.evidenceIds.some((id) => !known.has(id)),
        );
        const empty = draft.answer.trim().length === 0;
        const agree = !badCitation && !empty;
        return {
          text: JSON.stringify({
            agree,
            confidence: agree ? 0.85 : 0.3,
            issues: agree
              ? []
              : [
                  badCitation
                    ? "judge: citation does not resolve to collected evidence"
                    : "judge: empty answer",
                ],
          }),
        };
      } catch {
        return {
          text: JSON.stringify({
            agree: false,
            confidence: 0,
            issues: ["judge: could not parse draft"],
          }),
        };
      }
    }

    // ---- Reasoning model stand-in ----
    return { text: JSON.stringify(this.reason(user)) };
  }

  private reason(user: string): unknown {
    const command = section(user, "COMMAND");
    const context = section(user, "CONTEXT");
    const meta = section(user, "META"); // e.g. "sample 1/3"
    const sample = parseInt(meta.match(/sample (\d+)/)?.[1] ?? "1", 10);

    const evidence = JSON.parse(section(user, "EVIDENCE") || "[]") as Evidence[];
    const ids = new Set(evidence.map((e) => e.id));
    const has = (id: string) => ids.has(id);
    const learned = context.includes("[교훈]") || context.includes("[피드백]");
    const failureKnown = context.includes("[실패사례]");

    if (command.includes("프랑스의 수도")) {
      if (!learned) {
        // First attempt deliberately cites an id that was never collected;
        // the L1 gate rejects it and the retry cites correctly.
        return {
          answer: "프랑스의 수도는 파리입니다.",
          claims: [{ text: "파리는 프랑스의 수도이다", evidenceIds: ["ev999"] }],
          confidence: 0.9,
          unknowns: [],
        };
      }
      return {
        answer: "프랑스의 수도는 파리입니다.",
        claims: [{ text: "파리는 프랑스의 수도이다", evidenceIds: ["ev-fr-1"] }],
        confidence: 0.9,
        unknowns: [],
      };
    }

    if (command.includes("대공황") && command.includes("제로")) {
      // Not expected: combined command, fall through to generic.
    }

    if (command.includes("제로")) {
      // Fictional conflict pair. Without prior lessons a direct draft
      // leans on the higher-ranked source; with a recorded failure case
      // the reality-confirmed side wins.
      const winner = failureKnown ? "ev-zp-2" : "ev-zp-1";
      const loser = winner === "ev-zp-1" ? "ev-zp-2" : "ev-zp-1";
      if (!learned && !failureKnown) {
        return {
          answer: "제로 프로젝트는 2021년에 종료되었으며, 2024년 종료 주장도 있습니다.",
          claims: [
            { text: "제로 프로젝트는 2021년에 종료되었다", evidenceIds: ["ev-zp-1"] },
            { text: "제로 프로젝트는 2024년에 종료되었다", evidenceIds: ["ev-zp-2"] },
          ].filter((c) => c.evidenceIds.every((id) => has(id))),
          confidence: 0.8,
          unknowns: [],
        };
      }
      const winnerText =
        winner === "ev-zp-2"
          ? "제로 프로젝트는 2024년에 공식 종료되었습니다."
          : "제로 프로젝트는 2021년에 종료되었습니다.";
      return {
        answer: winnerText,
        claims: [
          {
            text: `제로 프로젝트는 ${winner === "ev-zp-2" ? "2024년" : "2021년"}에 종료되었다`,
            evidenceIds: [winner],
          },
        ].filter((c) => c.evidenceIds.every((id) => has(id))),
        confidence: 0.85,
        unknowns: [
          `상충 근거 ${loser}(${loser === "ev-zp-2" ? "2024년" : "2021년"} 종료 주장)는 배제했습니다`,
        ],
      };
    }

    // L3c demo: causal question about the Depression's end. The first
    // draft asserts an unsupported causal premise (New Deal ended it);
    // the retry declares the cause unknown.
    if (
      command.includes("대공황") &&
      (command.includes("원인") || command.includes("때문") || command.includes("왜"))
    ) {
      const claims = [
        { text: "루스벨트는 1933년 뉴딜을 시행했다", evidenceIds: ["ev-gd-4"] },
        { text: "대공황은 1939년경에 끝났다고 본다", evidenceIds: ["ev-gd-2"] },
      ].filter((c) => c.evidenceIds.every((id) => has(id)));
      if (learned) {
        return {
          answer:
            "뉴딜은 1933년에 시행되었고, 대공황은 1939년경에 끝났다고 보지만, 종료 원인은 수집된 근거로 확인할 수 없습니다.",
          claims,
          confidence: 0.8,
          unknowns: ["대공황 종료 원인 — 인과 근거 없음"],
        };
      }
      return {
        answer: "뉴딜 정책 덕분에 대공황이 끝났습니다.",
        claims,
        confidence: 0.85,
        unknowns: [],
      };
    }

    // L3c demo: "확정해줘" prompts a categorical answer from hedged
    // evidence ("~라고 본다") — the overclaim check must catch it.
    if (command.includes("확정") && (command.includes("종료") || command.includes("끝"))) {
      if (learned) {
        return {
          answer: "대공황은 1939년경에 끝났다고 보는 견해가 있습니다.",
          claims: [
            { text: "대공황은 1939년경에 끝났다고 본다", evidenceIds: ["ev-gd-2"] },
          ].filter((c) => c.evidenceIds.every((id) => has(id))),
          confidence: 0.8,
          unknowns: ["종료 연도는 학설 차이가 있어 단정 불가"],
        };
      }
      return {
        answer: "대공황은 1939년에 끝났습니다.",
        claims: [
          { text: "대공황은 1939년경에 끝났다고 본다", evidenceIds: ["ev-gd-2"] },
        ].filter((c) => c.evidenceIds.every((id) => has(id))),
        confidence: 0.9,
        unknowns: [],
      };
    }

    // Hedged end-date answer (evidence is a view, not a fact).
    if (command.includes("대공황") && (command.includes("끝") || command.includes("종료"))) {
      return {
        answer: "대공황은 1939년경에 끝났다고 보는 견해가 있습니다.",
        claims: [
          { text: "대공황은 1939년경에 끝났다고 본다", evidenceIds: ["ev-gd-2"] },
        ].filter((c) => c.evidenceIds.every((id) => has(id))),
        confidence: 0.8,
        unknowns: [],
      };
    }

    if (command.includes("대공황")) {
      const conflictBoth = has("ev-gd-1") && has("ev-gd-3");
      // Winner by source rank (encyclopedia > low-quality-blog).
      const winner = "ev-gd-1";
      const loser = "ev-gd-3";

      // Strategy- and iteration-aware drafting:
      //  - consistency sample 1 drafts both sides; samples 2-3 converge.
      //  - cot converges immediately.
      //  - reflect drafts both; orchestrator's self-critique drops the loser.
      //  - direct drafts both on the first attempt, converges after feedback.
      const converge =
        !conflictBoth ||
        learned ||
        failureKnown ||
        (user.includes("STRATEGY: cot")) ||
        (user.includes("STRATEGY: consistency") && sample > 1) ||
        user.includes("[자가비판]");

      if (!converge) {
        return {
          answer:
            "미국 대공황은 1929년 주식시장 대폭락으로 시작되었으며, 1935년에 시작되었다는 주장도 있습니다.",
          claims: [
            { text: "대공황은 1929년에 시작되었다", evidenceIds: ["ev-gd-1"] },
            { text: "대공황은 1935년에 시작되었다", evidenceIds: ["ev-gd-3"] },
          ].filter((c) => c.evidenceIds.every((id) => has(id))),
          confidence: 0.8,
          unknowns: [],
        };
      }
      return {
        answer: "미국 대공황은 1929년 10월 주식시장 대폭락으로 시작되었습니다.",
        claims: [
          { text: "대공황은 1929년에 시작되었다", evidenceIds: [winner] },
        ].filter((c) => c.evidenceIds.every((id) => has(id))),
        confidence: 0.85,
        unknowns: conflictBoth
          ? [
              `상충 근거 ${loser}(1935년 시작 주장)는 신뢰도 판정 결과 배제했습니다`,
            ]
          : [],
      };
    }

    if (command.includes("뉴딜")) {
      return {
        answer: "루스벨트 대통령은 1933년 뉴딜 정책을 시행했습니다.",
        claims: [
          { text: "루스벨트는 1933년 뉴딜을 시행했다", evidenceIds: ["ev-gd-4"] },
        ].filter((c) => c.evidenceIds.every((id) => has(id))),
        confidence: 0.85,
        unknowns: [],
      };
    }

    if (command.includes("알 수 없는")) {
      // No evidence-backed claim at all: low confidence, fail-closed path.
      return {
        answer: "해당 질문에 답할 근거가 수집되지 않았습니다.",
        claims: [],
        confidence: 0.1,
        unknowns: ["자료 없음"],
      };
    }

    return {
      answer: "수집된 근거에 기반한 일반 답변입니다.",
      claims: [{ text: "일반 진술", evidenceIds: ["ev-fr-1"] }].filter((c) =>
        c.evidenceIds.every((id) => has(id)),
      ),
      confidence: 0.75,
      unknowns: [],
    };
  }
}
