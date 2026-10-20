/**
 * Banner — 세션 시작 시 상태 출력 (cli.ts에서 분리)
 */
import { sandboxStatus } from "../sandbox/index.js";
import { ALL_TOOLS, CORE_TOOLS } from "../tools/index.js";
import type { Session } from "./bootstrap.js";

export function printBanner(session: Session, printPrompt?: string): void {
  console.log(`\n🤖 Arena Code v2.2 — Claude Code + Codex + Muse + Ghidra`);
  console.log(`   Provider: ${session.provider.name} (${session.provider.model})`);
  console.log(`   CWD: ${session.effectiveCwd}${session.effectiveCwd !== session.config.cwd ? ` (원래: ${session.config.cwd})` : ""}`);
  console.log(`   Tools: ${ALL_TOOLS.length}개 (코딩 ${CORE_TOOLS.length} + Ghidra ${ALL_TOOLS.length - CORE_TOOLS.length})`);
  console.log(`   ${sandboxStatus(session.sandbox)}`);
  if (session.eventLog) console.log(`   📝 Event Log: ${session.eventLog.logPath} (session: ${session.eventLog.session_id})`);
  if (session.skillMgr.list().length > 0) console.log(`   ✨ Skills: ${session.skillMgr.list().map(s => `/${s.name}`).join(", ")}`);
  if (session.agentsMdEntries.length > 0) console.log(`   📄 AGENTS.md: ${session.agentsMdEntries.map(e => e.path).join(", ")}`);
  if (session.config.dangerouslySkipPermissions) console.log(`   ⚠️  Permissions: SKIPPED (--yolo)`);
  if (printPrompt) console.log(`   Mode: headless`);
  else console.log(`   Mode: interactive`);
  console.log("");
}
