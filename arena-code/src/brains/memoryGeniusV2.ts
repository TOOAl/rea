/**
 * Smart Memory Genius v2 — 7대 처방 통합 운영자 (2026-10-27)
 * D1 스코프4축 + D2 생명주기 + D3 하이브리드 + D4 Temporal + D5 자가편집 + D6 그래프 + D7 신뢰도
 * REA: mem0/letta/zep/langgraph 4종 흡수
 */
import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { BrainMemory } from "./memory.js";
import { MemoryBank, MemoryScope } from "../memory/bank.js";

function mkOutput(input: BrainInput, brain: Brain, idea: string, confidence: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence, tags, costMs: 0 };
}

export class SmartMemoryArchivistBrain implements Brain {
  id = "memory-archivist-v2";
  role: BrainRole = "memory";
  layer: BrainLayer = 1;
  name = "기억 천재 v2 (스마트 보관소)";
  description = "스코프·TTL·신뢰도·그래프·하이브리드·자가편집 — 일기장을 넘어 운영자가 된다";
  version = "5.0.0";
  private bank: MemoryBank;
  constructor(private memory: BrainMemory, root?: string, private domain = "arena-brain") {
    this.bank = new MemoryBank({ root, domain });
  }
  // 자가편집 — Council 피드백 시 호출 (D5 Letta)
  async learn(feedback: BrainFeedback): Promise<void> {
    if (feedback.lesson?.includes("틀렸") || feedback.reward < -0.5) {
      // 해당 lesson과 유사한 entry를 찾아 confidence 하락 또는 삭제
      const hits = this.bank.searchHybrid(feedback.note, 2);
      for (const h of hits) {
        if ((h.confidence ?? 0.7) > 0.5) this.bank.update(h.id, { confidence: Math.max(0.2, (h.confidence ?? 0.7)-0.2) }, `learn: ${feedback.lesson}`);
      }
    }
    if (feedback.lesson) this.memory.rememberError(feedback.targetId, feedback.note, feedback.lesson);
  }

  async think(input: BrainInput): Promise<BrainOutput> {
    // 스코프 추론: task에 user/agent/session 힌트 있으면 파싱
    const scope: MemoryScope = {};
    const mUser = /user[:=]\s*(\w+)/i.exec(input.task + " " + input.context);
    if (mUser) scope.user = mUser[1];
    const mAgent = /agent[:=]\s*(\w+)/i.exec(input.task + " " + input.context);
    if (mAgent) scope.agent = mAgent[1];
    const mSession = /session[:=]\s*(\w+)/i.exec(input.task + " " + input.context);
    if (mSession) scope.session = mSession[1];

    // D3 하이브리드 recall — confidence 0.5 이상, 7일 이내 우선
    const hits = this.bank.searchHybrid(input.task, 5, { minConfidence: 0.4 });
    const recentHits = this.bank.searchHybrid(input.task, 3, { timeWindowDays: 7, minConfidence: 0.4 });

    // D4 TTL 통계
    const all = this.bank.list({ includeExpired: false });
    const expiring = this.bank.list({ includeExpired: true }).length - all.length;
    const lowConf = all.filter(e=> (e.confidence ?? 0.7) < 0.5).length;

    // D6 그래프
    let triples: ReturnType<MemoryBank["toGraph"]> = [];
    try { triples = this.bank.toGraph(); } catch {}

    const failures = this.memory.commonFailures(3);
    const scopeStr = [scope.user?`user:${scope.user}`:"", scope.agent?`agent:${scope.agent}`:"", scope.session?`session:${scope.session}`:""].filter(Boolean).join(" ") || "shared(default)";

    const lines: string[] = [];
    lines.push(`🧠 스마트 기억 v2 — "${input.task.slice(0,40)}"`);
    lines.push(`→ 스코프: ${scopeStr} | 도메인: ${this.domain} | 전체 ${all.length}개 (만료 제외 ${expiring}개 숨김, 저신뢰 ${lowConf}개)`);
    if (hits.length) {
      lines.push(`→ 하이브리드 recall Top${hits.length} (confidence≥0.4, 최신성+신뢰도 가중):`);
      for (const h of hits.slice(0,3)) lines.push(`   • [${(h.confidence ?? 0.7).toFixed(2)}] ${h.cue} → ${h.content.slice(0,50)} (${h.createdAt.slice(0,10)})`);
    } else lines.push(`→ recall: 없음 — 이번이 첫 기록이면 ADD로 저장하세요`);
    if (recentHits.length) lines.push(`→ 최근 7일 집중: ${recentHits.map(r=>r.cue).join(" | ")}`);
    if (triples.length) lines.push(`→ 사실 그래프: ${triples.length} triple (예: ${triples[0].subject} —${triples[0].relation}→ ${triples[0].object})`);
    else lines.push(`→ 사실 그래프: 아직 triple 없음 — "A는 B를 C한다" 형태의 결정 문장을 저장하면 자동 그래프 생성`);
    lines.push(`→ 실패 로그: ${failures.split("\n")[0]}`);
    lines.push(`→ 자가편집: learn()에서 틀린 기억의 confidence를 -0.2 자동 하향 (Letta)`);
    lines.push(`→ 다음 행동: ${all.length===0 ? "이번 결정을 cue/content/evidence/confidence와 함께 addScoped({scope:{user:'나'}})로 저장" : `consolidate()로 중복 ${Math.floor(all.length*0.1)}개 예측 병합·TTL 만료 ${expiring}개 정리 가능`}`);
    lines.push(`→ 저장소: ${this.bank.dir} (+ 스코프별 하위 폴더)`);

    return mkOutput(input, this, lines.join("\n"), hits.length ? 0.88 : 0.82, ["smart-memory","hybrid","scoped","graph", `scope:${scopeStr}`]);
  }

  // 외부에서 직접 호출 가능한 운영 API — 실용 천재의 핵심
  proposeAdd(cue: string, content: string, opts?: { scope?: MemoryScope; ttlDays?: number; confidence?: number; evidence?: string }): { event: string; path: string|null } {
    const r = this.bank.addScoped({ id: `${Date.now()}__${cue.slice(0,20)}`, cue, content, evidence: opts?.evidence, scope: opts?.scope, confidence: opts?.confidence ?? 0.75, ttlDays: opts?.ttlDays });
    return { event: r.event, path: r.path };
  }
  consolidate(): { merged: number; expired: number } {
    return this.bank.consolidate();
  }
  graph(): ReturnType<MemoryBank["toGraph"]> { return this.bank.toGraph(); }
}
