import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AdjudicationRecord } from "./contracts.ts";

// Adjudication decision log: every conflict judgment (winner, loser,
// scores, who decided) is persisted so that later ground truth can be
// matched against the exact decision it confirms or refutes.
export class AdjudicationLog {
  private path: string;

  constructor(path: string) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
  }

  record(rec: Omit<AdjudicationRecord, "ts">): void {
    appendFileSync(
      this.path,
      JSON.stringify({ ...rec, ts: new Date().toISOString() }) + "\n",
    );
  }

  list(): AdjudicationRecord[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AdjudicationRecord);
  }

  latestForCommand(command: string): AdjudicationRecord | undefined {
    return this.list().reverse().find((r) => r.command === command);
  }
}
