/**
 * Update Store — 로컬 버전/검사 시각을 .arena/updates.json에 저장
 * update check 간격을 준수하고, 사용자가 approval 후 적용한 기록도 보관
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { UpdateInfo } from "./checker.js";

export interface UpdateStoreData {
  versions: Record<string, string>; // name → installed tag/version
  lastCheckedAt?: string;
  checks: UpdateInfo[];
  history: { at: string; action: "check" | "apply" | "dismiss"; target?: string }[];
}

const FILE_NAME = "updates.json";

function storePath(cwd: string): string {
  return join(cwd, ".arena", FILE_NAME);
}

export function loadStore(cwd: string): UpdateStoreData {
  const p = storePath(cwd);
  if (!existsSync(p)) return { versions: {}, checks: [], history: [] };
  try { return JSON.parse(readFileSync(p, "utf-8")) as UpdateStoreData; } catch { return { versions: {}, checks: [], history: [] }; }
}

export function saveStore(cwd: string, data: UpdateStoreData): void {
  const p = storePath(cwd);
  try {
    mkdirSync(join(cwd, ".arena"), { recursive: true });
    writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

export function shouldCheck(store: UpdateStoreData, intervalHours: number): boolean {
  if (!store.lastCheckedAt) return true;
  const last = new Date(store.lastCheckedAt).getTime();
  const now = Date.now();
  return (now - last) > intervalHours * 3600 * 1000;
}

export function recordCheck(cwd: string, checks: UpdateInfo[]): void {
  const store = loadStore(cwd);
  store.checks = checks;
  store.lastCheckedAt = new Date().toISOString();
  store.history.push({ at: store.lastCheckedAt, action: "check" });
  saveStore(cwd, store);
}

export function recordApply(cwd: string, target: string, newVersion: string): void {
  const store = loadStore(cwd);
  store.versions[target] = newVersion;
  store.history.push({ at: new Date().toISOString(), action: "apply", target });
  saveStore(cwd, store);
}
