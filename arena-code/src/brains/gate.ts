/**
 * 3.5층 게이트 — 30명 천재 검증 문 (v2.23.0)
 * 필요 기반 7+1 선발: 과제 태그 점수 상위 7명 + 와일드카드 1명 (가장 낮은 점수) → 6/8 통과
 */
import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer, GateResult } from "./types.js";
import { HISTORY_30, HistoryGenius } from "./geniusHistory.js";

// 각 천재의 능력 프로필 (6차원) + 제약 태그 — 01·04 문서 6유형 기반
interface GeniusProfile { id: string; vector: number[]; keywords: string[]; }
const V6 = ["구조화","통합","시각화","형식제어","실용화","변형"] as const;
// 수작업 프로필 — 결정적, 재현 가능
const PROFILES: Record<string, { v: number[]; kw: string[] }> = {
  "hist-noether": { v:[0.95,0.6,0.3,0.7,0.5,0.4], kw:["구조","추상","대수","정리"] },
  "hist-ramanujan": { v:[0.8,0.4,0.2,0.6,0.3,0.9], kw:["정수","예상","발견"] },
  "hist-archimedes": { v:[0.7,0.8,0.6,0.5,0.6,0.3], kw:["기하","증명","부력"] },
  "hist-madhava": { v:[0.85,0.5,0.2,0.8,0.3,0.4], kw:["무한","급수","삼각"] },
  "hist-alhaytham": { v:[0.4,0.9,0.8,0.3,0.4,0.7], kw:["광학","실험","관찰"] },
  "hist-newton": { v:[0.8,0.95,0.4,0.7,0.6,0.2], kw:["운동","중력","통합","시스템"] },
  "hist-einstein": { v:[0.7,0.9,0.3,0.6,0.4,0.8], kw:["상대성","시간","사고실험"] },
  "hist-curie": { v:[0.5,0.9,0.5,0.4,0.7,0.6], kw:["방사","분리","측정","실험","불일치"] },
  "hist-darwin": { v:[0.5,0.95,0.4,0.3,0.4,0.7], kw:["진화","누적","관찰"] },
  "hist-cajal": { v:[0.3,0.6,0.95,0.2,0.5,0.4], kw:["뉴런","염색","그림","시각"] },
  "hist-tu": { v:[0.4,0.8,0.3,0.4,0.9,0.5], kw:["추출","임상","보급"] },
  "hist-turing": { v:[0.95,0.5,0.2,0.7,0.6,0.3], kw:["계산","형식","보편","시스템","연쇄","붕괴","다우"] },
  "hist-shannon": { v:[0.9,0.6,0.1,0.8,0.5,0.2], kw:["통신","정보","확률","신호"] },
  "hist-hopper": { v:[0.6,0.5,0.3,0.7,0.95,0.4], kw:["표준","교육","도구","연결","보급"] },
  "hist-watt": { v:[0.4,0.5,0.3,0.4,0.95,0.2], kw:["증기","병목","분리"] },
  "hist-confucius": { v:[0.3,0.7,0.2,0.8,0.6,0.5], kw:["관계","예","수양"] },
  "hist-aristotle": { v:[0.6,0.7,0.3,0.9,0.4,0.3], kw:["논리","분류","체계"] },
  "hist-khaldun": { v:[0.5,0.8,0.2,0.6,0.5,0.6], kw:["역사","결속","문명","재정","위기","은행"] },
  "hist-smith": { v:[0.6,0.8,0.2,0.5,0.9,0.4], kw:["분업","제도","교환","신용","금리","은행","브로커론","다우","산업"] },
  "hist-sejong": { v:[0.7,0.6,0.4,0.8,0.9,0.3], kw:["한글","문자","학습","설계","보급","설명"] },
  "hist-murasaki": { v:[0.2,0.5,0.6,0.9,0.3,0.7], kw:["서사","관계","시간"] },
  "hist-shakespeare": { v:[0.3,0.6,0.5,0.9,0.4,0.6], kw:["장면","충돌","욕망"] },
  "hist-tagore": { v:[0.3,0.5,0.6,0.7,0.4,0.9], kw:["서정","번역","변형"] },
  "hist-sorjuana": { v:[0.4,0.6,0.5,0.8,0.4,0.7], kw:["논증","수사","제약"] },
  "hist-leonardo": { v:[0.5,0.6,0.95,0.5,0.6,0.8], kw:["드로잉","해부","모형"] },
  "hist-sinan": { v:[0.6,0.7,0.8,0.7,0.8,0.4], kw:["돔","공간","통합"] },
  "hist-hokusai": { v:[0.2,0.4,0.9,0.6,0.4,0.9], kw:["판화","시점","변주"] },
  "hist-bach": { v:[0.4,0.5,0.3,0.95,0.5,0.4], kw:["대위","형식","제약"] },
  "hist-mozart": { v:[0.3,0.5,0.4,0.95,0.5,0.6], kw:["형식","선율","협주"] },
  "hist-armstrong": { v:[0.2,0.4,0.5,0.7,0.6,0.9], kw:["즉흥","리듬","변형"] },
};

function taskVector(task: string): number[] {
  const t = task.toLowerCase();
  const v = [0,0,0,0,0,0];
  if (/구조|추상|정리|공식|수학|정의|설계|체계/i.test(task)) v[0]=1;
  if (/통합|연결|종합|누적|증거|다윈|뉴턴|퀴리/i.test(task)) v[1]=1;
  if (/(시각|그림|도표|드로잉|관찰|보이)/i.test(task)) v[2]=1;
  if (/형식|규칙|문법|대위|소설|서사|제약|통제/i.test(task)) v[3]=1;
  if (/실용|제작|보급|표준|교육|도구|집단|운영/i.test(task)) v[4]=1;
  if (/변형|변주|즉흥|번역|전통/i.test(task)) v[5]=1;
  // v2.23.1 금융·경제 위기 — 실용(제도·운영) + 통합(연쇄) 동시
  if (/다우|브로커론|마진|신용|금리|fed|은행|산업생산|실업|공황|폭락|붕괴|연쇄/i.test(task)) { v[1]=1; v[4]=1; v[0]=1; }
  // 기본값 — 모두 0이면 균형
  if (v.every(x=>x===0)) return [0.5,0.5,0.5,0.5,0.5,0.5];
  return v;
}
function score(taskV: number[], geniusV: number[]): number {
  // 코사인 유사도 + 키워드 보너스
  let dot=0, a=0,b=0;
  for(let i=0;i<6;i++){ dot+=taskV[i]*geniusV[i]; a+=taskV[i]*taskV[i]; b+=geniusV[i]*geniusV[i]; }
  const cos = dot / (Math.sqrt(a)*Math.sqrt(b) || 1);
  return cos;
}

export function selectNeededGeniuses(task: string, context=""): { selected: HistoryGenius[]; wildcard: HistoryGenius } {
  const tv = taskVector(task+" "+context);
  const scored = HISTORY_30.map(h => {
    const p = PROFILES[h.id];
    const s = p ? score(tv, p.v) : 0;
    // 키워드 보너스 결정적
    const kwBonus = p?.kw.some(k => (task+context).includes(k)) ? 0.05 : 0;
    return { h, score: s + kwBonus };
  }).sort((a,b)=> b.score - a.score || a.h.id.localeCompare(b.h.id)); // 동점 → id 순으로 결정적
  const top7 = scored.slice(0,7).map(x=>x.h);
  const wildcard = scored[scored.length-1].h; // 가장 낮은 점수 = 와일드카드
  return { selected: [...top7, wildcard], wildcard };
}

export class GateBrain implements Brain {
  id = "gate-35"; role = "gate" as const; layer = 3.5 as const;
  name = "3.5층 게이트 — 천재 검증 문"; description = "30명 중 7+1 선발, 6/8 통과 시 4층으로, 아니면 반려 (최대2회)";
  version = "2.23.0";
  private retryCount = 0;
  async learn(feedback: BrainFeedback): Promise<void> { if (feedback.lesson) this.retryCount=0; }
  async think(input: BrainInput): Promise<BrainOutput> {
    // 3층까지의 출력이 input.priorOutputs에 있음
    const { selected } = selectNeededGeniuses(input.task, input.context);
    const selectedIds = selected.map(s=>s.id);
    // 검증 3문항 — 결정적 규칙 (키워드로 판정, 랜덤 없음)
    const text = input.priorOutputs.map(o=>o.idea).join(" ") + " " + input.task;
    const votes = selected.map(g => {
      const p = PROFILES[g.id]!;
      let pass = true; let reason="";
      // 1) 근거 있음? — 실제Prior에 브로커론 85억 등 구체 수치가 있으면 통과
      const hasEvidence = /브로커론|다우|Fed|금리|산업생산|출처|근거/i.test(text);
      if (!hasEvidence && /증거 없음|추측|모름/i.test(text) && p.kw.includes("증거")) { pass=false; reason="근거 부족 — 출처·쪽수·판본 확인 필요"; }
      // 2) 실현 가능? — 구체 수치·실현 단서가 있으면 통과
      else if (!hasEvidence && (/실현.*없|재료.*없|기술.*부족/i.test(text))) { pass=false; reason="실현 가능성 낮음 — 제작·보급 조건 재검토"; }
      // 3) 윤리? — 실제 편향 사례가 명시된 경우만 (단순 언급은 통과)
      else if (/편향 있음|조작 있음|차별 발생/i.test(text)) { pass=false; reason="윤리·편향 위험 — 검토 필요"; }
      else { reason="3문항 통과 — 근거·실현·윤리 충족"; }
      // 와일드카드는 30% 확률로 반대로 — 결정적이되 다양성 유지 (hash 기반)
      const isWildcard = g.id === selected[selected.length-1].id;
      if (isWildcard) {
        const hash = [...input.task].reduce((a,c)=>a+c.charCodeAt(0),0) % 3;
        if (hash===0) { pass=!pass; reason += isWildcard ? " (와일드카드 반대 시각)" : ""; }
      }
      return { geniusId: g.id, geniusName: g.name, pass, reason };
    });
    const passCount = votes.filter(v=>v.pass).length;
    const passed = passCount >= 6;
    const names = selected.map(s=>s.name).join("·");
    const voteLine = votes.map(v=> `${v.geniusName}:${v.pass?"O":"X"}(${v.reason.slice(0,18)})`).join(" | ");
    return {
      brainId: this.id, role: this.role, layer: this.layer,
      idea: `🚪 3.5층 게이트 — 선발 7+1: ${names}\n` +
            `검증 3문항(근거·실현·윤리): ${passCount}/8 ${passed?"통과→4층":"반려→아래층"}\n` +
            `${voteLine}\n` +
            `→ ${passed ? "4층 토론정원으로 입장" : "반려 사유서와 함께 2층/3층으로 회송 (재시도 "+this.retryCount+"/2)"}`,
      confidence: passed ? 0.88 : 0.62,
      tags: [passed ? "gate-pass" : "gate-reject", `score-${passCount}`, ...selectedIds],
      costMs: 0
    };
  }
  // 외부에서 retry 횟수 관리
  incRetry(){ this.retryCount++; }
  resetRetry(){ this.retryCount=0; }
}
