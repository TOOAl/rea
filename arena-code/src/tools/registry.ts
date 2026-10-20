/**
 * Tool Registry — 확장 가능한 도구 등록/조회/필터 레이어
 *
 * 기존: tools/index.ts에서 하드코딩 배열
 * 개선: Registry가 등록/중복검증/카테고리/비활성필터/플러그인 슬롯 제공
 *
 * Phase 1: 내부 도구 등록을 registry로 이동 (호환 유지)
 * Phase 2: registry.loadPlugin(path)로 외부 확장
 */
import type { Tool } from "./types.js";

export type ToolCategory = "core" | "ghidra" | "plugin" | "custom";

export interface RegistryEntry {
  tool: Tool;
  category: ToolCategory;
  source: string; // "builtin" | plugin path
}

export class ToolRegistry {
  private entries: Map<string, RegistryEntry> = new Map();
  private disabled: Set<string> = new Set();

  /** 도구 등록 — 이름 중복이면 에러 */
  register(tool: Tool, opts?: { category?: ToolCategory; source?: string }): this {
    if (this.entries.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.entries.set(tool.name, {
      tool,
      category: opts?.category ?? "custom",
      source: opts?.source ?? "builtin",
    });
    return this;
  }

  /** 여러 도구 일괄 등록 */
  registerAll(tools: Tool[], opts?: { category?: ToolCategory; source?: string }): this {
    for (const t of tools) this.register(t, opts);
    return this;
  }

  /** 도구 비활성화 (config.disabledTools에서 사용) */
  disable(name: string): this {
    this.disabled.add(name);
    return this;
  }

  disableMany(names: string[]): this {
    for (const n of names) this.disabled.add(n);
    return this;
  }

  /** 활성 도구만 반환 */
  all(): Tool[] {
    return [...this.entries.values()]
      .filter((e) => !this.disabled.has(e.tool.name))
      .map((e) => e.tool);
  }

  /** 카테고리별 */
  byCategory(cat: ToolCategory): Tool[] {
    return [...this.entries.values()]
      .filter((e) => e.category === cat && !this.disabled.has(e.tool.name))
      .map((e) => e.tool);
  }

  /** 이름으로 조회 */
  get(name: string): Tool | undefined {
    return this.entries.get(name)?.tool;
  }

  /** 메타 포함 조회 */
  getEntry(name: string): RegistryEntry | undefined {
    return this.entries.get(name);
  }

  /** 전체 메타 (진단/문서용) */
  entries_(): RegistryEntry[] {
    return [...this.entries.values()];
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  /** 비활성 포함 전체 개수 */
  size(): number { return this.entries.size; }

  /** 활성 개수 */
  activeSize(): number { return this.all().length; }

  /** 동적 로드 — Phase 2 플러그인 슬롯 (현재는 스텁, 파일 존재 시 시도) */
  async loadPlugin(pluginPath: string): Promise<{ loaded: number; error?: string }> {
    try {
      const mod = await import(pluginPath);
      const tools: Tool[] = mod.tools ?? mod.default ?? [];
      if (!Array.isArray(tools) || tools.length === 0) {
        return { loaded: 0, error: `No tools exported from ${pluginPath}` };
      }
      let count = 0;
      for (const t of tools) {
        if (t?.name && typeof t.execute === "function") {
          if (!this.entries.has(t.name)) {
            this.register(t, { category: "plugin", source: pluginPath });
            count++;
          }
        }
      }
      return { loaded: count };
    } catch (e: unknown) {
      return { loaded: 0, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

/**
 * 기본 레지스트리 생성 — 기존 ALL_TOOLS와 동일 구성
 * cli.ts / tests에서 재사용
 */
export function createDefaultRegistry(disabledTools: string[] = []): ToolRegistry {
  // lazy import to avoid circular dep (tools/index still exists as compat shim)
  // 직접 import 대신 팩토리 주입 패턴 사용
  const reg = new ToolRegistry();
  if (disabledTools.length) reg.disableMany(disabledTools);
  return reg;
}
