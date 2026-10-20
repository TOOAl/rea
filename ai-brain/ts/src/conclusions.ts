import {
  appendFileSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { dirname } from "node:path";
import type { Claim, ConclusionRecord, EvidenceLevel } from "./contracts.ts";

// Character bigram containment — same metric as lessons/failures.
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

// Long-term conclusion memory (L3d). Every verified conclusion is
// persisted with an evidence snapshot so future conclusions can be
// checked for consistency over time. Supersede events keep the history
// auditable — conclusions never silently flip-flop.
export class ConclusionStore {
  private path: string;

  constructor(path: string) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
  }

  record(
    command: string,
    answer: string,
    claims: Claim[],
    evidence: { id: string; source: string; level: EvidenceLevel }[],
  ): void {
    const rec: ConclusionRecord = {
      command,
      answer,
      claims,
      evidence,
      ts: new Date().toISOString(),
    };
    appendFileSync(this.path, JSON.stringify(rec) + "\n");
  }

  list(): ConclusionRecord[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ConclusionRecord);
  }

  // Most recent conclusion for a similar command (topic-level match).
  latestSimilar(command: string, threshold = 0.5): ConclusionRecord | undefined {
    return this.list()
      .reverse()
      .find((r) => similarity(command, r.command) >= threshold);
  }

  // Mark an earlier conclusion as replaced. History is kept auditable
  // via the superseded* fields on the old record.
  markSuperseded(oldTs: string, newAnswer: string, reason: string): void {
    const all = this.list();
    const target = all.find((r) => r.ts === oldTs);
    if (!target) return;
    target.supersededBy = newAnswer;
    target.supersedeReason = reason;
    writeFileSync(this.path, all.map((r) => JSON.stringify(r)).join("\n") + "\n");
  }
}
