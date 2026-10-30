import { ok } from "../domain/result.js";
import { createAnalysisExecution } from "../application/AnalysisProvider.js";
export async function captureScreen(this: any, ..._args: any[]) {
  return ok(
    createAnalysisExecution(
      { note: "captureScreen stub" },
      { id: "adb", name: "adb", version: null },
    ),
  );
}
export async function collectBugreport(this: any, ..._args: any[]) {
  return ok(
    createAnalysisExecution(
      { note: "collectBugreport stub" },
      { id: "adb", name: "adb", version: null },
    ),
  );
}
