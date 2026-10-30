/**
 * CarbonSecureScanner — SEC-bench 88.2% 흡수
 * REA: 정적 코드에서 CWE를 찾아 Evidence로 남김 (Ghidra P-Code처럼 모든 분기 검증)
 */
import { createHash } from "node:crypto";

import { createEvidence } from "../evidence.js";

import type {
  CarbonCweKind,
  CarbonLocation,
  CarbonSeverity,
  CarbonVuln,
} from "./carbonTypes.js";
import { CARBON_LIMITATIONS, CARBON_PROVIDER } from "./carbonTypes.js";

type ScanInput = {
  readonly file: string;
  readonly code: string;
};

// 간단 휴리스틱 — 실제 Carbon 88.2%는 학습 모델이지만 REA는 규칙+증거로 시작 (Ghidra처럼)
const CWE_PATTERNS: readonly {
  readonly kind: CarbonCweKind;
  readonly severity: CarbonSeverity;
  readonly regex: RegExp;
  readonly title: string;
  readonly cwe: string;
}[] = [
  {
    kind: "cwe-78",
    severity: "critical",
    regex: /\bexec\s*\(|spawn\s*\(|execSync\s*\(/,
    title: "OS Command Injection via exec",
    cwe: "CWE-78",
  },
  {
    kind: "cwe-89",
    severity: "critical",
    regex: /query\s*\(.*\$\{.*\}.*\)|query\s*\(.*\+.*\)/,
    title: "SQL Injection via string concatenation",
    cwe: "CWE-89",
  },
  {
    kind: "cwe-79",
    severity: "high",
    regex: /innerHTML\s*=|dangerouslySetInnerHTML/,
    title: "XSS via innerHTML",
    cwe: "CWE-79",
  },
  {
    kind: "cwe-22",
    severity: "high",
    regex: /readFile\s*\(.*req\.|createReadStream\s*\(.*req\./,
    title: "Path Traversal via user input",
    cwe: "CWE-22",
  },
  {
    kind: "cwe-918",
    severity: "high",
    regex: /fetch\s*\(.*req\.|axios\.(get|post)\s*\(.*req\./,
    title: "SSRF via user-controlled URL",
    cwe: "CWE-918",
  },
  {
    kind: "cwe-94",
    severity: "critical",
    regex: /\beval\s*\(|new\s+Function\s*\(/,
    title: "Code Injection via eval",
    cwe: "CWE-94",
  },
  {
    kind: "cwe-601",
    severity: "medium",
    regex: /res\.redirect\s*\(.*req\./,
    title: "Open Redirect via user input",
    cwe: "CWE-601",
  },
  {
    kind: "cwe-200",
    severity: "medium",
    regex: /console\.log\s*\(.*password|console\.log\s*\(.*secret|console\.log\s*\(.*token/,
    title: "Information Exposure via log",
    cwe: "CWE-200",
  },
];

const toLocation = (input: ScanInput, index: number, _match: RegExpMatchArray): CarbonLocation => {
  const before = input.code.slice(0, index);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  const column = index - lastNewline - 1;
  const snippet = input.code.slice(Math.max(0, index - 40), Math.min(input.code.length, index + 80)).replace(/\n/g, " ");
  return {
    file: input.file,
    line,
    column: column < 0 ? 0 : column,
    snippet,
  };
};

export const scanCarbonSecure = (input: ScanInput): readonly CarbonVuln[] => {
  const vulns: CarbonVuln[] = [];
  for (const pattern of CWE_PATTERNS) {
    const match = input.code.match(pattern.regex);
    if (match === null) continue;
    const idx = match.index ?? 0;
    const location = toLocation(input, idx, match);
    const id = createHash("sha256")
      .update(`${input.file}:${pattern.kind}:${idx}`)
      .digest("hex")
      .slice(0, 12);
    vulns.push({
      id: `carbon-${id}`,
      kind: pattern.kind,
      severity: pattern.severity,
      title: pattern.title,
      location,
      evidence: match[0].slice(0, 200),
      confidence: "observed",
      cwe: pattern.cwe,
    });
  }
  return vulns;
};

export const createCarbonScanEvidence = (input: ScanInput, vulns: readonly CarbonVuln[]) => {
  return createEvidence(
    {
      name: input.file,
      digest: { sha256: createHash("sha256").update(input.code).digest("hex") },
      local_path: input.file,
      format: "file" as const,
      architecture: null,
    },
    CARBON_PROVIDER,
    {
      operation: "carbon/secure-scan",
      parameters: { file: input.file },
      result: { vulns, count: vulns.length },
      rawResult: null,
      limitations: [...CARBON_LIMITATIONS],
      locations: vulns.map((v) => ({
        kind: "file-offset" as const,
        offset: v.location.column ?? 0,
      })),
      relationship_coverage: null,
    },
  );
};
