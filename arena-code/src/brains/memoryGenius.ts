/**
 * 1층 확장 — 기억·언어·맥락 3천재 (v2.23.0)
 * 역할: 프로젝트 의미를 정확히 파악, 어디에 어떤 기억/실패/모순이 있는지 지도, 전체 맥락 분석
 */
import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { BrainMemory } from "./memory.js";

function mkOutput(input: BrainInput, brain: Brain, idea: string, confidence: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence, tags, costMs: 0 };
}
abstract class BaseMemoryGenius implements Brain {
  abstract id: string; abstract role: BrainRole; abstract layer: BrainLayer;
  abstract name: string; abstract description: string;
  version = "2.23.0";
  protected learned: string[] = [];
  async learn(feedback: BrainFeedback): Promise<void> { if (feedback.lesson) this.learned.push(feedback.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

export class MemoryArchivistBrain extends BaseMemoryGenius {
  id = "memory-archivist"; role = "memory" as const; layer = 1 as const;
  name = "기억 천재 (지도 제작자)"; description = "어디에 어떤 기억이 저장됐는지, 어느 층에 어떤 실패·모순이 있는지 지도를 만든다";
  constructor(private memory: BrainMemory) { super(); }
  async think(input: BrainInput): Promise<BrainOutput> {
    const failures = this.memory.commonFailures(5);
    const lessons = this.memory.getLessons(input.task).length ? `${this.memory.getLessons(input.task).length}개 교훈` : "관련 교훈 없음";
    // 저장 위치 맵 — 5층 분류 기준
    const map = [
      "📍 1층: 실패로그(500) · 교훈(200) — commonFailures",
      "📍 1층 오류: 모순·왜곡( Loftus ) · AI미검증",
      "📍 2층 설계: 4층체계·GTD/PARA·이름짓기·FAIR",
      "📍 3층 창의: 6유형 씨앗·통계리터러시 10건",
      "📍 4층 천재: 30인 8분야 4단서술",
      "📍 5층 의장: 통합흐름·모방금지"
    ].join("\n");
    return mkOutput(input, this,
      `🗺️ 기억 지도 — "${input.task.slice(0,50)}"\n${map}\n` +
      `→ 과거 실패: ${failures.split("\n")[0] ?? "없음"}\n` +
      `→ 이 과제 관련: ${lessons}\n` +
      `→ 저장 위치: BrainMemory.errors[${(this as any).memory ? "500" : "?"}] + lessons[${input.task.slice(0,10)}]\n` +
      `→ 다음 층에 필요한 서랍: 1층 실패3개 + 2층 설계도 + 4층 천재 비교표`,
      0.88, ["memory-map", "archive", "location"]);
  }
}

export class LanguageInterpreterBrain extends BaseMemoryGenius {
  id = "memory-language"; role = "memory" as const; layer = 1 as const;
  name = "언어 천재 (의미 번역기)"; description = "프로젝트 문장의 숨은 뜻·모호함·전제를 정확히 파악한다";
  async think(input: BrainInput): Promise<BrainOutput> {
    const text = input.task + " " + input.context;
    const intents: string[] = [];
    if (/계획|설계|전략|목표/i.test(text)) intents.push("목표정의 필요");
    if (/AI|자동|생성|요약/i.test(text)) intents.push("AI 범위·승인조건 확인");
    if (/문서|지식|기억|학습/i.test(text)) intents.push("기억/외부 분리");
    if (/검증|오류|모순|실패/i.test(text)) intents.push("검증기준 명시");
    if (/속도|빨리|집중/i.test(text)) intents.push("용량·보급·철수조건");
    if (intents.length === 0) intents.push("일반 탐색형 — 대안 2개 이상 필요");
    const ambiguities: string[] = [];
    if (/빨리|최고|완벽/i.test(text)) ambiguities.push("‘빨리/최고’ 구체 수치 없음 → 일정·품질 기준 질문 필요");
    if (/모두|항상|절대/i.test(text)) ambiguities.push("‘모두/항상’ 과장 → 범위 한정 질문 필요");
    if (/알아서|적당히/i.test(text)) ambiguities.push("‘알아서’ 위임 모호 → 결정권·승인자 질문 필요");
    return mkOutput(input, this,
      `🔤 언어 해석 — "${input.task.slice(0,50)}"\n` +
      `→ 파악된 의도: ${intents.join(" · ")}\n` +
      `→ 숨은 전제: ${ambiguities.length ? ambiguities.join(" | ") : "없음 — 명확"}\n` +
      `→ 번역 결과: 목표=[${intents[0] ?? "?"}] 제약=[${ambiguities[0]?.slice(0,30) ?? "명시 필요"}] 행동=[다음 층에 전달할 질문 1개 생성]\n` +
      `→ 추천 질문: “누가, 언제, 무엇으로 성공을 판단하나요?”`,
      0.86, ["language", "intent", "disambiguation"]);
  }
}

export class ContextSynthesizerBrain extends BaseMemoryGenius {
  id = "memory-context"; role = "memory" as const; layer = 1 as const;
  name = "맥락 천재 (전체 조망)"; description = "전체 기억·실패·모순을 훑어 필요한 데이터만 골라 분석한다";
  constructor(private memory: BrainMemory) { super(); }
  async think(input: BrainInput): Promise<BrainOutput> {
    const prior = input.priorOutputs.map(o => o.brainId).join(", ");
    const failures = this.memory.commonFailures(3);
    // 전체 맥락 분석 — 5층 분류 + 실패 + 언어 분석 종합
    const needs = [];
    if (/기억|학습|인출|분산/i.test(input.task)) needs.push("03 기억학습: 인출 g=.499·분산 d=.54");
    if (/문서|정리|파일|검색/i.test(input.task)) needs.push("02 문서관리: 4층체계·이름짓기·FAIR");
    if (/천재|역사|전략/i.test(input.task)) needs.push("01 역사전략: 5원칙·30인 6유형");
    if (failures.includes("증거")) needs.push(`실패 이력: ${failures.split("\n")[0]}`);
    if (needs.length === 0) needs.push("범용: 목적→관측→대안→실행→측정 5단계");
    return mkOutput(input, this,
      `🌐 전체 맥락 — "${input.task.slice(0,40)}"\n` +
      `→ 1층 지도: ${prior.slice(0,80) || "아직 하부 없음"}\n` +
      `→ 필요한 데이터 3개: ${needs.slice(0,3).join(" | ")}\n` +
      `→ 분석: 이 과제는 ${needs[0]?.split(":")[0] ?? "일반"} 유형 → 2층 설계서에 포함해야 할 항목: 목표·가정·제약·대안·중단기준\n` +
      `→ 다음 층 전달: 맥락 요약 1줄 + 필수 데이터 좌표`,
      0.87, ["context", "synthesis", "needs"]);
  }
}
