/**
 * 2층 확장 — 역사·경영·공학 전략 3천재 (v2.23.0)
 * 출처: 01_역사전략가, 02_경영전략가, 03_공학설계자, 04_통합분석
 */
import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";

function mkOutput(input: BrainInput, brain: Brain, idea: string, confidence: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence, tags, costMs: 0 };
}
abstract class BaseStrategist implements Brain {
  abstract id: string; abstract role: BrainRole; abstract layer: BrainLayer;
  abstract name: string; abstract description: string;
  version = "2.23.0";
  protected learned: string[] = [];
  async learn(feedback: BrainFeedback): Promise<void> { if (feedback.lesson) this.learned.push(feedback.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

export class HistoryStrategistBrain extends BaseStrategist {
  id = "strategist-history"; role = "strategist" as const; layer = 2 as const;
  name = "역사 전략가 (손자·나폴레옹·클라우제비츠)"; description = "목표부터 고정·정보품질 점검·병목 집중·중단기준·학습 장치 — 5원칙";
  async think(input: BrainInput): Promise<BrainOutput> {
    return mkOutput(input, this,
      `⚔️ 역사 전략 — "${input.task.slice(0,40)}"\n` +
      `1) 목표 고정: 정치적 목적(클라우제비츠) — 무엇을 위해? 비목표는?\n` +
      `2) 정보 점검: 사실/추정/미확인 분리(손자) — 상대·환경·지형 정보 신뢰도는?\n` +
      `3) 병목 집중: 결정적 지점에 자원(나폴레옹) + 보급·용량·철수조건 동시 설계\n` +
      `4) 중단기준: 계속/중단 조건 사전 합의\n` +
      `5) 학습장치: 관측-해석-결정-행동 반복\n` +
      `→ 산출: 문제정의서·가정로그·의존성지도 중 1개`,
      0.84, ["history-strategy", "5원칙", "중단기준"]);
  }
}
export class ManagementStrategistBrain extends BaseStrategist {
  id = "strategist-management"; role = "strategist" as const; layer = 2 as const;
  name = "경영 전략가 (드러커·도요타·사이먼·보이드)"; description = "목표책임·흐름·제한합리성·OODA — 6리듬 운영";
  async think(input: BrainInput): Promise<BrainOutput> {
    return mkOutput(input, this,
      `📊 경영 전략 — "${input.task.slice(0,40)}"\n` +
      `① 목표: 3~5개 핵심결과(드러커) — 지표 부작용 점검\n` +
      `② 흐름: 수요·용량·병목 시각화(TPS)·이상 시 중단 권한\n` +
      `③ 결정: 기준·탐색한도·가역성 기록(사이먼) — 가역이면 빠르게, 비가역이면 검토\n` +
      `④ 학습: 관측 신호·재검토 시점 정하고 작게 실행(OODA)\n` +
      `⑤ 개선: 중단→격리→원인→표준 개선(TPS)\n` +
      `→ 산출: 목표트리·업무흐름도·결정기록`,
      0.83, ["management", "TPS", "OODA"]);
  }
}
export class EngineeringDesignerBrain extends BaseStrategist {
  id = "strategist-engineering"; role = "strategist" as const; layer = 2 as const;
  name = "공학 설계자 (레오나르도·라이트·NASA)"; description = "관찰연결·맥락통합·추적검증 — 성숙도 6문항";
  async think(input: BrainInput): Promise<BrainOutput> {
    return mkOutput(input, this,
      `🏗️ 공학 설계 — "${input.task.slice(0,40)}"\n` +
      `▷ 레오나르도: 관찰-가설-실험-검증 라벨, 제작가능성 조기 확인\n` +
      `▷ 라이트: 사용자여정·장소·접근성·운영을 요구사항에 포함\n` +
      `▷ NASA: 이해관계자→요건→분해→대안평가→통합검증 추적성\n` +
      `체크: 문제정의/요구사항/대안2개/인터페이스/검증/운영 6문항\n` +
      `→ 산출: 요구사항 추적표·대안비교표·검증계획`,
      0.85, ["engineering", "NASA", "추적성"]);
  }
}
