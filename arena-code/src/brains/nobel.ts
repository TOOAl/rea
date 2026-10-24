/**
 * Nobel Brains — 노벨상 5분야 천재 (5.0.0)
 * 물리·의학·경제·문학·평화 각 노벨상 수상자 사고방식 증류
 * reasoning.ts Nobel Upgrade + context.ts Nobel Upgrade 활용
 */
import type { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { ReasoningEngine } from "./reasoning.js";
import { ContextEngine } from "./context.js";

function out(brain: Brain, idea: string, conf: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence: conf, tags, costMs: 0 };
}
abstract class NobelBase implements Brain {
  abstract id: string; abstract role: BrainRole; abstract layer: BrainLayer;
  abstract name: string; abstract description: string;
  version = "5.0.0";
  protected eng = new ReasoningEngine();
  protected ctx = new ContextEngine();
  protected learned: string[] = [];
  async learn(f: BrainFeedback){ if(f.lesson) this.learned.push(f.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

// ── 물리 — Einstein·Feynman 스타일: 사고실험 + 대칭 + 차원분석 ──
export class NobelPhysicsBrain extends NobelBase {
  id="genius-physics-nobel"; role="genius" as const; layer=4 as const;
  name="물리 노벨 천재"; description="Einstein 사고실험 + Feynman 도표 단순화 + 대칭/차원분석 — 극한으로 원리 드러내기";
  async think(input: BrainInput): Promise<BrainOutput>{
    const n = this.eng.nobelAnalyze(input.task, input.context, (input as any).article?? "");
    const c = n.nobel.causal;
    const ged = n.nobel.gedanken;
    const cf = n.nobel.counterfactual[0]?.alt ?? "";
    return out(this,
`⚛️ 물리 노벨 렌즈 (Einstein/Feynman):
사고실험: ${ged}
인과: ${c.cause} → ${c.mechanism} | 교란 ${c.confounder}
개입: ${c.intervention} / 반증 ${c.falsifier}
반사실: ${cf}
차원체크: 단위·극한(0/무한)에서도 식이 유지되는가? 아니면 붕괴 지점이 단서
=> 한 문장 원리: ${input.task.slice(0,40)} 의 보존량/대칭은 무엇인가?`,0.88,["nobel","physics","gedanken","causal","do-calculus"]);
  }
}
// ── 의학 — 증거위계 + 기전 + RCT 사고 ──
export class NobelMedicineBrain extends NobelBase {
  id="genius-medicine-nobel"; role="genius" as const; layer=4 as const;
  name="의학 노벨 천재"; description="기전→역학→RCT 위계, 베이지안 진단 — 불확실하면 [추정], 과신 편향 경고";
  async think(input: BrainInput): Promise<BrainOutput>{
    const n = this.eng.nobelAnalyze(input.task, input.context, (input as any).article?? "");
    const b = n.nobel.bayesian;
    const causal = n.nobel.causal;
    const top = b[0];
    return out(this,
`🧬 의학 노벨 렌즈 (증거위계):
베이지안: ${b.map(h=>`${h.id} 사전${h.prior}→사후${h.posterior} ${h.biasWarn??""}`).join(" | ")}
인과:${causal.cause} | ${causal.mechanism}
RCT 사고: 무작위 배정했다면 결과 달라지는가? 선택편향 점검
진단: ${top.hyp} 사후 ${top.posterior} — 증거 강도 ${top.likelihood} ${top.biasWarn??""}
=> 권고: 불확실 수치는 [추정] 표기, NNT/부작용 함께 제시`,0.86,["nobel","medicine","bayesian","rct","evidence"]);
  }
}
// ── 경제 — Kahneman·Thaler·Sen: 편향·유인·게임 ──
export class NobelEconomicsBrain extends NobelBase {
  id="genius-economics-nobel"; role="genius" as const; layer=4 as const;
  name="경제 노벨 천재"; description="Kahneman 이중과정·편향 교정 + Thaler 넛지 + Sen 역량접근 + 게임이론";
  async think(input: BrainInput): Promise<BrainOutput>{
    const n = this.eng.nobelAnalyze(input.task, input.context, (input as any).article?? "");
    const b = n.nobel.bayesian;
    const dial = n.nobel.dialectic;
    const biasNote = b.find(h=>h.biasWarn)?.biasWarn ?? "";
    return out(this,
`💹 경제 노벨 렌즈 (Kahneman/Thaler/Sen):
베이지안+편향: ${biasNote || "편향 없음"} — System1(빠름) vs System2(느림) 구분
유인: 누가 무엇을 원하고, 비용은 누가 치는가? (인센티브 지도)
게임: 상대가 내 수를 안다면? — 균형/협력/배반 시나리오
변증: ${dial.synthesis}
넛지: 선택을 강제 말고 기본값·프레이밍으로 유도
=> ${input.task.slice(0,40)} 의 “보이지 않는 거래”는?`,0.85,["nobel","economics","kahneman","nudge","game"]);
  }
}
// ── 문학 — Han Kang·PAMUK 스타일: 은유·다성성·서사 ──
export class NobelLiteratureBrain extends NobelBase {
  id="genius-literature-nobel"; role="genius" as const; layer=4 as const;
  name="문학 노벨 천재"; description="은유·다성성·서사 신뢰자 — 한 문장을 인간의 시간으로 번역";
  async think(input: BrainInput): Promise<BrainOutput>{
    const n = this.eng.nobelAnalyze(input.task, input.context, (input as any).article?? "");
    const analogy = n.nobel.analogy;
    const script = (input as any).article ?? input.task;
    const c = this.ctx.nobelAnalyze(input.context || "카드뉴스 대본", script);
    return out(this,
`📖 문학 노벨 렌즈 (은유·서사):
유추: ${analogy.mapping} | 한계 ${analogy.limit}
함축: ${c.impl.implicated} (${c.impl.maxim})
ToM: ${c.tom.mismatch} → ${c.tom.repair}
관련성 ${c.relevance.score}: ${c.relevance.filter12}
서사: ${input.task.slice(0,40)} 를 “한 사람 하루”로 축소 — 12살 주인공이 겪는 3장(기대→충돌→선택)으로
=> 한 문장 테제: 무엇을 느끼게 하고 싶은가 (정보보다 정서)`,0.84,["nobel","literature","analogy","implicature","narrative"]);
  }
}
// ── 평화 — 중재·탈에스컬레이션·공동체 ──
export class NobelPeaceBrain extends NobelBase {
  id="genius-peace-nobel"; role="genius" as const; layer=4 as const;
  name="평화 노벨 천재"; description="경계 짓기 대신 다리 놓기 — 공감+조건부 협력, 탈에스컬레이션 설계";
  async think(input: BrainInput): Promise<BrainOutput>{
    const dial = this.eng.dialectic([input.task, input.context || "반대 입장"]);
    const c = this.ctx.nobelAnalyze(input.context || "갈등 담론", input.task);
    return out(this,
`🕊️ 평화 노벨 렌즈 (중재):
변증 합성: ${dial.synthesis} — ${dial.tension}
공감보정: ${c.empathy.calibrate} | ${c.empathy.overUnder}
ToM 수리: ${c.tom.repair}
접지: 상대 수락 신호(끄덕임/“네”) 없으면 아무리 옳아도 전달 실패 — 먼저 수락부터 설계
탈에스컬: 비난→욕구→제안 순서, 공개 비난 대신 1:1 경청 통로
=> ${input.task.slice(0,40)} 의 공동 이익은? (상대가 이겨도 내가 잃지 않는 지점)`,0.87,["nobel","peace","empathy","dialectic","de-escalation"]);
  }
}

export const NOBEL_BRAINS = [
  new NobelPhysicsBrain(), new NobelMedicineBrain(), new NobelEconomicsBrain(), new NobelLiteratureBrain(), new NobelPeaceBrain()
];
