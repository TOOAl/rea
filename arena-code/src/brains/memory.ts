/**
 * BrainMemory — 과거의 잘못과 오류를 기억하는 두뇌 (Layer 1 기반)
 * Harness2 Failures + MemoryBank 패턴 재활용, 두뇌별 자가학습 저장소
 */
import { BrainFeedback } from "./types.js";

export class BrainMemory {
  private lessons: Map<string, BrainFeedback[]> = new Map();
  private errors: { task: string; error: string; fix: string; at: string }[] = [];

  rememberError(task: string, error: string, fix: string) {
    this.errors.push({ task, error, fix, at: new Date().toISOString() });
    if (this.errors.length > 500) this.errors.shift();
  }

  addFeedback(fb: BrainFeedback) {
    const arr = this.lessons.get(fb.targetId) ?? [];
    arr.push(fb);
    if (arr.length > 200) arr.shift();
    this.lessons.set(fb.targetId, arr);
    if (fb.lesson) this.rememberError(fb.targetId, fb.note, fb.lesson);
  }

  getLessons(brainId: string): BrainFeedback[] {
    return this.lessons.get(brainId) ?? [];
  }

  /** 다음 생각 시 참고할 3줄 요약 */
  recall(brainId: string): string {
    const arr = this.getLessons(brainId);
    if (!arr.length) return "";
    const recent = arr.slice(-3);
    return recent.map(f => `• ${f.note} → ${f.lesson ?? `reward ${f.reward}`}`).join("\n");
  }

  /** 공통 실패 패턴 — 비판/오류 두뇌가 Council에 주입 */
  commonFailures(topN = 3): string {
    if (!this.errors.length) return "아직 큰 실패 없음 — 도전해봐!";
    const freq = new Map<string, number>();
    for (const e of this.errors) freq.set(e.error, (freq.get(e.error) ?? 0) + 1);
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
    return sorted.map(([err, n]) => `⚠️ ${err} (${n}회)`).join("\n");
  }

  serialize() {
    return { errors: this.errors, lessons: Object.fromEntries(this.lessons) };
  }

  static deserialize(data: any): BrainMemory {
    const m = new BrainMemory();
    m.errors = data.errors ?? [];
    for (const [k, v] of Object.entries(data.lessons ?? {})) m.lessons.set(k, v as any);
    return m;
  }
}
