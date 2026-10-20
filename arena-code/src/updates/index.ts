/**
 * Updates — 외부 패키지 업데이트 감지/승인/적용 통합
 * 사용: sessionStart 시 자동 check + /update, --update CLI
 */
export * from "./checker.js";
export * from "./store.js";
export * from "./apply.js";

import type { ArenaConfig } from "../config/schema.js";
import { checkUpdates, formatUpdateSummary } from "./checker.js";
import type { UpdateInfo } from "./checker.js";
import { loadStore, saveStore, shouldCheck, recordCheck } from "./store.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function detectLocalVersions(cwd: string): Record<string, string> {
  const versions: Record<string, string> = {};
  // 1) REA (부모 repo package.json)
  try {
    const reaPkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf-8"));
    if (reaPkg.name === "rea-agents") versions["rea"] = reaPkg.version ?? "unknown";
  } catch {}
  try {
    const reaPkg2 = JSON.parse(readFileSync(join(cwd, "..", "package.json"), "utf-8"));
    if (reaPkg2.name === "rea-agents") versions["rea"] = reaPkg2.version ?? versions["rea"] ?? "unknown";
  } catch {}
  // 2) arena-code 자체
  try {
    const acPkg = JSON.parse(readFileSync(join(cwd, "arena-code", "package.json"), "utf-8"));
    versions["arena-code"] = acPkg.version ?? "unknown";
    // ghidra/rea 외부 패키지 버전
    try {
      const gPkg = JSON.parse(readFileSync(join(cwd, "arena-code", "packages", "ghidra-tools", "package.json"), "utf-8"));
      versions["ghidra"] = gPkg.version ?? "unknown";
    } catch {}
    try {
      const rPkg = JSON.parse(readFileSync(join(cwd, "arena-code", "packages", "rea-bridge", "package.json"), "utf-8"));
      versions["rea-bridge"] = rPkg.version ?? "unknown";
    } catch {}
  } catch {}
  // 3) arena-code 내부에서 실행 중일 때 (cwd가 arena-code)
  try {
    const acPkg2 = JSON.parse(readFileSync(join(cwd, "package.json"), "utf-8"));
    if (acPkg2.name === "arena-code") {
      versions["arena-code"] = acPkg2.version ?? versions["arena-code"] ?? "unknown";
      try {
        const gPkg = JSON.parse(readFileSync(join(cwd, "packages", "ghidra-tools", "package.json"), "utf-8"));
        versions["ghidra"] = gPkg.version ?? versions["ghidra"] ?? "unknown";
      } catch {}
      try {
        const rPkg = JSON.parse(readFileSync(join(cwd, "packages", "rea-bridge", "package.json"), "utf-8"));
        versions["rea-bridge"] = rPkg.version ?? versions["rea-bridge"] ?? "unknown";
      } catch {}
    }
  } catch {}
  // ghidra 설치 여부 (GHIDRA_INSTALL_DIR)
  if (process.env.GHIDRA_INSTALL_DIR && !versions["ghidra"]) {
    versions["ghidra"] = "installed";
  }
  return versions;
}

/**
 * 자동 체크 (sessionStart 훅에서 호출)
 * interval 미달이면 스킵, 결과는 console + store 저장
 */
export async function autoCheckUpdates(
  cwd: string,
  config: ArenaConfig,
  opts: { force?: boolean } = {},
): Promise<UpdateInfo[] | null> {
  if (!config.updates.enabled && !opts.force) return null;
  const store = loadStore(cwd);
  if (!opts.force && !shouldCheck(store, config.updates.checkIntervalHours)) return null;

  const localVersions = detectLocalVersions(cwd);
  const targets = config.updates.repos.map((r) => ({
    name: r.name, repo: r.repo, localVersion: localVersions[r.name] ?? r.currentVersion ?? "unknown",
  }));

  const infos = await checkUpdates(targets);
  recordCheck(cwd, infos);

  const pending = infos.filter((i) => i.updateAvailable);
  if (pending.length > 0) {
    console.log(`\n${formatUpdateSummary(infos)}\n`);
  }
  return infos;
}

export async function manualCheckUpdates(cwd: string, config: ArenaConfig): Promise<UpdateInfo[]> {
  const localVersions = detectLocalVersions(cwd);
  const targets = config.updates.repos.map((r) => ({
    name: r.name, repo: r.repo, localVersion: localVersions[r.name] ?? r.currentVersion ?? "unknown",
  }));
  const infos = await checkUpdates(targets);
  recordCheck(cwd, infos);
  console.log(formatUpdateSummary(infos));
  return infos;
}
