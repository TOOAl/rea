/**
 * Arena Config Schema — 통합 설정의 단일 진실 공급원
 * 우선순위: CLI flags > arena.config.json > .env > defaults
 */
import type { AgentDefinition } from "../agents/types.js";

export interface ArenaConfig {
  provider: string;
  model?: string;
  cwd: string;
  maxTurns: number;
  maxContextTokens: number;
  sandbox: string;
  dangerouslySkipPermissions: boolean;
  worktree?: string;
  skill?: string;
  approvalMode?: string;
  disabledTools: string[];
  pluginPaths: string[];
  permissionsPath?: string;
  eventLogEnabled: boolean;
  mock: boolean;
  printPrompt?: string;
  mcp: boolean;
  externalPackages: {
    ghidra?: string;
    rea?: string;
  };
  updates: {
    enabled: boolean;
    checkIntervalHours: number;
    repos: UpdateRepo[];
    autoCheck: boolean;
  };
  /** 외부 에이전트 (자유 연결) */
  agents: AgentDefinition[];
}

export interface UpdateRepo {
  name: string;
  repo: string;
  currentVersion?: string;
  lastChecked?: string;
}

export const DEFAULT_GHIDRA_REPO = "NationalSecurityAgency/ghidra";
export const DEFAULT_REA_REPO = "TOOAl/rea";

export const DEFAULT_CONFIG: ArenaConfig = {
  provider: "arena",
  model: undefined,
  cwd: process.cwd(),
  maxTurns: 20,
  maxContextTokens: 100_000,
  sandbox: "workspace-write",
  dangerouslySkipPermissions: false,
  worktree: undefined,
  skill: undefined,
  approvalMode: undefined,
  disabledTools: [],
  pluginPaths: [],
  permissionsPath: undefined,
  eventLogEnabled: true,
  mock: false,
  printPrompt: undefined,
  mcp: false,
  externalPackages: {},
  updates: {
    enabled: true,
    checkIntervalHours: 24,
    repos: [
      { name: "ghidra", repo: DEFAULT_GHIDRA_REPO },
      { name: "rea", repo: DEFAULT_REA_REPO },
    ],
    autoCheck: true,
  },
  agents: [],
};

export interface ArenaConfigFile {
  provider?: string;
  model?: string;
  maxTurns?: number;
  maxContextTokens?: number;
  sandbox?: string;
  approvalMode?: string;
  disabledTools?: string[];
  plugins?: string[];
  permissionsPath?: string;
  eventLogEnabled?: boolean;
  mcp?: boolean;
  externalPackages?: { ghidra?: string; rea?: string };
  updates?: Partial<ArenaConfig["updates"]>;
  agents?: AgentDefinition[];
}
