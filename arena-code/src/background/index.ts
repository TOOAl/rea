/**
 * Background Agents — Muse Code의 영구 백그라운드 에이전트 포팅
 * 4개의 observer agents가 세션 내내 살아있으며, 다음 단계를 자율적으로 수행
 * 
 * Muse Code: 4개의 전문 observer가 품질 축을 감시
 * Arena Code: 경량 버전 — 메인 에이전트 완료 후 자동으로 follow-up 제안
 */
import { EventLog } from "../eventLog/index.js";

export type ObserverType = "security" | "performance" | "style" | "correctness";

export interface ObserverConfig {
  type: ObserverType;
  enabled: boolean;
  description: string;
  prompt: string;
}

const DEFAULT_OBSERVERS: ObserverConfig[] = [
  {
    type: "security",
    enabled: true,
    description: "보안 — 인젝션, 권한, 시크릿 노출 감시",
    prompt: "최근 변경에서 보안 문제를 검토하세요: 하드코딩된 시크릿, 인젝션, 권한 상승, 샌드박스 우회 등.",
  },
  {
    type: "performance",
    enabled: true,
    description: "성능 — N+1, 무한루프, 메모리 누수 감시",
    prompt: "최근 변경에서 성능 문제를 검토하세요: 불필요한 반복, 메모리 누수, 비효율적 알고리즘 등.",
  },
  {
    type: "style",
    enabled: true,
    description: "스타일 — 일관성, 네이밍, 포맷 감시",
    prompt: "최근 변경에서 스타일 문제를 검토하세요: 일관성 없는 네이밍, 포맷, 중복 코드 등.",
  },
  {
    type: "correctness",
    enabled: true,
    description: "정확성 — 버그, 엣지케이스, 타입 오류 감시",
    prompt: "최근 변경에서 정확성 문제를 검토하세요: 버그, 엣지 케이스, 타입 불일치, 에러 처리 누락 등.",
  },
];

export interface BackgroundTask {
  id: string;
  type: ObserverType;
  status: "pending" | "running" | "done" | "failed";
  input: string;
  result?: string;
  createdAt: string;
  finishedAt?: string;
}

export class BackgroundAgentManager {
  private observers: ObserverConfig[];
  private tasks: BackgroundTask[] = [];
  private eventLog: EventLog | null;

  constructor(eventLog?: EventLog) {
    this.observers = [...DEFAULT_OBSERVERS];
    this.eventLog = eventLog || null;
  }

  // Observer 설정
  setEnabled(type: ObserverType, enabled: boolean): void {
    const obs = this.observers.find(o => o.type === type);
    if (obs) obs.enabled = enabled;
  }

  getEnabled(): ObserverConfig[] {
    return this.observers.filter(o => o.enabled);
  }

  // 백그라운드 작업 생성 (실제로는 provider 호출을 모방)
  async spawnObserverTask(type: ObserverType, context: string, provider?: { streamChat: (req: unknown) => AsyncGenerator<{ type: string; text?: string }> }): Promise<BackgroundTask> {
    const config = this.observers.find(o => o.type === type);
    if (!config || !config.enabled) {
      return { id: `bg_${Date.now()}`, type, status: "failed", input: context, result: "Observer 비활성화됨", createdAt: new Date().toISOString() };
    }

    const task: BackgroundTask = {
      id: `bg_${Date.now()}_${type}`,
      type,
      status: "pending",
      input: context,
      createdAt: new Date().toISOString(),
    };
    this.tasks.push(task);
    this.eventLog?.append("background_spawn", { type, context: context.slice(0, 500) });

    // 실제 LLM 호출이 있으면 수행, 없으면 시뮬레이션
    if (provider) {
      task.status = "running";
      try {
        let result = "";
        const stream = provider.streamChat({
          system: config.prompt,
          messages: [{ role: "user", content: context }],
          tools: [],
          model: "observer",
        } as unknown);
        for await (const evt of stream) {
          if (evt.type === "text_delta" && evt.text) result += evt.text;
        }
        task.result = result || "(응답 없음)";
        task.status = "done";
      } catch (e: unknown) {
        task.result = `Observer 오류: ${e instanceof Error ? e.message : String(e)}`;
        task.status = "failed";
      }
      task.finishedAt = new Date().toISOString();
      this.eventLog?.append("background_result", { type, result: task.result?.slice(0, 500), status: task.status });
    } else {
      // Provider 없으면 간단한 휴리스틱 검사 (무료 fallback)
      task.result = this.heuristicCheck(type, context);
      task.status = "done";
      task.finishedAt = new Date().toISOString();
    }

    return task;
  }

  // LLM 없이 휴리스틱으로 간단 검사 (fallback)
  private heuristicCheck(type: ObserverType, context: string): string {
    const checks: Record<ObserverType, () => string> = {
      security: () => {
        const issues: string[] = [];
        if (/password|secret|api_key|apikey/i.test(context)) issues.push("하드코딩된 시크릿 의심");
        if (/eval\s*\(|innerHTML|dangerouslySetInnerHTML/.test(context)) issues.push("인젝션 위험 (eval/innerHTML)");
        if (/--yolo|--danger/.test(context)) issues.push("샌드박스 비활성화 플래그 사용");
        return issues.length > 0 ? `⚠️ 보안 이슈: ${issues.join(", ")}` : "✅ 보안 이슈 없음 (휴리스틱)";
      },
      performance: () => {
        const issues: string[] = [];
        if (/for\s*\(.*for\s*\(/.test(context)) issues.push("중첩 루프 (N²)");
        if (/setInterval.*setInterval/.test(context)) issues.push("중첩 타이머");
        return issues.length > 0 ? `⚠️ 성능 이슈: ${issues.join(", ")}` : "✅ 성능 이슈 없음 (휴리스틱)";
      },
      style: () => {
        const issues: string[] = [];
        if (/var\s+/.test(context)) issues.push("var 사용 (let/const 권장)");
        if (/console\.log/.test(context)) issues.push("console.log 남음 (제거 고려)");
        return issues.length > 0 ? `⚠️ 스타일 이슈: ${issues.join(", ")}` : "✅ 스타일 이슈 없음 (휴리스틱)";
      },
      correctness: () => {
        const issues: string[] = [];
        if (/==(?!=)/.test(context)) issues.push("== 사용 (=== 권장)");
        if (/catch\s*\(\s*\)/.test(context)) issues.push("빈 catch 블록");
        return issues.length > 0 ? `⚠️ 정확성 이슈: ${issues.join(", ")}` : "✅ 정확성 이슈 없음 (휴리스틱)";
      },
    };
    return checks[type]();
  }

  // 모든 활성화된 observer를 병렬로 실행
  async runAllObservers(context: string): Promise<BackgroundTask[]> {
    const enabled = this.getEnabled();
    const promises = enabled.map(obs => this.spawnObserverTask(obs.type, context));
    return Promise.all(promises);
  }

  // 결과 요약 (reconciler — Muse Code의 reconciler 근사)
  reconcile(results: BackgroundTask[]): { accepted: BackgroundTask[]; rejected: BackgroundTask[]; summary: string } {
    const accepted: BackgroundTask[] = [];
    const rejected: BackgroundTask[] = [];

    for (const r of results) {
      // "✅" 포함 시 문제 없음 → rejected (제안할 것 없음)
      // "⚠️" 포함 시 실제 이슈 → accepted
      if (r.result?.includes("⚠️")) {
        accepted.push(r);
      } else {
        rejected.push(r);
      }
    }

    const summary = accepted.length > 0
      ? `🔍 Background Observers: ${accepted.length}개 이슈 발견\n${accepted.map(a => `  - [${a.type}] ${a.result}`).join("\n")}`
      : `✅ Background Observers: 이슈 없음 (${results.length}개 검사 완료)`;

    return { accepted, rejected, summary };
  }

  get tasks_history(): BackgroundTask[] {
    return [...this.tasks];
  }
}
