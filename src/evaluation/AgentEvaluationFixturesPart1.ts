export const __stub = 1;
// import { createHash } from "node:crypto";
// import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
// import { join } from "node:path";
//
// import { createPackage } from "@electron/asar";
//
// import type { JsonValue } from "../domain/jsonValue.js";
// import { javascriptApplicationAnalysisResultSchema } from "../domain/javascript/javascriptApplicationAnalysis.js";
// import type { ApplicationNode } from "../domain/javascript/javascriptApplicationGraphSchemas.js";
// import { javaScriptExportShapeComparisonResultSchema } from "../domain/javascript/javascriptExportShapeComparisonSchemas.js";
// import {
//   applicationFeatureTraceResultSchema,
//   featureSeedMatchMode,
// } from "../domain/javascript/javascriptFeatureTraceSchemas.js";
// import { javaScriptSemanticTraceResultSchema } from "../domain/javascript/javascriptSemanticTraceSchemas.js";
// import {
//   managedArtifactInspectionSchema,
//   managedMemberInspectionSchema,
// } from "../domain/managed/managedArtifact.js";
// import {
//   managedTokenScopesMatch,
//   parseManagedInspectionEvidence,
// } from "../domain/managed/managedInspectionEvidence.js";
// import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
// import type {
//   FixtureClaimContext,
//   FixtureClaimExpectation,
// } from "./KnownAnswerEvaluation.js";
//
// /** Source-owned artifact paths used by the configured known-answer benchmarks. */
// export interface AgentEvaluationFixtureTargets {
//   readonly javascript: string;
//   readonly javascriptSha256: string;
//   readonly javascriptShapeLeft: string;
//   readonly javascriptShapeRight: string;
//   readonly notesElectron: string;
//   readonly notesElectronSha256: string;
//   readonly managed?: string;
//   readonly managedSha256?: string;
// }
//
// const desktopFixtureFiles = {
//   "package.json": `${JSON.stringify({ name: "desktop-fixture", version: "1.0.0", main: "main.js" }, null, 2)}\n`,
//   "main.js":
//     'const { BrowserWindow, ipcMain } = require("electron");\nnew BrowserWindow({ webPreferences: { preload: require("node:path").join(__dirname, "preload.js"), contextIsolation: true, sandbox: true } });\nipcMain.handle("profile:read", (_event, id) => ({ id }));\n',
//   "preload.js":
//     'const { contextBridge, ipcRenderer } = require("electron");\ncontextBridge.exposeInMainWorld("profileApi", { read: (id) => ipcRenderer.invoke("profile:read", id) });\n',
//   "renderer/app.js": 'globalThis.profileApi.read("fixture");\n',
// };
//
// /** Materialize the exact packaged and source-owned parser targets used by the runner. */
// export const createAgentEvaluationFixtures = async (
//   root: string,
//   repositoryRoot: string,
// ): Promise<AgentEvaluationFixtureTargets> => {
//   const desktop = join(root, "desktop-app");
//   const javascript = join(root, "desktop-app.asar");
//   const javascriptShapeLeft = join(root, "parser-v1");
//   const javascriptShapeRight = join(root, "parser-v2");
//   const notesDirectory = join(root, "notes-electron");
//   const notesElectron = join(root, "notes-electron.asar");
//   await Promise.all([
//     mkdir(join(desktop, "renderer"), { recursive: true }),
//     mkdir(javascriptShapeLeft, { recursive: true }),
//     mkdir(javascriptShapeRight, { recursive: true }),
//   ]);
//   await Promise.all([
//     ...Object.entries(desktopFixtureFiles).map(([path, source]) =>
//       writeFile(join(desktop, path), source),
//     ),
//     cp(
//       join(repositoryRoot, "tests/fixtures/replay/parser.mjs"),
//       join(javascriptShapeLeft, "parser.mjs"),
//     ),
//     cp(
//       join(repositoryRoot, "tests/fixtures/replay/parser-v2.mjs"),
//       join(javascriptShapeRight, "parser.mjs"),
//     ),
//     cp(
//       join(repositoryRoot, "website/public/examples/notes-electron"),
//       notesDirectory,
//       { recursive: true },
//     ),
//   ]);
//   await createPackage(desktop, javascript);
//   await createPackage(notesDirectory, notesElectron);
//   return {
//     javascript,
//     javascriptSha256: createHash("sha256")
//       .update(await readFile(javascript))
//       .digest("hex"),
//     javascriptShapeLeft,
//     javascriptShapeRight,
//     notesElectron,
//     notesElectronSha256: createHash("sha256")
//       .update(await readFile(notesElectron))
//       .digest("hex"),
//   };
// };
//
// type GraphObservation = ApplicationNode["observations"][number];
//
// const singleObservation = (
//   value: JsonValue,
//   kind: ApplicationNode["kind"],
//   include: (observation: GraphObservation) => boolean = () => true,
// ): GraphObservation | undefined => {
//   const result = javascriptApplicationAnalysisResultSchema.safeParse(value);
//   if (!result.success) return undefined;
//   const candidates = result.data.graph.nodes
//     .filter((node) => node.kind === kind)
//     .flatMap((node) => node.observations)
//     .filter(include);
//   return candidates.length === 1 ? candidates[0] : undefined;
// };
//
// const observationSource = (
//   observation: GraphObservation,
// ): string | undefined => {
//   const location = observation.evidence.location;
//   return location.available && location.value.kind === "source-range"
//     ? location.value.source
//     : undefined;
// };
//
// const rendererApi = (value: JsonValue): JsonValue | undefined => {
//   const observation = singleObservation(value, "context-bridge-api");
//   if (observation === undefined) return undefined;
//   const { api_key: key, members, world } = observation.properties;
//   const source = observationSource(observation);
//   if (
//     key === undefined ||
//     members === undefined ||
//     world === undefined ||
//     source === undefined
//   )
//     return undefined;
//   return { key, members, world, source };
// };
//
// const ipcOperation =
//   (side: string) =>
export const _l = 142;
