import { ok } from "../domain/result.js";
import { createAnalysisExecution } from "../application/AnalysisProvider.js";
export async function pullPackage(
  this: any,
  operation: any,
  _sel: any,
  client: any,
  provider: any,
  _input: any,
  _signal: any,
) {
  return ok(
    createAnalysisExecution(
      { client, provider, note: "pullPackage stub" },
      provider,
    ),
  );
}
export async function pullFile(this: any, ..._args: any[]) {
  return ok(
    createAnalysisExecution(
      { note: "pullFile stub" },
      { id: "adb", name: "adb", version: null },
    ),
  );
}
