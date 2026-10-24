import { describe, expect, it } from "vitest";
import { deriveDomain, retrieveLessons, formatLessonsForPrompt, recordLesson } from "../src/loop/learningBridge.js";
import { EvidenceLedger } from "../src/loop/evidenceLedger.js";
import { classifyIntent } from "../src/loop/intent.js";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Phase 3 — deriveDomain", () => {
  it("exam 문맥 → exam", () => {
    const intent = classifyIntent([{ role: "user", content: "29 다음 글의 밑줄 친 부분 중 틀린 것은?" }]);
    expect(deriveDomain(intent, "29 다음 글의 밑줄 친 부분 중 틀린 것은?")).toBe("exam");
  });

  it("DaVinci → video", () => {
    expect(deriveDomain(null, "DaVinci Resolve 21.3.7 비디오 편집")).toBe("video");
  });

  it("ghidra → ghidra", () => {
    expect(deriveDomain(null, "ghidra로 p-code 분석해줘")).toBe("ghidra");
  });

  it("의도만 있고 키워드 없으면 intent kind fallback", () => {
    const intent = classifyIntent([{ role: "user", content: "What is 2+2?" }]);
    expect(deriveDomain(intent, "What is 2+2?")).toBe("qa");
  });
});

describe("Phase 3 — Learning Bridge retrieve/record", () => {
  it("record 후 다음 retrieve에서 같은 도메인 교훈이 조회됨 (learning 축적)", () => {
    const tmpMem = mkdtempSync(join(tmpdir(), "rea-mem-"));
    const tmpLib = mkdtempSync(join(tmpdir(), "rea-lib-"));
    const ledger = new EvidenceLedger();
    ledger.add({ kind: "observation", source: "Read(a.txt)", content: "evidence", confidence: 1 });

    // 첫 작업: exam 도메인 FAIL 교훈 기록
    recordLesson({
      taskId: "exam-task-29",
      domain: "exam",
      intent: classifyIntent([{ role: "user", content: "29 어법 문항" }]),
      qualityReport: { ok: false, issues: ["정답 누수", "밑줄 부족"], checks: [{ id: "noAnswerLeak", passed: false, message: "fail", severity: "must" as const }, { id: "underlineCount", passed: false, message: "2/5 부족", severity: "must" as const }] },
      ledger,
      lessonText: "어법 문항은 밑줄 5개와 정답 접힘을 항상 검증",
      memoryRoot: join(tmpMem, ".memory-bank"),
      libraryRoot: join(tmpLib, ".arena/harness2/library"),
    });

    // 두 번째 작업: 동일 도메인/유사 쿼리로 교훈 자동 주입 확인
    const lessons = retrieveLessons({
      query: "밑줄 친 부분 어법 틀린 것 고르기 30번",
      domain: "exam",
      topK: 3,
      memoryRoot: join(tmpMem, ".memory-bank"),
      libraryRoot: join(tmpLib, ".arena/harness2/library"),
    });
    expect(lessons.length).toBeGreaterThan(0);
    const formatted = formatLessonsForPrompt(lessons);
    expect(formatted).toContain("Library Lessons");
    expect(lessons.some(l => l.source === "memory")).toBe(true);
  });

  it("다른 도메인에는 조회되지 않음 (도메인 격리)", () => {
    const tmpMem = mkdtempSync(join(tmpdir(), "rea-mem-iso-"));
    const tmpLib = mkdtempSync(join(tmpdir(), "rea-lib-iso-"));
    const ledger = new EvidenceLedger();
    ledger.add({ kind: "observation", source: "tool", content: "x", confidence: 1 });
    recordLesson({
      taskId: "video-1",
      domain: "video",
      intent: null,
      qualityReport: null,
      ledger,
      lessonText: "DaVinci 편집 시 16:9 1920x1080 설정",
      memoryRoot: join(tmpMem, ".memory-bank"),
      libraryRoot: join(tmpLib, ".arena/harness2/library"),
    });

    const lessons = retrieveLessons({
      query: "DaVinci 16:9 편집",
      domain: "exam", // 다른 도메인으로 조회
      topK: 3,
      memoryRoot: join(tmpMem, ".memory-bank"),
      libraryRoot: join(tmpLib, ".arena/harness2/library"),
    });
    expect(lessons.length).toBe(0);
  });

  it("formatLessonsForPrompt — 빈 교훈은 null", () => {
    expect(formatLessonsForPrompt([])).toBeNull();
  });
});
