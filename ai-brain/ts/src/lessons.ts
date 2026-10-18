import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface Lesson {
  command: string;
  attempt: number;
  issues: string[];
  ts: string;
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

// Lesson store: the memory axis of the self-improvement loop.
// Failures are recorded with their verification issues and injected back
// into later reasoning contexts as [교훈] entries.
export class LessonStore {
  private path: string;

  constructor(path: string) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
  }

  record(command: string, attempt: number, issues: string[]): void {
    const lesson: Lesson = { command, attempt, issues, ts: new Date().toISOString() };
    appendFileSync(this.path, JSON.stringify(lesson) + "\n");
  }

  retrieve(query: string, limit = 3): string[] {
    if (!existsSync(this.path)) return [];
    const lessons = readFileSync(this.path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Lesson);
    return lessons
      .map((lesson) => ({ lesson, score: similarity(query, lesson.command) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(
        (x) =>
          `[교훈] "${x.lesson.command}" 시도#${x.lesson.attempt} 실패 이슈: ${x.lesson.issues.join("; ")}`,
      );
  }
}
