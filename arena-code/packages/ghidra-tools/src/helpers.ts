/**
 * Ghidra 헬퍼 — REA Ghidra Provider 래퍼
 * 모든 Ghidra 도구는 REA CLI(`npx rea ... --provider ghidra`)를 통해 Ghidra와 통신
 * Ghidra 미설치 시 친절한 설치 안내 반환
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";

const execAsync = promisify(exec);

// REA Ghidra가 설치되었는지 확인 (doctor + 직접 파일 확인)
let cachedAvailability: { available: boolean; reason: string } | null = null;

export async function checkGhidraAvailable(cwd: string): Promise<{ available: boolean; reason: string }> {
  if (cachedAvailability) return cachedAvailability;

  // 1) 환경변수로 Ghidra 경로가 지정되었는지
  if (process.env.GHIDRA_INSTALL_DIR && existsSync(process.env.GHIDRA_INSTALL_DIR)) {
    cachedAvailability = { available: true, reason: `GHIDRA_INSTALL_DIR=${process.env.GHIDRA_INSTALL_DIR}` };
    return cachedAvailability;
  }
  if (process.env.REA_GHIDRA_INSTALL_DIR && existsSync(process.env.REA_GHIDRA_INSTALL_DIR)) {
    cachedAvailability = { available: true, reason: `REA_GHIDRA_INSTALL_DIR` };
    return cachedAvailability;
  }

  // 2) rea doctor로 확인 (timeout 5초)
  try {
    const { stdout } = await execAsync("npx rea doctor --provider ghidra --json 2>&1", {
      cwd,
      timeout: 8000,
      maxBuffer: 2 * 1024 * 1024,
    });
    // doctor 출력에 ghidra healthy 확인
    if (stdout.includes('"healthy": true') || stdout.includes('"healthy":true')) {
      cachedAvailability = { available: true, reason: "rea doctor: healthy" };
      return cachedAvailability;
    }
    // 부분 성공이어도 provider가 있으면 시도
    if (stdout.includes("ghidra") && !stdout.includes("unavailable")) {
      cachedAvailability = { available: true, reason: "ghidra provider found" };
      return cachedAvailability;
    }
  } catch {
    // doctor 실패해도 계속 진행 — 실제 명령으로 판단
  }

  // 3) 일반적인 Ghidra 설치 경로 확인
  const commonPaths = [
    "/opt/ghidra",
    "/usr/local/ghidra",
    `${process.env.HOME}/ghidra`,
    "C:\\ghidra",
  ];
  for (const p of commonPaths) {
    if (existsSync(p) && existsSync(`${p}/Ghidra`)) {
      cachedAvailability = { available: true, reason: `found at ${p}` };
      return cachedAvailability;
    }
  }

  cachedAvailability = {
    available: false,
    reason: `Ghidra를 찾을 수 없습니다.

설치 방법:
  1. https://ghidra-sre.org/ 에서 Ghidra 다운로드 (무료, Apache 2.0)
  2. 압축 해제 후 환경변수 설정:
     export GHIDRA_INSTALL_DIR=/path/to/ghidra_11.x
  3. 또는 REA setup 사용:
     npx rea-agents setup
     → Ghidra 경로 선택

설치 없이도 다른 도구(Read/Bash 등)는 정상 동작합니다.
Ghidra는 바이너리 분석이 필요할 때만 필요합니다.`,
  };
  return cachedAvailability;
}

export function clearGhidraCache() {
  cachedAvailability = null;
}

// REA CLI 실행 헬퍼
export async function runReaCommand(
  args: string[],
  cwd: string,
  timeoutMs = 120_000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // 안전한 인자 이스케이프
  const quoted = args.map((a) => {
    if (a.includes(" ") || a.includes("\"") || a.includes("'")) {
      return JSON.stringify(a);
    }
    return a;
  });
  const cmd = `npx rea ${quoted.join(" ")} 2>&1`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env },
    });
    return { stdout: stdout || "", stderr: stderr || "", exitCode: 0 };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string; code?: number };
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || String(e),
      exitCode: err.code ?? 1,
    };
  }
}

// JSON 출력 파싱 헬퍼
export function parseJsonOutput(output: string): { data: unknown; raw: string } {
  // REA는 --json 옵션이 없을 때도 JSON을 stderr에 출력할 수 있음
  // 전체 출력에서 JSON 객체 찾기
  const trimmed = output.trim();
  
  // JSON 객체/배열 찾기
  const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]);
      return { data, raw: trimmed };
    } catch {
      // JSON 파싱 실패 — raw 반환
    }
  }
  
  // 직접 파싱 시도
  try {
    const data = JSON.parse(trimmed);
    return { data, raw: trimmed };
  } catch {
    return { data: null, raw: trimmed };
  }
}

// 바이너리 경로 검증
export function validateBinaryPath(input: string, cwd: string): { valid: boolean; error?: string; path: string } {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "바이너리 경로가 필요합니다", path: "" };
  }
  // 절대경로 또는 cwd 기준 상대경로
  const resolved = input.startsWith("/") || input.match(/^[A-Z]:\\/) ? input : `${cwd}/${input}`;
  
  if (!existsSync(resolved) && !existsSync(input)) {
    // 파일이 없어도 REA가 에러 메시지를 줄 수 있도록 허용 — 경고만 표시
    // (원격 파일, URL 등일 수 있음)
  }
  
  return { valid: true, path: input };
}

// 결과 포맷터
export function formatGhidraResult(
  operation: string,
  binary: string,
  result: { stdout: string; stderr: string; exitCode: number },
  jsonData: unknown
): string {
  if (result.exitCode !== 0 && !jsonData) {
    // 에러 케이스 — 친절한 메시지
    const errorText = result.stdout || result.stderr || "알 수 없는 오류";
    
    // Ghidra 미설치 에러 감지
    if (errorText.includes("ghidra") && errorText.includes("unavailable")) {
      return `❌ Ghidra가 설치되지 않았거나 설정되지 않았습니다.

${(cachedAvailability?.reason || "")}

요청: ${operation}("${binary}")

해결 방법:
  1. Ghidra 설치: https://ghidra-sre.org/
  2. 환경변수: export GHIDRA_INSTALL_DIR=/path/to/ghidra
  3. REA 설정: npx rea-agents setup

Ghidra 없이도 Read/Bash/Grep 등 다른 도구로 코드 분석은 계속 할 수 있습니다.`;
    }
    
    return `❌ Ghidra ${operation} 실패 (${binary}):

${errorText.slice(0, 3000)}

💡 팁:
  - 파일 경로가 맞는지 확인: ${binary}
  - Ghidra 설치 여부: npx rea doctor --provider ghidra --json
  - 바이너리 형식: REA가 지원하는 형식인지 확인 (ELF, PE, Mach-O 등)`;
  }

  if (jsonData) {
    // JSON 데이터가 있으면 예쁘게 포맷
    return `✅ Ghidra ${operation} 성공 (${binary}):

${JSON.stringify(jsonData, null, 2).slice(0, 8000)}${JSON.stringify(jsonData, null, 2).length > 8000 ? "\n... (truncated, 전체는 evidence bundle 참조)" : ""}`;
  }

  // JSON이 없으면 raw 텍스트 반환
  const output = result.stdout || result.stderr || "";
  return `✅ Ghidra ${operation} (${binary}):

${output.slice(0, 8000)}${output.length > 8000 ? "\n... (truncated)" : ""}`;
}

// REA Ghidra 도구 카탈로그 (참조용)
export const GHIDRA_CATALOG = {
  // 기본 분석
  overview: { cli: "analyze", mcp: "binary_overview", desc: "바이너리 전체 개요" },
  function: { cli: "function", mcp: "analyze_function", desc: "함수 상세 분석 (8 facets)" },
  decompile: { cli: "decompile", mcp: "procedure_pseudo_code", desc: "함수를 C 코드로 디컴파일" },
  instructions: { cli: "instructions", mcp: "read_function_instructions", desc: "어셈블리 명령어" },
  search: { cli: "search", mcp: "search_procedures/search_strings", desc: "함수/문자열 검색" },
  xrefs: { cli: "xrefs", mcp: "xrefs", desc: "교차 참조" },
  trace: { cli: "trace", mcp: "trace_feature", desc: "함수 간 호출 경로 추적" },
  // 고급
  listProcedures: { mcp: "list_procedures", desc: "모든 함수 목록" },
  listNames: { mcp: "list_names", desc: "모든 심볼 목록" },
  listStrings: { mcp: "list_strings", desc: "문자열 목록" },
  listSegments: { mcp: "list_segments", desc: "메모리 세그먼트" },
  inspectInstruction: { mcp: "inspect_native_instruction", desc: "단일 명령어 상세" },
  inspectDataType: { mcp: "inspect_native_data_type", desc: "데이터 타입" },
  readBytes: { cli: "read-bytes", mcp: "read_bytes", desc: "바이트 읽기" },
  searchBytes: { cli: "search-bytes", mcp: "search_bytes", desc: "바이트 패턴 검색" },
  // 어노테이션
  setComment: { mcp: "set_comment/set_inline_comment", desc: "주석 추가" },
  setName: { mcp: "set_address_name", desc: "심볼 이름 변경" },
  setBookmark: { mcp: "set_bookmark", desc: "북마크 설정" },
  // 그래프/경로
  getCallGraph: { mcp: "get_call_graph", desc: "호출 그래프" },
  traceCallPath: { mcp: "trace_call_path", desc: "호출 경로" },
  // 비교
  compareFunctions: { mcp: "compare_functions", desc: "함수 비교" },
  compareArtifacts: { mcp: "compare_artifacts", desc: "바이너리 비교" },
} as const;
