/**
 * Concrete Brains — 4층 7개 두뇌 구현 (교체 가능한 기본 세트)
 * Layer 4 (하늘): 천재들 — 도메인별 전문
 * Layer 3 (작업실): 창의적 + 비판적 — 아이디어 발산/검증
 * Layer 2 (설계실): 설계 두뇌 — 구조를 짠다
 * Layer 1 (지하): 오류/모순 분석 + 기억 — 과거 실패를 지킨다
 */
import { Brain, BrainInput, BrainOutput, BrainFeedback } from "./types.js";
import { BrainMemory } from "./memory.js";
import {
  CinematicBrain,
  VisualDesignBrain,
  AudioFocusBrain,
} from "./visual.js";
import {
  GeneratorBrain,
  VerifierBrain,
  RefinerBrain,
  ToTBrain,
  ValidatorBrain,
  EcoBrain,
  SisrBrain,
} from "./reasoning.js";
import {
  MemoryHistoryBrain,
  KnowledgeArchitectBrain,
  FactCheckerBrain,
  StatsLiteracyBrain,
} from "./knowledge.js";
import { createHistoryBrains } from "./geniusHistory.js";
import {
  MemoryArchivistBrain,
  LanguageInterpreterBrain,
  ContextSynthesizerBrain,
} from "./memoryGenius.js";
import { SmartMemoryArchivistBrain } from "./memoryGeniusV2.js";
import {
  HistoryStrategistBrain,
  ManagementStrategistBrain,
  EngineeringDesignerBrain,
} from "./strategist.js";
import { GateBrain } from "./gate.js";
import { ArticleInputBrain } from "./articleInput.js";
import {
  PremiseErrorBrain,
  ContradictionBrain,
  CriticalThinkingBrain,
} from "./premiseGuard.js";
import { NOBEL_BRAINS } from "./nobel.js";
import { PHD_BRAINS } from "./phd.js";

function mkOutput(
  input: BrainInput,
  brain: Brain,
  idea: string,
  confidence: number,
  tags: string[],
): BrainOutput {
  return {
    brainId: brain.id,
    role: brain.role,
    layer: brain.layer,
    idea,
    confidence,
    tags,
    costMs: 0,
  };
}

abstract class BaseBrain implements Brain {
  abstract id: string;
  abstract role: Brain["role"];
  abstract layer: Brain["layer"];
  abstract name: string;
  abstract description: string;
  version = "4.0.0";
  protected learned: string[] = [];
  async learn(feedback: BrainFeedback): Promise<void> {
    if (feedback.lesson) this.learned.push(feedback.lesson);
  }
  abstract think(input: BrainInput): Promise<BrainOutput>;
  protected recall(memory?: BrainMemory): string {
    return memory?.recall(this.id) ?? "";
  }
}

// ─── Layer 1: 기억 + 오류 ───
export class MemoryBrain extends BaseBrain {
  id = "memory-keeper";
  role = "memory" as const;
  layer = 1 as const;
  name = "기억 도서관 사서";
  description =
    "과거에 실패한 방법과 이유를 전부 기억한다. 같은 실수를 막는다.";
  constructor(private memory: BrainMemory) {
    super();
  }
  async think(input: BrainInput): Promise<BrainOutput> {
    const failures = this.memory.commonFailures(3);
    const recall = this.recall(this.memory);
    return mkOutput(
      input,
      this,
      `📚 기억을 뒤져봤어!\n과거 실패:\n${failures}\n내가 배운 것:\n${recall || "(아직 없음)"}\n→ 이번 작업 "${input.task.slice(0, 60)}"에서 피해야 할 것은 위 실패 패턴이야.\nselfCheck: 내 답변 수치/주장 2개는 출처 필요? (불확실하면 [추정] 표기)`,
      0.85,
      ["memory", "fail-history"],
    );
  }
}

export class ErrorBrain extends BaseBrain {
  id = "error-analyzer";
  role = "error" as const;
  layer = 1 as const;
  name = "모순 탐정";
  description = "말과 글의 모순, 논리 오류, 빠진 증거를 찾는다.";
  async think(input: BrainInput): Promise<BrainOutput> {
    const prior = input.priorOutputs
      .map((o) => o.idea)
      .join(" | ")
      .slice(0, 200);
    return mkOutput(
      input,
      this,
      `🔍 모순 검사!\n다른 두뇌 의견: "${prior || "아직 없음"}"\n→ 논리 구멍: ① 증거 없는 주장 있음? ② 두 의견이 서로 충돌? ③ 빠진 경우의 수 있음?\n내 결론: 충돌 있으면 “증거를 대라”고 요구한다.\nselfCheck: 내 답변 수치/주장 2개는 출처 필요?`,
      0.88,
      ["logic", "contradiction"],
    );
  }
}

// ─── Layer 2: 설계 ───
export class DesignBrain extends BaseBrain {
  id = "design-architect";
  role = "design" as const;
  layer = 2 as const;
  name = "설계 건축가";
  description = "아이디어를 도면으로 바꾼다. 순서와 역할을 정한다.";
  async think(input: BrainInput): Promise<BrainOutput> {
    const prior = input.priorOutputs
      .slice(-2)
      .map((o) => `(${o.brainId}) ${o.idea.slice(0, 80)}`)
      .join("\n");
    return mkOutput(
      input,
      this,
      `🏗️ 설계도 초안!\n참고 의견:\n${prior || "(창의/비판 의견 대기)"}\n→ 1단계: 가장 작은 성공 만들기\n→ 2단계: 검증 장치 달기\n→ 3단계: 확장 연결하기\n이 순서로 하면 어느 두뇌가 빠져도 무너지지 않는다.`,
      0.82,
      ["plan", "structure"],
    );
  }
}

// ─── Layer 3: 창의 + 비판 ───
export class CreativeBrain extends BaseBrain {
  id = "creative-dreamer";
  role = "creative" as const;
  layer = 3 as const;
  name = "창의 발명가";
  description = "말도 안 되는 아이디어도 낸다. 틀려도 괜찮다.";
  async think(input: BrainInput): Promise<BrainOutput> {
    return mkOutput(
      input,
      this,
      `💡 야생 아이디어 3개!\nA) 반대로 하기: "${input.task}"를 뒤집으면? (예: 삭제 대신 숨기기)\nB) 합치기: 두 기능을 하나로 합치면?\nC) 없애기: 가장 당연한 부분을 빼면?\n→ 셋 중 하나는 보석일 수 있다!`,
      0.75,
      ["diverge", "wild-ideas"],
    );
  }
}

export class CriticalBrain extends BaseBrain {
  id = "critical-judge";
  role = "critical" as const;
  layer = 3 as const;
  name = "비판 심사관";
  description = "좋은 아이디어도 3번 깎는다. 살아남은 것만 통과.";
  async think(input: BrainInput): Promise<BrainOutput> {
    const creative = input.priorOutputs.find((o) => o.role === "creative");
    return mkOutput(
      input,
      this,
      `⚖️ 비판 심사!\n창의안: "${creative?.idea.slice(0, 120) ?? input.task.slice(0, 80)}"\n→ 질문 1: 12살이 이해 못 하면 실패인가?\n→ 질문 2: 내일 갑자기 100배 커지면 터지는가?\n→ 질문 3: 가장 귀찮은 사람이 써도 되는가?\n이 3개를 통과해야 합격.`,
      0.87,
      ["converge", "stress-test"],
    );
  }
}

// ─── Layer 4: 천재들 (도메인별) ───
export class GeniusBrain extends BaseBrain {
  id: string;
  role = "genius" as const;
  layer = 4 as const;
  name: string;
  description: string;
  constructor(
    id: string,
    name: string,
    description: string,
    private expertise: string,
  ) {
    super();
    this.id = id;
    this.name = name;
    this.description = description;
  }
  async think(input: BrainInput): Promise<BrainOutput> {
    return mkOutput(
      input,
      this,
      `🧠 천재[${this.name}] — 분야: ${this.expertise}\n→ "${input.task.slice(0, 80)}"를 내 분야 언어로 번역하면: “${this.expertise}에서 이미 풀린 문제다”.\n→ 내 도구 상자에서 꺼낸 해법: ${this.expertise}의 1등 공식을 그대로 적용한다.`,
      0.8,
      ["expertise", this.expertise],
    );
  }
}

/** 기본 5층 세트 공장 — v6 PhD+Nobel: 54명 (47 + 박사 7) — 1층 7천재 + 2층 3전략가 + 4층 노벨5·박사7 + 3.5층 게이트 */
export function createDefaultBrains(memory: BrainMemory): Brain[] {
  return [
    new MemoryBrain(memory),
    new ErrorBrain(),
    // v2.23.0 1층 3천재 — 지도·언어·맥락 + v2.24.0 기사입력 + v2.25.0 전제검증 3천재
    new MemoryArchivistBrain(memory),
    new LanguageInterpreterBrain(),
    new ContextSynthesizerBrain(memory),
    new SmartMemoryArchivistBrain(memory),
    new ArticleInputBrain(memory),
    new PremiseErrorBrain(memory),
    new ContradictionBrain(),
    new CriticalThinkingBrain(),
    new DesignBrain(),
    // v2.23.0 2층 3전략가 — 역사·경영·공학
    new HistoryStrategistBrain(),
    new ManagementStrategistBrain(),
    new EngineeringDesignerBrain(),
    new CreativeBrain(),
    new CriticalBrain(),
    new GeniusBrain(
      "genius-code",
      "코드 천재",
      "10만 줄도 읽고 버그를 맡는다",
      "Software Engineering",
    ),
    new GeniusBrain(
      "genius-math",
      "수학 천재",
      "공식을 증명하듯 논리를 세운다",
      "Mathematics",
    ),
    new GeniusBrain(
      "genius-art",
      "예술 천재",
      "12살이 좋아할 그림과 이야기로 바꾼다",
      "Art & Storytelling",
    ),
    new CinematicBrain(),
    new VisualDesignBrain(),
    new AudioFocusBrain(),
    new GeneratorBrain(),
    new VerifierBrain(),
    new RefinerBrain(),
    new ToTBrain(),
    new ValidatorBrain(),
    new EcoBrain(),
    new SisrBrain(),
    // v2.22.0 지식 4 — 문서·학습·검증·통계
    new MemoryHistoryBrain(memory),
    new KnowledgeArchitectBrain(),
    new FactCheckerBrain(),
    new StatsLiteracyBrain(),
    // v2.22.0 역사 8 — 8분야 30인
    ...createHistoryBrains(),
    // v5 Nobel 5 — 물리·의학·경제·문학·평화 (Nobel Upgrade)
    ...NOBEL_BRAINS,
    // v6 PhD 7 — 박사급 엄밀함 + 노벨급 독창성
    ...PHD_BRAINS,
    // v2.23.0 3.5층 게이트
    new GateBrain(),
    new CouncilBrain(),
  ];
}

// ─── Layer 5: 토론 독립실 — 아래층을 필요할 때 부르는 의장 ───
export class CouncilBrain extends BaseBrain {
  id = "council-chair";
  role = "council" as const;
  layer = 5 as const;
  name = "의회 의장";
  description =
    "5층 독립 토론실. 아래 4개 층의 의견을 모아 토론하고, 필요하면 아래층에 다시 요청해 최종 결론을 낸다.";
  async think(input: BrainInput): Promise<BrainOutput> {
    const summary = input.priorOutputs
      .map((o) => `${o.layer}층 ${o.brainId}: ${o.idea.slice(0, 100)}`)
      .join("\n");
    const needsMemory = !summary.includes("기억") || !summary.includes("실패");
    const needsCheck = summary.includes("충돌") || summary.includes("모순");
    let requestNote = "→ 하부 보고서가 충분하면 바로 토론 진행.\n";
    if (needsMemory)
      requestNote += "→ 1층 기억창고에 ‘과거 실패’ 추가 요청 예정!\n";
    if (needsCheck)
      requestNote += "→ 1층 모순탐정에 ‘논리 재검증’ 요청 예정!\n";
    return mkOutput(
      input,
      this,
      `🎓 5층 의회 시작! (독립 토론실)\n아래층 보고서 요약:\n${summary.slice(0, 300) || "(보고서 수신 중)"}\n${requestNote}→ 투표로 합의문 작성. 아래층은 필요할 때만 부른다 — 왔다갔다 하지 않고 순서대로 흐른다!`,
      0.9,
      ["council", "chair"],
    );
  }
}
