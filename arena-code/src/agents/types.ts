/**
 * External Agents — 외부 에이전트 연결 시스템
 *
 * 어떤 형태의 외부 에이전트든 자유롭게 연결:
 *  - http/openai : OpenAI 호환 HTTP API (다른 LLM, 프록시, 게이트웨이)
 *  - mcp        : MCP 서버 (stdio / sse / http) — Claude/Muse 도구 에이전트
 *  - module     : 로컬 JS/TS 모듈 (custom Provider/Tool 직접 구현)
 *  - command    : 서브프로세스 (CLI 에이전트, 래퍼 스크립트)
 *
 * 등록: arena.config.json → agents[] 또는 CLI --agent / /agent 명령
 * 사용: provider로 선택 (--provider my-agent) 또는 도구로 호출 (AskAgent 등)
 */

export type AgentTransport = "http" | "openai" | "mcp" | "module" | "command";

// MCP 전용 서브타입
export type McpTransport = "stdio" | "sse" | "http";

export interface AgentDefinition {
  /** 고유 ID — --provider, /agent 에서 참조 */
  id: string;
  /** 사람이 읽는 이름 */
  name?: string;
  /** 설명 */
  description?: string;
  /** 연결 방식 */
  transport: AgentTransport;
  /** 활성화 여부 (기본 true) */
  enabled?: boolean;

  // --- http / openai ---
  /** OpenAI 호환 base URL (예: https://api.example.com/v1) */
  baseUrl?: string;
  /** API 키 (환경변수 참조 ${ENV:KEY_NAME} 지원) */
  apiKey?: string;
  /** 모델명 (openai transport일 때) */
  model?: string;
  /** 추가 헤더 */
  headers?: Record<string, string>;

  // --- mcp ---
  /** MCP 커맨드 (stdio) — 예: "npx @modelcontextprotocol/server-filesystem /tmp" */
  command?: string;
  /** MCP 추가 인자 */
  args?: string[];
  /** MCP env */
  env?: Record<string, string>;
  /** MCP URL (sse/http) */
  url?: string;
  /** mcp transport 타입 (기본 stdio) */
  mcpTransport?: McpTransport;

  // --- module ---
  /** 모듈 경로 (예: "./my-agent.js" 또는 "my-npm-package") */
  module?: string;
  /** 모듈 내 export 이름 (기본 default) */
  exportName?: string;

  // --- 공통 ---
  /** 이 에이전트가 제공하는 것: provider(대화), tools(도구), both */
  provides?: "provider" | "tools" | "both";
  /** 타임아웃 ms */
  timeout?: number;
  /** 재시도 */
  retries?: number;
}

export interface AgentConnection {
  id: string;
  definition: AgentDefinition;
  /** 연결 상태 */
  status: "connected" | "disconnected" | "error";
  error?: string;
  /** MCP인 경우 원격 tools 목록 */
  remoteTools?: { name: string; description: string }[];
}

export interface AgentRegistrySnapshot {
  agents: AgentDefinition[];
  connections: AgentConnection[];
}
