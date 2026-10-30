import { ok } from "../domain/result.js";
import { createAnalysisExecution } from "../application/AnalysisProvider.js";
export async function pushFile(this: any, ..._args: any[]) {
  return ok(
    createAnalysisExecution(
      { note: "push stub" },
      { id: "adb", name: "adb", version: null },
    ),
  );
}
export async function installPackage(this: any, ..._args: any[]) {
  return ok(
    createAnalysisExecution(
      { note: "install stub" },
      { id: "adb", name: "adb", version: null },
    ),
  );
}
export async function uninstallPackage(this: any, ..._args: any[]) {
  return ok(
    createAnalysisExecution(
      { note: "uninstall stub" },
      { id: "adb", name: "adb", version: null },
    ),
  );
}
