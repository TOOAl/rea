/**
 * Learning Bridge — Phase 3: MemoryBank + HarnessLibrary ↔ intent/quality 피드백 루프
 *
 * 개념: 같은 도메인(예: exam, video-DaVinci, ghidra) 반복 시 이전 교훈을 자동 주입해 점점 똑똑해짐
 * Harness² 논문 §4.2 Harnessing-level recursion — Library에 축적된 성공 하네스 + 교훈을 다음 작업 EvidenceTree에 전달
 *
 * 구조:
 *   .memory-bank/<domain>/  — 빠른 일기 (cue/content/evidence)
 *   .arena/harness2/library/<domain>/ — 깊은 도서관 (harness + EXPERIENCE.md)
 *
 * 흐름:
 *   1) 작업 시작 전: deriveDomain(intent|prompt) → retrieveLessons(query, domain) → 프롬프트에 Library Lessons 주입
 *   2) 작업 종료 후: recordLesson(taskId, intent, qualityReport, ledger) → 두 저장소에 교훈 기록
 *
 * 12살 설명: 복습 노트 — 틀린 문제를 노트에 적어두면 다음 시험에 같은 실수를 안 함
 */

import { MemoryBank } from "../memory/bank.js";
import { HarnessLibrary } from "../harness2/library.js";
import type { Intent } from "./intent.js";
import type { QualityReport } from "./outputQuality.js";
import type { EvidenceLedger } from "./evidenceLedger.js";

// ---------------------------------------------------------------------------
// Domain derivation
// ---------------------------------------------------------------------------

export function deriveDomain(intent: Intent | null, prompt: string): string {
  const text = prompt.toLowerCase();
  if (/밑줄|어법|수능|모의고사|exam.*grammar|underline.*error/i.test(prompt)) return "exam";
  if (/davinci|resolve|캡컷|capcut|영상.*편집|video.*edit/i.test(text)) return "video";
  if (/ghidra|바이너리|리버스|p-code|decompile/i.test(text)) return "ghidra";
  if (/유튜브|썸네일|youtube|구독|조회수/i.test(text)) return "youtube";
  if (intent) {
    // fallback by intent kind
    const kindMap: Record<string, string> = {
      question: "qa",
      implementation: "coding",
      analysis: "analysis",
      generation: "generation",
      chore: "chore",
    };
    return kindMap[intent.kind] ?? "general";
  }
  return "general";
}

// ---------------------------------------------------------------------------
// Retrieve — 작업 시작 전 자동 주입
// ---------------------------------------------------------------------------

export interface RetrievedLesson {
  source: "memory" | "library";
  cue: string;
  content?: string; // memory
  lesson?: string;  // library
  evidence?: string;
  score?: number;
}

export function retrieveLessons(opts: {
  query: string;
  domain: string;
  topK?: number;
  memoryRoot?: string;
  libraryRoot?: string;
}): RetrievedLesson[] {
  const topK = opts.topK ?? 3;
  const out: RetrievedLesson[] = [];

  // 1) MemoryBank — 빠른 일기
  try {
    const mem = new MemoryBank({ domain: opts.domain, root: opts.memoryRoot });
    const hits = mem.search(opts.query, topK);
    for (const h of hits) {
      out.push({ source: "memory", cue: h.cue, content: h.content, evidence: h.evidence });
    }
  } catch {}

  // 2) HarnessLibrary — 깊은 도서관 (TF-IDF + cue bonus)
  try {
    const lib = new HarnessLibrary({ domain: opts.domain, root: opts.libraryRoot });
    const hits = lib.search(opts.query, topK);
    for (const h of hits) {
      out.push({ source: "library", cue: h.cue, lesson: h.lesson, evidence: h.evidence, score: h.score });
    }
  } catch {}

  // 정렬은 Library score 우선, Memory는 뒤 — Library가 더 깊은 교훈
  out.sort((a, b) => (b.score ?? 0.5) - (a.score ?? 0.5));
  return out.slice(0, topK);
}

export function formatLessonsForPrompt(lessons: RetrievedLesson[]): string | null {
  if (lessons.length === 0) return null;
  const lines = ["## Library Lessons (same domain — auto-injected, verify before applying)", ""];
  for (const l of lessons) {
    if (l.source === "memory") {
      lines.push(`- [memory] cue: ${l.cue}`);
      lines.push(`  lesson: ${l.content}`);
      if (l.evidence) lines.push(`  evidence: ${l.evidence}`);
    } else {
      lines.push(`- [library score=${(l.score ?? 0).toFixed(3)}] cue: ${l.cue}`);
      lines.push(`  lesson: ${l.lesson}`);
      if (l.evidence) lines.push(`  evidence: ${l.evidence}`);
    }
    lines.push("");
  }
  lines.push("Rule: Apply only if evidence matches current task; otherwise ignore.");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Record — 작업 종료 후 교훈 축적
// ---------------------------------------------------------------------------

export function recordLesson(opts: {
  taskId: string;
  domain: string;
  intent: Intent | null;
  qualityReport: QualityReport | null;
  ledger: EvidenceLedger;
  lessonText?: string; // 명시적 교훈이 없으면 자동 생성
  memoryRoot?: string;
  libraryRoot?: string;
}): { memoryPath: string | null; libraryPath: string | null } {
  const { taskId, domain, intent, qualityReport, ledger } = opts;
  // 교훈 텍스트 결정: 명시적 → quality 이슈 → intent ambiguities
  let lesson = opts.lessonText?.trim() ?? "";
  if (!lesson && qualityReport && !qualityReport.ok) {
    lesson = `QualityGate 실패 교훈: ${qualityReport.issues.join("; ")} — 다음엔 ${qualityReport.checks.filter(c => !c.passed).map(c => c.id).join(",")}를 먼저 검증`;
  }
  if (!lesson && intent?.ambiguities?.length) {
    lesson = `의도 보완 교훈: ${intent.kind} (conf=${intent.confidence}) — ambiguities [${intent.ambiguities.join("; ")}]는 다음에 미리 질문`;
  }
  if (!lesson) {
    lesson = `${intent?.kind ?? "general"} 작업 완료 — provenance 보존으로 다음에도 동일한 품질 유지`;
  }

  const cue = `${domain} — ${intent?.kind ?? "task"} ${qualityReport?.ok ? "PASS" : "FAIL"} — ${lesson.slice(0, 80)}`;
  const evidence = `quality: ${qualityReport ? (qualityReport.ok ? "PASS" : qualityReport.issues.join("|")) : "unknown"}; ledger entries: ${ledger.list().length}`;

  let memoryPath: string | null = null;
  let libraryPath: string | null = null;

  // 1) MemoryBank — 항상 기록 (빠름, 가벼움)
  try {
    const mem = new MemoryBank({ domain, root: opts.memoryRoot });
    memoryPath = mem.add({ id: taskId, cue, content: lesson, evidence });
  } catch {}

  // 2) HarnessLibrary — quality PASS 또는 의미 있는 교훈만 기록 (깊음, 무거움)
  // 빈 하네스로도 EXPERIENCE.md만 기록 가능 — harness Tree는 최소 1개 파일 필요하므로 더미로 생성
  const shouldLibrary = (qualityReport?.ok || (lesson.length > 20 && !lesson.includes("general 작업 완료")));
  if (shouldLibrary) {
    try {
      const lib = new HarnessLibrary({ domain, root: opts.libraryRoot });
      const dummyHarness = { "LESSON.md": `# Lesson for ${taskId}\n\n${lesson}\n\nEvidence: ${evidence}\n` };
      libraryPath = lib.add({
        taskId,
        harness: dummyHarness,
        label: qualityReport?.ok ? "pass" : "learn",
        experience: { cue, lesson, evidence, confidence: String(intent?.confidence ?? "") },
      });
    } catch {}
  }

  return { memoryPath, libraryPath };
}
