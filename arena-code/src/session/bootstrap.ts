/**
 * Session Bootstrap — CLI에서 분리한 세션 초기화 로직
 * sandbox / eventLog / worktree / skills / provider 생성을 한 곳에 모음
 */
import { resolve } from "node:path";
import { getDefaultSandbox } from "../sandbox/index.js";
import type { SandboxConfig } from "../sandbox/index.js";
import { EventLog } from "../eventLog/index.js";
import { WorktreeManager } from "../worktree/index.js";
import { SkillManager } from "../skills/index.js";
import { BackgroundAgentManager } from "../background/index.js";
import { loadAgentsMdHierarchy } from "../config/agentsMd.js";
import { createProvider } from "../providers/index.js";
import { HookManager } from "../hooks/index.js";
import type { ArenaConfig } from "../config/schema.js";

export interface Session {
  config: ArenaConfig;
  cwd: string;
  effectiveCwd: string;
  sandbox: SandboxConfig;
  eventLog: EventLog | null;
  worktreeMgr: WorktreeManager | null;
  skillMgr: SkillManager;
  bgMgr: BackgroundAgentManager;
  provider: ReturnType<typeof createProvider>;
  agentsMdEntries: ReturnType<typeof loadAgentsMdHierarchy>;
  skillExtra: string;
  hooks: HookManager;
}

export async function bootstrapSession(
  config: ArenaConfig,
  providerOverride?: ReturnType<typeof createProvider> | null,
): Promise<Session> {
  let cwd = resolve(config.cwd);
  let effectiveCwd = cwd;

  // Sandbox
  const sandbox = getDefaultSandbox(config.sandbox, cwd);

  // EventLog
  let eventLog: EventLog | null = null;
  if (config.eventLogEnabled) {
    try { eventLog = new EventLog(cwd); } catch {}
  }

  // Worktree
  let worktreeMgr: WorktreeManager | null = null;
  if (config.worktree) {
    worktreeMgr = new WorktreeManager(cwd);
    if (worktreeMgr.isGitRepo()) {
      console.log(`\n🔀 Worktree 생성 중: ${config.worktree}`);
      const r = await worktreeMgr.create(config.worktree);
      if (!r.error) {
        effectiveCwd = r.worktree.path;
        cwd = effectiveCwd;
        console.log(`   → ${r.worktree.path} (branch: ${r.worktree.branch})`);
      } else {
        console.log(`   ⚠️ ${r.error} — 원래 workspace에서 진행`);
      }
    } else {
      console.log(`   ⚠️ Git 저장소가 아님 — worktree 없이 진행`);
    }
  }

  // Resume 조회
  if (config.printPrompt == null && (config as unknown as Record<string, unknown>).resume) {
    if (eventLog) {
      const events = EventLog.findLastSession(cwd);
      if (events?.length) {
        console.log(`\n🔄 이전 세션 복구: ${events.length}개 이벤트, session ${events[0]?.session_id}`);
        console.log(`   마지막 이벤트: ${events[events.length - 1]?.type} at ${events[events.length - 1]?.timestamp}`);
      } else {
        console.log(`\n⚠️ 복구할 세션이 없습니다`);
      }
    }
  }

  // Skills
  const skillMgr = new SkillManager(cwd);
  let skillExtra = "";
  if (config.skill) {
    const sk = skillMgr.get(config.skill);
    if (sk) {
      skillExtra = skillMgr.formatForPrompt(config.skill) || "";
      console.log(`\n✨ Skill 활성화: /${config.skill} — ${sk.description}`);
    } else {
      console.log(`\n⚠️ 스킬 없음: ${config.skill}. 사용 가능: ${skillMgr.list().map(s => s.name).join(", ")}`);
    }
  }

  // Provider — 외부 에이전트 override 우선
  let provider: ReturnType<typeof createProvider>;
  if (providerOverride) {
    provider = providerOverride as ReturnType<typeof createProvider>;
    if (config.model) (provider as unknown as { model: string }).model = config.model;
  } else {
    if (config.mock || process.env.ARENA_MOCK === "true") {
      process.env.ARENA_MOCK = "true";
      config.provider = "arena";
    }
    try {
      provider = createProvider(config.provider);
      if (config.model) provider.model = config.model;
    } catch (e: unknown) {
      console.error(`\n❌ Provider 오류: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`\n설정 방법 (.env 또는 arena.config.json):\n  cp .env.example .env\n  GEMINI_API_KEY=... (https://aistudio.google.com/app/apikey)\n  OPENROUTER_API_KEY=... (https://openrouter.ai/keys)\n  GROQ_API_KEY=... (https://console.groq.com/keys)\n  또는 --mock으로 데모\n`);
      process.exit(1);
    }
  }

  const agentsMdEntries = loadAgentsMdHierarchy(cwd);
  const bgMgr = new BackgroundAgentManager(eventLog ?? undefined);

  // Hooks
  const hooks = new HookManager();
  try {
    const hookDir = `${cwd}/.arena/hooks`;
    const r = await hooks.loadFromDir(hookDir);
    if (r.loaded > 0) console.log(`   🪝 Hooks: ${r.loaded}개 로드 (${hookDir})`);
    if (r.errors.length) console.log(`   ⚠️ Hook 로드 실패: ${r.errors.join("; ")}`);
  } catch {}
  hooks.emit("sessionStart", { cwd, event: "sessionStart" });

  return {
    config, cwd, effectiveCwd, sandbox, eventLog, worktreeMgr,
    skillMgr, bgMgr, provider, agentsMdEntries, skillExtra, hooks,
  };
}
