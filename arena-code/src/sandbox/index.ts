/**
 * Sandbox — Codex CLI 3단계 샌드박스 모델 포팅
 * read-only / workspace-write / danger-full-access
 * 
 * Codex는 OS 샌드박스(Seatbelt/Landlock)로 강제하지만,
 * Arena Code는 JS에서 경로 체크 + Bash wrapper로 근사
 * (Muse Code도 동일한 2-layer 모델: approval + sandbox)
 */
import { resolve, relative, isAbsolute, dirname } from "node:path";
import { existsSync } from "node:fs";

export type SandboxMode = "read-only" | "workspace-write" | "danger-full-access";

export interface SandboxConfig {
  mode: SandboxMode;
  workspaceRoot: string;
  allowedWritePaths: string[];  // 추가로 허용할 경로 (e.g., /tmp)
  allowedNetworkHosts: string[]; // 네트워크 허용 (proxy-only)
  workspaceWritable: boolean;
}

export function getDefaultSandbox(mode?: string, workspaceRoot: string = process.cwd()): SandboxConfig {
  const m = (mode || process.env.ARENA_SANDBOX || "workspace-write") as SandboxMode;
  const valid: SandboxMode[] = ["read-only", "workspace-write", "danger-full-access"];
  const resolvedMode = valid.includes(m) ? m : "workspace-write";

  return {
    mode: resolvedMode,
    workspaceRoot: resolve(workspaceRoot),
    allowedWritePaths: [
      resolve(workspaceRoot),
      "/tmp",
      `${process.env.HOME || "/home/user"}/.tmp`,
    ],
    allowedNetworkHosts: [], // proxy-only default
    workspaceWritable: resolvedMode !== "read-only",
  };
}

// 쓰기 가능 여부 검사
export function canWritePath(targetPath: string, sandbox: SandboxConfig): { allowed: boolean; reason: string } {
  if (sandbox.mode === "danger-full-access") {
    return { allowed: true, reason: "danger-full-access: all writes allowed" };
  }
  if (sandbox.mode === "read-only") {
    return { allowed: false, reason: `⛔ Sandbox read-only: 쓰기가 차단되었습니다 (${targetPath})\n💡 --sandbox workspace-write 또는 --sandbox danger-full-access로 실행하거나 ARENA_SANDBOX=workspace-write 설정` };
  }

  // workspace-write: workspace 내부 + /tmp만 허용
  const abs = isAbsolute(targetPath) ? resolve(targetPath) : resolve(sandbox.workspaceRoot, targetPath);
  
  for (const allowed of sandbox.allowedWritePaths) {
    const rel = relative(allowed, abs);
    if (!rel.startsWith("..") && !isAbsolute(rel)) {
      return { allowed: true, reason: `allowed: within ${allowed}` };
    }
    // 동일 경로 itself
    if (abs === allowed) return { allowed: true, reason: `allowed: exact ${allowed}` };
  }

  // .agents, .muse 같은 내부 디렉토리는 읽기 전용 (Muse Code 정책 차용)
  const blocked = [".git", ".muse", ".agents", ".arena"];
  for (const b of blocked) {
    if (abs.includes(`/${b}/`) || abs.endsWith(`/${b}`)) {
      return { allowed: false, reason: `⛔ 샌드박스 차단: ${b} 디렉토리는 읽기 전용 (내부 기록 보호)\n경로: ${targetPath}` };
    }
  }

  return { allowed: false, reason: `⛔ 샌드박스 차단 (workspace-write): workspace 밖 쓰기 불가\n경로: ${targetPath}\nworkspace: ${sandbox.workspaceRoot}\n💡 허용하려면: --sandbox danger-full-access` };
}

// Bash 명령 샌드박스 검사 (Codex의 dangerous set 근사)
export function canExecuteCommand(command: string, sandbox: SandboxConfig): { allowed: boolean; reason: string } {
  if (sandbox.mode === "danger-full-access") {
    return { allowed: true, reason: "danger-full-access" };
  }

  // 위험한 명령 — 모든 모드에서 차단 (Codex + Muse 공통)
  const alwaysBlocked = [
    { pattern: /rm\s+-rf\s+\//, desc: "루트 삭제" },
    { pattern: /:\(\)\s*\{\s*:\|\:&\s*\}/, desc: "fork bomb" },
    { pattern: /mkfs\./, desc: "파일시스템 포맷" },
    { pattern: /dd\s+.*of=\s*\/dev\/sda/, desc: "디스크 덮어쓰기" },
  ];
  for (const b of alwaysBlocked) {
    if (b.pattern.test(command)) {
      return { allowed: false, reason: `⛔ 위험 명령 차단 (${b.desc}): ${command}` };
    }
  }

  if (sandbox.mode === "read-only") {
    // read-only에서는 쓰기 관련 명령 차단
    const writeCommands = [/rm\s+-rf/, /rm\s+-r/, /mv\s+/, /mkdir\s+/, /touch\s+/, /echo\s+.*>/, /cat\s+.*>/, /npm\s+(install|uninstall)/, /pip\s+install/, /git\s+(commit|push|merge)/];
    for (const pat of writeCommands) {
      if (pat.test(command)) {
        return { allowed: false, reason: `⛔ 샌드박스 read-only: 쓰기 명령 차단\n명령: ${command}` };
      }
    }
    return { allowed: true, reason: "read-only: 읽기 명령 허용" };
  }

  // workspace-write: 대부분의 명령 허용 (Codex 기본값)
  return { allowed: true, reason: "workspace-write: 명령 허용" };
}

// 네트워크 샌드박스 (Muse Code의 proxy-only 근사)
export function canAccessNetwork(url: string, sandbox: SandboxConfig): { allowed: boolean; reason: string } {
  if (sandbox.mode === "danger-full-access") {
    return { allowed: true, reason: "danger-full-access: 모든 네트워크 허용" };
  }
  // 기본: 허용하되 경고 (실제 Muse는 proxy-only로 매 host/port 심사)
  // Arena Code는 WebFetch 시 네트워크 체크
  return { allowed: true, reason: `${sandbox.mode}: 네트워크 접근 허용 (승인 필요 시 물음)` };
}

export function sandboxStatus(sandbox: SandboxConfig): string {
  const icons: Record<SandboxMode, string> = {
    "read-only": "🔒",
    "workspace-write": "🔓",
    "danger-full-access": "⚠️",
  };
  const descs: Record<SandboxMode, string> = {
    "read-only": "읽기 전용 (안전한 탐색)",
    "workspace-write": "작업 영역 쓰기 (기본값, 권장)",
    "danger-full-access": "전체 접근 (--yolo, 위험!)",
  };
  return `${icons[sandbox.mode]} Sandbox: ${sandbox.mode} — ${descs[sandbox.mode]}\n   Workspace: ${sandbox.workspaceRoot}`;
}
