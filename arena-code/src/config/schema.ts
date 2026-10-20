/**
 * Arena Config Schema — 통합 설정의 단일 진실 공급원
 * 우선순위: CLI flags > arena.config.json > .env > defaults
 */

export interface ArenaConfig {
  /** LLM provider */
  provider: string;
  /** 모델 */
  model?: string;
  /** 작업 디렉토리 */
  cwd: string;
  /** 최대 턴 */
  maxTurns: number;
  /** 최대 컨텍스트 토큰 */
  maxContextTokens: number;
  /** 샌드박스 모드 */
  sandbox: string;
  /** 승인 없이 진행 */
  dangerouslySkipPermissions: boolean;
  /** worktree 작업명 */
  worktree?: string;
  /** 시작 스킬 */
  skill?: string;
  /** 승인 모드 */
  approvalMode?: string;
  /** 비활성 도구 (확장성: 플러그인/환경별 on-off) */
  disabledTools: string[];
  /** 추가 도구 경로 (플러그인) */
  pluginPaths: string[];
  /** 권한 설정 경로 */
  permissionsPath?: string;
  /** 이벤트 로그 활성 */
  eventLogEnabled: boolean;
  /** Mock 모드 */
  mock: boolean;
  /** headless 프롬프트 */
  printPrompt?: string;
}

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
};

/** arena.config.json 파일 스키마 (사용자가 작성) */
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
}
