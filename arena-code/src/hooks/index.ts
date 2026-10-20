/**
 * Hook System — Phase 2
 * Lifecycle hooks inspired by Claude Code hooks + Codex middleware
 *
 * Available hooks:
 *   sessionStart  — 세션 시작 직후
 *   preToolUse    — 도구 실행 전 (input 수정/차단 가능)
 *   postToolUse   — 도구 실행 후 (result 수정 가능)
 *   postTurn      — 각 턴 종료 후
 *   preCompact    — 컨텍스트 압축 전
 *   sessionEnd    — 세션 종료
 */

export type HookEvent =
  | "sessionStart"
  | "preToolUse"
  | "postToolUse"
  | "postTurn"
  | "preCompact"
  | "sessionEnd";

export interface HookContext {
  cwd: string;
  event: HookEvent;
  toolName?: string;
  input?: Record<string, unknown>;
  result?: string;
  turn?: number;
  messages?: unknown[];
}

export interface HookResult {
  // preToolUse에서 block=true면 해당 도구 실행 차단
  block?: boolean;
  reason?: string;
  // input/result를 수정하려면 새 값 반환
  modifiedInput?: Record<string, unknown>;
  modifiedResult?: string;
}

export type HookHandler = (ctx: HookContext) => Promise<HookResult | void> | HookResult | void;

interface HookEntry {
  event: HookEvent;
  handler: HookHandler;
  source: string;
}

export class HookManager {
  private hooks: HookEntry[] = [];

  on(event: HookEvent, handler: HookHandler, source = "builtin"): this {
    this.hooks.push({ event, handler, source });
    return this;
  }

  off(event: HookEvent, handler: HookHandler): this {
    this.hooks = this.hooks.filter((h) => !(h.event === event && h.handler === handler));
    return this;
  }

  forEvent(event: HookEvent): HookEntry[] {
    return this.hooks.filter((h) => h.event === event);
  }

  get size(): number { return this.hooks.length; }

  /**
   * preToolUse: 어느 하나라도 block=true면 차단
   * 그 외 handler가 modifiedInput을 반환하면 병합
   */
  async runPreToolUse(ctx: HookContext): Promise<HookResult | null> {
    let merged: HookResult | null = null;
    for (const h of this.forEvent("preToolUse")) {
      const r = await h.handler({ ...ctx, event: "preToolUse" });
      if (r?.block) return r; // 즉시 차단
      if (r?.modifiedInput) {
        merged = merged ?? {};
        merged.modifiedInput = { ...(merged.modifiedInput ?? ctx.input), ...r.modifiedInput };
      }
    }
    return merged;
  }

  async runPostToolUse(ctx: HookContext): Promise<HookResult | null> {
    let merged: HookResult | null = null;
    for (const h of this.forEvent("postToolUse")) {
      const r = await h.handler({ ...ctx, event: "postToolUse" });
      if (r?.modifiedResult != null) {
        merged = merged ?? {};
        merged.modifiedResult = r.modifiedResult;
      }
    }
    return merged;
  }

  async emit(event: HookEvent, ctx: Partial<HookContext> = {}): Promise<void> {
    for (const h of this.forEvent(event)) {
      await h.handler({ cwd: ctx.cwd ?? "", event, ...ctx } as HookContext);
    }
  }

  /** 파일 기반 hook 로드: .arena/hooks/*.js */
  async loadFromDir(dir: string): Promise<{ loaded: number; errors: string[] }> {
    const { existsSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    if (!existsSync(dir)) return { loaded: 0, errors: [] };
    let loaded = 0;
    const errors: string[] = [];
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".js") && !file.endsWith(".mjs")) continue;
      try {
        const mod = await import(join(dir, file));
        const hooks: { event: HookEvent; handler: HookHandler }[] =
          mod.hooks ?? mod.default ?? [];
        for (const hk of (Array.isArray(hooks) ? hooks : [hooks])) {
          if (hk.event && hk.handler) {
            this.on(hk.event, hk.handler, `${dir}/${file}`);
            loaded++;
          }
        }
      } catch (e: unknown) {
        errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { loaded, errors };
  }
}
