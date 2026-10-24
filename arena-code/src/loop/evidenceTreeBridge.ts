/**
 * EvidenceTree Bridge — Phase 2: Harness² Evidence Tree를 메인 루프에 이식
 *
 * 배경: Phase 1의 EvidenceLedger는 메모리 내 요약(8개, 3000자)으로 프롬프트 토큰을 절감했지만,
 * 잘린 원문 전체는 유실된다. Harness²의 EvidenceTree는 디스크에 전체 궤적·산출물을 보존해
 * 모델이 언제든 파일을 직접 열어 확인할 수 있게 한다.
 *
 * 역할: Ledger(휘발성 요약) ↔ EvidenceTree(영속성 전체) 간 다리
 * - persistLedger(): Ledger → .arena/evidence/<taskId>/ 에 EvidenceTree 구축
 * - loadEvidencePointer(): EvidenceTree 레이아웃을 MISSION.md 포인터로 반환 (context.ts에 주입)
 *
 * 설계: additive — 기존 ledger 동작 유지, REA_EVIDENCE_TREE=1 일 때만 디스크 영속화
 */

import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildEvidenceTree, buildMission, type BuildOptions, type ContextTree } from "../harness2/context.js";
import type { EvidenceLedger } from "./evidenceLedger.js";

export interface PersistOptions {
  /** 증거 루트 (기본 .arena/evidence) */
  evidenceRoot?: string;
  /** 작업 프롬프트 원문 (task.md) */
  taskPrompt?: string;
  /** cwd — sourceDir로 복사할 소스 위치 */
  cwd?: string;
}

function ledgerToRolloutContent(ledger: EvidenceLedger): string {
  const entries = ledger.list();
  if (entries.length === 0) return "(no evidence yet)";
  const lines: string[] = ["# Evidence Ledger Dump (provenance-preserved)", ""];
  for (const e of entries) {
    const flag = e.truncated ? " [TRUNCATED]" : "";
    const kind = e.kind.toUpperCase();
    lines.push(`## ${e.id} — ${kind} / conf=${e.confidence}${flag}`);
    lines.push(`- source: ${e.source}`);
    lines.push(`- capturedAt: ${e.capturedAt}`);
    if (e.meta) lines.push(`- meta: ${JSON.stringify(e.meta)}`);
    lines.push("");
    // 전체 content 보존 (잘림 없이) — EvidenceTree는 디스크이므로 토큰 제한 없음
    lines.push(e.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Ledger를 디스크 EvidenceTree로 영속화
 * @returns ContextTree 또는 null (실패 시 — fail-closed)
 */
export function persistLedgerToTree(
  ledger: EvidenceLedger,
  taskId: string,
  opts: PersistOptions = {}
): ContextTree | null {
  if (ledger.list().length === 0) return null;
  try {
    const evidenceRoot = resolve(opts.evidenceRoot ?? join(process.cwd(), ".arena", "evidence"));
    const dest = join(evidenceRoot, sanitize(taskId));
    mkdirSync(evidenceRoot, { recursive: true });

    const trajectory = ledgerToRolloutContent(ledger);
    const taskPrompt = opts.taskPrompt ?? `Task ${taskId} — ledger snapshot at ${new Date().toISOString()}`;

    const buildOpts: BuildOptions = {
      taskId,
      taskPrompt,
      rollouts: [
        {
          label: "ledger-main",
          runId: taskId,
          ok: true,
          delivered: true,
          trajectory,
          deliverable: trajectory.slice(0, 20000), // deliverable도 ledger 요약
        },
      ],
      harness: null, // 메인 루프는 harness 트리 없음 — Phase 2에서는 ledger만 영속화
      sourceDir: opts.cwd ?? null,
    };

    const tree = buildEvidenceTree(dest, buildOpts);
    return tree;
  } catch {
    return null; // fail-closed: 영속화 실패해도 메인 루프는 계속 (메모리 ledger로 동작)
  }
}

/**
 * EvidenceTree를 프롬프트 포인터로 변환 (Harness² MISSION.md 패턴)
 * context.ts의 RichContextOptions.evidenceSummary 대신 이 포인터를 주입하면 토큰 절감
 */
export function buildEvidencePointer(tree: ContextTree | null): string | null {
  if (!tree) return null;
  try {
    const mission = buildMission(tree, { job: "Answer using evidence files — open context/ to verify, do not invent beyond evidence." });
    // MISSION.md 전체가 아니라 레이아웃 요약만 프롬프트에 — 전체는 모델이 필요시 파일을 열어봄
    return `${mission}\n\nEvidenceTree root: ${tree.root}\nRollouts: ${tree.rollouts.join(", ") || "none"}`;
  } catch {
    return null;
  }
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "task";
}
