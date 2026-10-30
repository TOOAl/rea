import { ok } from "../domain/result.js";
import { createAnalysisExecution } from "../application/AnalysisProvider.js";
export const handle = async (..._args: any[]) =>
  ok(
    createAnalysisExecution(
      { note: "activities stub" },
      { id: "adb", name: "adb", version: null },
    ),
  );
