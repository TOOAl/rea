/**
 * Carbon CLI — rea carbon scan/verify/patch/plan
 * Ghidra 관점: 모든 명령은 evidence_id를 반환 (주소=증거)
 */
import { readFile } from "node:fs/promises";

import { scanCarbonSecure, createCarbonScanEvidence } from "../domain/carbon/carbonSecureScanner.js";
import { verifyCarbonExploit, createCarbonExploitEvidence } from "../domain/carbon/carbonExploitVerifier.js";
import { generateCarbonPatch, createCarbonPatchEvidence } from "../domain/carbon/carbonSecurePatcher.js";
import { createCarbonPlan, advanceCarbonPlan, createCarbonPlanEvidence } from "../domain/carbon/carbonLongHorizonPlanner.js";
import { checkCarbonInjection } from "../domain/carbon/carbonInjectionShield.js";
import { measureCarbonTokens } from "../domain/carbon/carbonTokenMeter.js";

export type CarbonCommand = "scan" | "verify" | "patch" | "plan" | "shield" | "meter";

export const runCarbonCommand = async (input: {
  readonly command: CarbonCommand;
  readonly file?: string;
  readonly goal?: string;
  readonly text?: string;
}): Promise<unknown> => {
  switch (input.command) {
    case "scan": {
      if (input.file === undefined) throw new Error("carbon scan requires --file");
      const code = await readFile(input.file, "utf8");
      const vulns = scanCarbonSecure({ file: input.file, code });
      const evidence = createCarbonScanEvidence({ file: input.file, code }, vulns);
      return { vulns, evidenceId: evidence.evidence_id, limitations: evidence.limitations };
    }
    case "verify": {
      if (input.file === undefined) throw new Error("carbon verify requires --file");
      const code = await readFile(input.file, "utf8");
      const vulns = scanCarbonSecure({ file: input.file, code });
      const results = vulns.map((v) => verifyCarbonExploit({ vuln: v, code }));
      const evidences = vulns.map((v, i) => {
        const r = results[i];
        return r === undefined ? null : createCarbonExploitEvidence({ vuln: v, code }, r);
      });
      return { results, evidences: evidences.map((e) => e?.evidence_id) };
    }
    case "patch": {
      if (input.file === undefined) throw new Error("carbon patch requires --file");
      const code = await readFile(input.file, "utf8");
      const vulns = scanCarbonSecure({ file: input.file, code });
      const patches = vulns.map((v) => generateCarbonPatch({ vuln: v, oldCode: code }));
      const evidences = vulns.map((v, i) => {
        const p = patches[i];
        return p === undefined ? null : createCarbonPatchEvidence({ vuln: v, oldCode: code }, p);
      });
      return { patches, evidences: evidences.map((e) => e?.evidence_id) };
    }
    case "plan": {
      if (input.goal === undefined) throw new Error("carbon plan requires --goal");
      const plan = createCarbonPlan({ goal: input.goal, steps: 10, horizon: "days" });
      const evidence = createCarbonPlanEvidence(plan);
      return { plan, evidenceId: evidence.evidence_id };
    }
    case "shield": {
      if (input.text === undefined) throw new Error("carbon shield requires --text");
      return checkCarbonInjection(input.text);
    }
    case "meter": {
      return measureCarbonTokens({ inputTokens: 1_000_000, outputTokens: 500_000, cachedInputTokens: 500_000 });
    }
    default: {
      const exhaustive: never = input.command;
      throw new Error(`Unknown carbon command: ${String(exhaustive)}`);
    }
  }
};

// Long-horizon re-export for direct use
export { advanceCarbonPlan };
