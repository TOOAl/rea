import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ReasoningFailure } from "./contracts.ts";

// Reasoning-failure case store. When ground truth confirms the side
// that adjudication rejected, the case is recorded here WITH the
// reason the credibility signals misled the judgment and reused as
// accuracy-improvement material:
//   1. learned source reliability is updated immediately,
//   2. similar past cases are injected into later reasoning contexts,
//   3. adjudication treats a matching failure case as decisive
//      ground truth for that conflict pair.
export class FailureStore {
  private path: string;

  constructor(path: string) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
  }

  record(failure: Omit<ReasoningFailure, "ts">): void {
    appendFileSync(
      this.path,
      JSON.stringify({ ...failure, ts: new Date().toISOString() }) + "\n",
    );
  }

  list(): ReasoningFailure[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ReasoningFailure);
  }

  // Decisive ground truth for a conflict pair, if any.
  findByPair(a: string, b: string): ReasoningFailure | undefined {
    return this.list()
      .reverse()
      .find(
        (f) =>
          (f.actual === a && f.picked === b) || (f.actual === b && f.picked === a),
      );
  }

  retrieve(query: string, limit = 2): string[] {
    const failures = this.list();
    if (failures.length === 0) return [];
    return failures
      .map((f) => ({ f, score: similarity(query, f.command) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(
        (x) =>
          `[실패사례] "${x.f.command}" — 신뢰도 판단 오류: ${x.f.picked}(${x.f.pickedSource})를 택했으나 실제는 ${x.f.actual}(${x.f.actualSource}). 이유: ${x.f.reason}`,
      );
  }
}

// Character bigram containment — robust for Korean; avoids false
// matches from a single shared word ("언제") across topics.
function similarity(a: string, b: string): number {
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
