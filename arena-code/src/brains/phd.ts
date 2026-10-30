/**
 * PhD Brains — 박사급 엄밀함 + 노벨급 독창성 (6.0.0)
 * 논문급 재현성·비판적 문헌고찰·형식적 증명 스케치·apeer-review
 * 7명 추가 → 47 → 54명 체제
 */
import type { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { ReasoningEngine } from "./reasoning.js";
import { ContextEngine } from "./context.js";

function out(brain: Brain, idea: string, conf: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence: conf, tags, costMs: 0 };
}
abstract class PhdBase implements Brain {
  abstract id: string; abstract role: BrainRole; abstract layer: BrainLayer;
  abstract name: string; abstract description: string;
  version = "6.0.0";
  protected eng = new ReasoningEngine();
  protected ctx = new ContextEngine();
  protected learned: string[] = [];
  async learn(f: BrainFeedback){ if(f.lesson) this.learned.push(f.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

// 1. 방법론 박사 — 재현 가능한 연구설계
export class PhdMethodBrain extends PhdBase {
  id="genius-phd-method"; role="genius" as const; layer=4 as const;
  name="방법론 박사"; description="재현성·대조군·변수통제·ablation — 실험을 설계하는 박사";
  async think(input: BrainInput): Promise<BrainOutput>{
    const cause = this.eng.causalDecompose(input.task, input.context);
    return out(this,
`🎓 방법론 박사(PhD, 재현성):
질문→가설: "${input.task.slice(0,50)}"는 무엇이 달라지면 결과가 달라지는가?
설계: 독립변수 X=${cause.cause.slice(0,30)}, 종속 Y, 통제 Z=${cause.confounder}
대조군: 무처치/기존법/위약 — 3군으로 비교
ablation: 5개 부품 중 1개씩 빼보기 → 기여도 숫자로 증명
재현키트: 데이터·코드·시드·환경 전부 적기, 12살도 따라할 수 있게 레시피로
check: 단일 성공이 아닌 3회 반복 + 다른 날짜/장소에서도 같은가?`,0.89,["phd","method","reproducible","ablation","control"]);
  }
}
// 2. 증명 박사 — 형식적 증명 스케치
export class PhdProofBrain extends PhdBase {
  id="genius-phd-proof"; role="genius" as const; layer=4 as const;
  name="증명 박사"; description="불변식·복잡도·형식 증명 스케치 — 믿음이 아닌 증명으로";
  async think(input: BrainInput): Promise<BrainOutput>{
    const tot = this.eng.totExplore(input.task, input.context);
    return out(this,
`📐 증명 박사(PhD, 형식):
정리: “${input.task.slice(0,40)}은 조건 C에서 성질 P를 만족한다”
증명 스케치:
1) 불변식 I 찾기 — 루프/상태가 바뀌어도 안 바뀌는 것
2) 기저 사례 n=0에서 I 참
3) 귀납 단계 — I가 n에서 참이면 n+1에서도 참 (backtrack ${tot.backtracked?"필요":"없음"})
4) 종료 조건 + 복잡도 O(? ) — 100배 커져도 터지지 않는 이유
반례 찾기: I가 깨지는 입력이 있는가? 있으면 정리 수정 (Popper 반증)
=> 코드는 증명의 실행 버전`,0.88,["phd","proof","invariant","complexity","formal"]);
  }
}
// 3. 통계 박사 — p-hacking 방지, 검정력
export class PhdStatsBrain extends PhdBase {
  id="genius-phd-stats"; role="genius" as const; layer=4 as const;
  name="통계 박사"; description="검정력·신뢰구간·다중검정 보정 — 숫자를 속이지 않는 박사";
  async think(input: BrainInput): Promise<BrainOutput>{
    const bayes = this.eng.bayesianUpdate(input.task, (input as any).article?? input.context);
    return out(this,
`📊 통계 박사(PhD, 신뢰):
베이지안: ${bayes.map(h=>`${h.id}:${h.prior}->${h.posterior}${h.biasWarn?"⚠️":""}`).join(" ")}
경고: p=0.04 한 번으로 “발견!” 금지 — 검정력 0.8, n=? 미리 정했는가?
신뢰구간: 점추정 50% 말고 “30~70% [95% CI]”로 쓰기
다중검정: 20번 찔러 하나 맞은 건 Bonferroni로 나누기
=> 숫자는 “${input.task.slice(0,30)}은 [추정 40~60%]”처럼 불확실성까지 함께`,0.87,["phd","stats","bayesian","power","ci"]);
  }
}
// 4. 피어리뷰 박사 — 3인 심사위원 시뮬
export class PhdReviewBrain extends PhdBase {
  id="genius-phd-review"; role="critical" as const; layer=3 as const;
  name="피어리뷰 박사"; description="Reviewer 1,2,3이 되어 가장 아픈 질문 3개를 미리 던지는 박사";
  async think(input: BrainInput): Promise<BrainOutput>{
    const prior = input.priorOutputs.slice(-3).map(o=> o.idea.slice(0,40)).join(" / ");
    return out(this,
`🔍 피어리뷰 박사(PhD, 심사):
Reviewer1(방법): “대조군 없이 어떻게 인과라 하나? ${prior.slice(0,30)}에 교란이 있다”
Reviewer2(이론): “선행연구 X가 이미 반례를 보였다 — 인용 빠짐”
Reviewer3(유의성): “n이 작아 운 좋게 나온 것 아닌가? 재현 데이터는?”
메타리뷰: 세 질문 중 2개는 고치면 논문 살고, 1개는 치명적 — 먼저 고칠 것 1순위 제시
=> 디펜스 리허설: 답을 준비하지 못한 질문이 있으면 그 부분이 논문 구멍`,0.90,["phd","peer-review","defense","rebuttal"]);
  }
}
// 5. 윤리 박사 — bias·dual-use·FAIR
export class PhdEthicsBrain extends PhdBase {
  id="genius-phd-ethics"; role="critical" as const; layer=3 as const;
  name="윤리 박사"; description="편향·오용·재현윤리 — 연구가 세상을 아프게 하지 않게";
  async think(_input: BrainInput): Promise<BrainOutput>{
    return out(this,
`⚖️ 윤리 박사(PhD, 책임):
데이터 편향: 누구 데이터가 빠졌는가? (성별·연령·지역)
오용: 이 결과가 무기/사기/차별에 쓰이면? 차단책은?
FAIR: Findable·Accessible·Interoperable·Reusable — 남이 재현 가능하게 공개했는가?
저자 책임: “우리는 ~을 모른다”는 문장을 논문에 1개 이상 쓰기 — 겸손이 신뢰
=> 12살에게도 피해 생기는지 물어보기`,0.86,["phd","ethics","bias","fair","responsibility"]);
  }
}
// 6. 글쓰기 박사 — 논문 구조와 기여도
export class PhdWritingBrain extends PhdBase {
  id="genius-phd-writing"; role="design" as const; layer=2 as const;
  name="글쓰기 박사"; description="Abstract→Contribution→Limit→Future — 논문을 이야기로 쓰는 박사";
  async think(_input: BrainInput): Promise<BrainOutput>{
    return out(this,
`✍️ 글쓰기 박사(PhD, 논문):
Abstract 4문장: 문제(왜?)→방법(어떻게?)→결과(얼마나?)→의미(그래서?)
Contribution 3개: “우리는 X를 처음으로 Y로 보였다 (기존 대비 +Z%)”
Limit 솔직히: “이건 안 된다 — 데이터가 ~이라서, 다음엔 ~해야”
Future: 12살이 이어서 할 수 있는 다음 실험 1개 제안
그림 1장: 복잡한 걸 한 장 그림으로 — 그림이 이해 안 되면 글도 실패`,0.88,["phd","writing","contribution","limit","future"]);
  }
}
// 7. 혁신 박사 — 노벨급 독창성, 패러다임 전환
export class PhdInnovationBrain extends PhdBase {
  id="genius-phd-innovation"; role="genius" as const; layer=4 as const;
  name="혁신 박사"; description="모방 아닌 창조 — 기존 이론이 설명 못 하는 틈을 찾아 새 모델 제안";
  async think(input: BrainInput): Promise<BrainOutput>{
    const analogy = this.eng.analogicalBridge(input.task);
    const gedanken = this.eng.thoughtExperiment(input.task + " 극단");
    return out(this,
`💡 혁신 박사(PhD+Nobel, 독창):
틈 찾기: 기존 이론 ${analogy.source}가 “${input.task.slice(0,30)}”를 설명 못하면 그게 기회
가설 점프: ${gedanken}
새 모델: 기존 2개를 합치거나 뒤집어 “X는 사실 Y의 특수한 경우”라 주장
검증: 새 모델이면 예측이 달라야 — “우리 모델은 ~에서 기존과 다르게 ~라 예측” 1개 만들기
=> 기여도 한 줄: “세상은 이 문제를 ~라 봤지만, 우리는 ~라 보면 더 잘 설명된다”`,0.87,["phd","innovation","novelty","paradigm","abduction"]);
  }
}

export const PHD_BRAINS = [
  new PhdMethodBrain(), new PhdProofBrain(), new PhdStatsBrain(),
  new PhdReviewBrain(), new PhdEthicsBrain(), new PhdWritingBrain(), new PhdInnovationBrain()
];
