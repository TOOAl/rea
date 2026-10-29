export const __stub = 1;
// import { execFile } from "node:child_process";
// import { constants } from "node:fs";
// import { promisify } from "node:util";
// import { createHash } from "node:crypto";
// import { mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
// import { tmpdir } from "node:os";
// import { join } from "node:path";
// import { afterEach, describe, expect, it } from "vitest";
// import { parseConfig } from "../../config/parseConfig.js";
// import { projectAnalysisError } from "../../domain/analysisErrorProjection.js";
// import type { BinaryTarget } from "../../domain/binaryTargetTypes.js";
// import {
//   ghidraExtensionSchema,
//   resolveGhidraExtensions,
//   snapshotGhidraExtensions,
//   validateGhidraExtensionResults,
//   validateGhidraExtensionProfile,
//   type GhidraExtensionResult,
// } from "./GhidraExtensions.js";
//
// const roots: string[] = [];
// afterEach(async () => {
//   await Promise.all(
//     roots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
//   );
// });
// const root = async () => {
//   const path = await mkdtemp(join(tmpdir(), "rea-extension-test-"));
//   roots.push(path);
//   return path;
// };
// const target: BinaryTarget = {
//   path: "/tmp/native",
//   kind: "executable",
//   format: "elf",
//   architecture: "x86_64",
//   availableArchitectures: ["x86_64"],
//   sha256: "a".repeat(64),
// };
// const config = (path?: string) => {
//   const parsed = parseConfig(
//     path === undefined ? {} : { REA_GHIDRA_NATIVEAOT_JAR: path },
//   );
//   if (!parsed.ok) throw parsed.error;
//   return parsed.value;
// };
// const artifact = async () => {
//   const directory = await root();
//   const path = join(directory, "fixture.jar");
//   const bytes = Buffer.from([0x50, 0x4b, 3, 4, 0, 1, 2, 3]);
//   await writeFile(path, bytes);
//   const resolved = await resolveGhidraExtensions(config(path), target, "linux");
//   if (!resolved.ok || resolved.value[0] === undefined)
//     throw new Error("expected fixture artifact");
//   return { extension: resolved.value[0], bytes, path };
// };
// const result = (sha256: string): GhidraExtensionResult => ({
//   id: "nativeaot",
//   sha256,
//   status: "not_applicable",
//   reason: "No matching directory",
//   result: {
//     id: "nativeaot",
//     integration_api: 1,
//     source_revision: "effeb734fc570c32650f88b159608979dc7b423e",
//     source_revision_authority: "build-reported-unattested",
//     status: "not_applicable",
//     reason: "No matching directory",
//     method_tables: 0,
//     diagnostics: [],
//   },
// });
//
// describe("optional Ghidra extension refusals", () => {
//   it("rejects unsupported hosts and target architectures before opening files", async () => {
//     const host = await resolveGhidraExtensions(
//       config("/absent.jar"),
//       target,
//       "darwin",
//     );
//     expect(host.ok).toBe(false);
//     if (!host.ok)
//       // A host restriction is not an execution failure to retry or repair.
//       expect(projectAnalysisError(host.error)).toMatchObject({
//         code: "capability_unavailable",
//         retryable: false,
//         message: expect.stringContaining("verified on Linux only"),
//         remediation: {
//           action: expect.stringContaining("omit REA_GHIDRA_NATIVEAOT_JAR"),
//         },
//         details: {
//           provider_id: "ghidra",
//           operation: "resolve_analysis_profile",
//         },
//       });
//     const architecture = await resolveGhidraExtensions(
//       config("/absent.jar"),
//       {
//         ...target,
//         architecture: "arm64",
//         availableArchitectures: ["arm64"],
//       },
//       "linux",
//     );
//     expect(architecture.ok).toBe(false);
//     if (!architecture.ok)
//       expect(projectAnalysisError(architecture.error)).toMatchObject({
//         code: "unsupported_target",
//         remediation: {
//           action: expect.stringContaining("omit REA_GHIDRA_NATIVEAOT_JAR"),
//         },
//         details: {
//           operation: "resolve_analysis_profile",
//           path: target.path,
//           reason: expect.stringContaining("x86-64 ELF or native PE"),
//         },
//       });
//   });
// });
//
// describe("optional Ghidra extension boundary", () => {
//   it("keeps ordinary profiles free of unconfigured extensions", async () => {
//     expect(await resolveGhidraExtensions(config(), target, "linux")).toEqual({
//       ok: true,
//       value: [],
//     });
//   });
export const _l = 127;
