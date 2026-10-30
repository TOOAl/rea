export const __stub = 1;
// import type { GhidraSeedReport } from "./GhidraAnalysisSeeds.js";
// import { createHash } from "node:crypto";
// import { execFile } from "node:child_process";
// // Fake-backed provider coverage; real Ghidra verification lives in
// // `npm run verify:ghidra` and its focused variants.
// import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
// import { tmpdir } from "node:os";
// import { join } from "node:path";
// import { fileURLToPath } from "node:url";
// import { promisify } from "node:util";
// import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
// import * as nativeLoader from "../windows/WindowsNativeLoader.js";
// import { WINDOWS_NATIVE_AUTHORITY_UNAVAILABLE_REASON } from "../process/WindowsAuthority.js";
// import { fixtureDosLoadImage } from "./GhidraLoadImage.fixture.js";
// import { fixtureRawBinaryLoadImage } from "./GhidraRawBinaryLoadImage.fixture.js";
// import {
//   nativeAotPeDigest,
//   nativeAotPeFixture,
// } from "../../tests/fixtures/nativeaotPe.js";
// import { jsonValueSchema } from "../domain/jsonValue.js";
//
// import { parseConfig } from "../config/parseConfig.js";
// import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
// import { parseExecutableHeader } from "../domain/binaryTarget.js";
// import { GhidraProvider } from "./GhidraProvider.js";
// import type { GhidraTargetSnapshot } from "./GhidraClient.js";
// import type { GhidraProviderClientFactory } from "./GhidraProviderClient.js";
// import type { GhidraHeadlessLauncher } from "./GhidraLauncher.js";
// import type { GhidraInstallationHost } from "./GhidraInstallation.js";
// import { GHIDRA_SESSION_CAPABILITIES } from "./GhidraSessionValues.js";
// import { err, ok } from "../domain/result.js";
// import type { Result } from "../domain/result.js";
// import { GhidraSessionError } from "./GhidraSessionError.js";
// import { silentLogger } from "../logger.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import { ProviderStartupDeadline } from "../process/ProviderDeadline.js";
// import { createAnalysisProfile } from "../domain/analysisProfile.js";
// import { createAnalysisExecution } from "../application/AnalysisProvider.js";
// import { AnalysisSnapshotCache } from "../application/binary/AnalysisSnapshotCache.js";
// import { createEvidence } from "../domain/evidence.js";
// import { createEvidenceBundle } from "../domain/evidenceBundle.js";
//
// const INSTALL = "/opt/ghidra_12.1.4_PUBLIC";
// afterEach(() => vi.restoreAllMocks());
// const installationHost = (
//   platform: NodeJS.Platform = "linux",
// ): GhidraInstallationHost => ({
//   platform,
//   architecture: "x64",
//   readText: () => "application.version=12.1.4\napplication.java.min=21\n",
//   executable: () => true,
//   probeJava: () => ({
//     osArch: "amd64",
//     osName: platform === "win32" ? "Windows 11" : "Linux",
//     version: "21.0.11",
//     major: 21,
//     home: "/usr/lib/jvm/jdk-21",
//     bits: 64,
//     runtime: "jdk",
//     vmName: "OpenJDK 64-Bit Server VM",
//   }),
// });
//
// const provider = (
//   host = installationHost(),
//   clientFactory?: GhidraProviderClientFactory,
// ): GhidraProvider => {
//   const config = parseConfig({ GHIDRA_INSTALL_DIR: INSTALL });
//   if (!config.ok) throw config.error;
//   return new GhidraProvider(
//     config.value,
//     silentLogger,
//     {},
//     host,
//     clientFactory,
//   );
// };
//
// const createElfClient = async (ghidra: GhidraProvider) => {
//   const target = executableTarget("elf", "x86_64");
//   const resolved = await ghidra.resolveAnalysisProfile(target);
//   if (!resolved.ok) throw resolved.error;
//   if (resolved.value.profile === null)
//     throw new Error("Expected a bound Ghidra profile");
//   return ghidra.createClient(target, resolved.value.profile);
// };
//
// it.each([
//   "program-info-v1",
//   "program-info-v2",
//   "program-info-v3",
//   "program-info-v4",
// ])(
//   "retains historical PE PDB Evidence for %s without replaying its old projection",
//   async (pdbObservations) => {
//     const target = peTarget("x86_64");
//     const resolved = await provider().resolveAnalysisProfile(target);
//     if (!resolved.ok || resolved.value.profile === null)
//       throw new Error("Expected admitted PE profile");
//     const current = resolved.value.profile;
//     const prior = createAnalysisProfile(current.provider, {
//       ...current.parameters,
//       pdb_observations: pdbObservations,
//     });
//     const operation = "search_procedures";
//     const parameters = { pattern: "wmain" };
//     const limitations = [
//       pdbObservations === "program-info-v4"
//         ? "Legacy projection discarded NB10 declaration when the reported GUID was omitted."
//         : "Legacy projection collapsed unknown PDB load state.",
//     ];
//     const cache = new AnalysisSnapshotCache();
//     cache.record({
//       target,
//       profile: prior,
//       operation,
//       parameters,
//       execution: createAnalysisExecution([], prior.provider, {
//         subject: target,
//         analysisProfile: prior,
//         limitations,
//       }),
//     });
//     const evidence = createEvidence(target, prior.provider, {
//       operation,
//       parameters,
//       result: [],
//       analysisProfile: prior,
//       limitations,
//     });
//     const exported = cache.export(
//       target,
//       prior,
//       createEvidenceBundle([evidence]),
//     );
//     if (!exported.ok) throw exported.error;
//     const imported = new AnalysisSnapshotCache();
//     expect(imported.import(exported.value, undefined, () => ok(0)).ok).toBe(
//       true,
//     );
//     expect(
//       imported.lookup(target, current, operation, parameters),
//     ).toBeUndefined();
//     expect(
//       imported.lookup(target, prior, operation, parameters)?.limitations,
//     ).toEqual(expect.arrayContaining(limitations));
//     expect(exported.value.evidence_bundle.records).toContainEqual(evidence);
//   },
// );
//
// describe("Ghidra provider", () => {
//   it("commits DOS loader and real-mode language while retaining the CPU family", async () => {
//     const ghidra = provider();
//     const target: BinaryTarget = {
//       path: "/tmp/legacy.exe",
//       sha256: "a".repeat(64),
//       kind: "executable",
//       format: "dos-mz",
//       architecture: "x86",
//       availableArchitectures: ["x86"],
//     };
//     expect(ghidra.inspectTargetSupport(target).status).toBe("supported");
//     const resolved = await ghidra.resolveAnalysisProfile(target);
//     expect(resolved.ok && resolved.value).toMatchObject({
//       profile: {
//         parameters: {
//           target_format: "dos-mz",
//           architecture: "x86",
//           loader: "MzLoader",
//           language_id: "x86:LE:16:Real Mode",
//           compiler_spec_id: "default",
//           load_segment: "0x1000",
//           address_coordinates: "linear-byte-offset",
//         },
//       },
//     });
//     const windows = provider(installationHost("win32"));
//     expect(windows.inspectTargetSupport(target).status).toBe("unsupported");
//   });
//   it("discovers the exact installation once without launching Ghidra", () => {
//     let probeCount = 0;
//     const host: GhidraInstallationHost = {
//       ...installationHost(),
//       probeJava: () => {
//         probeCount += 1;
//         return {
//           osArch: "amd64",
//           osName: "Linux",
//           version: "21.0.11",
//           major: 21,
//           home: "/usr/lib/jvm/jdk-21",
//           bits: 64,
//           runtime: "jdk",
//         };
//       },
//     };
//     const ghidra = provider(host);
//
//     expect(ghidra.capabilities()).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           operation: "list_procedures",
//           effects: expect.objectContaining({
//             mutatesArtifact: false,
//             mayShowUi: false,
//             mayWriteFilesystem: true,
//           }),
//         }),
//         expect.objectContaining({
//           operation: "analyze_function",
//           limitations: expect.arrayContaining([
//             expect.stringContaining(
//               "unresolved targetless flows remain unknown",
//             ),
//           ]),
//         }),
//       ]),
//     );
//     expect(ghidra.inspectAvailability()).toMatchObject({
//       status: "available",
//       diagnostics: {
//         install_dir: INSTALL,
//         provider_version: "12.1.4",
//         java_version: "21.0.11",
//       },
//     });
//     expect(ghidra.inspectAvailability()).toMatchObject({ status: "available" });
//     expect(probeCount).toBe(1);
//   });
//
//   it("separates target kind, format, and concrete architecture", () => {
//     const ghidra = provider();
//     expect(
//       ghidra.inspectTargetSupport(executableTarget("elf", "x86_64")),
//     ).toMatchObject({
//       status: "supported",
//     });
//     expect(
//       ghidra.inspectTargetSupport(executableTarget("pe", "arm64")),
//     ).toMatchObject({
//       status: "supported",
//     });
//     expect(
//       ghidra.inspectTargetSupport({
//         path: "/tmp/fixture.asar",
//         sha256: "a".repeat(64),
//         kind: "archive",
//         format: "asar",
//       }),
//     ).toMatchObject({
//       status: "unsupported",
//       code: "target_kind_unsupported",
//     });
//     expect(
//       ghidra.inspectTargetSupport({
//         path: "/tmp/fixture.js",
//         sha256: "a".repeat(64),
//         kind: "artifact",
//         format: "javascript",
//       }),
//     ).toMatchObject({
//       status: "unsupported",
//       code: "target_kind_unsupported",
//     });
//   });
// });
//
// describe("Ghidra raw-binary profile", () => {
//   it("admits raw 6502 on Windows and binds its 16-bit language without mutation authority", async () => {
//     const ghidra = provider(installationHost("win32"));
//     const target: BinaryTarget = {
//       path: "/tmp/6502.bin",
//       sha256: "a".repeat(64),
//       kind: "executable",
//       format: "raw-binary",
//       architecture: "6502",
//       availableArchitectures: ["6502"],
//       entryPoint: "0x8001",
//       entryPointSource: "0x008001",
//     };
//     expect(ghidra.inspectTargetSupport(target).status).toBe("supported");
//     const resolved = await ghidra.resolveAnalysisProfile(target);
//     if (!resolved.ok) throw resolved.error;
//     expect(resolved.value.profile?.parameters).toMatchObject({
//       architecture: "6502",
//       loader: "BinaryLoader",
//       language_id: "6502:LE:16:default",
//       compiler_spec_id: "default",
//       entry_point: "0x8001",
//       language_selection: "caller-supplied-v1",
//       load_image_evidence: "independent-raw-mapping-context-v4",
//     });
//     expect(
//       ghidra
//         .capabilities()
//         .some(({ available, effects }) => available && effects.mutatesArtifact),
//     ).toBe(false);
//   });
//   it("commits BinaryLoader language and caller-supplied entry", async () => {
//     const ghidra = provider();
//     const target: BinaryTarget = {
//       path: "/tmp/ecu.bin",
//       sha256: "a".repeat(64),
//       kind: "executable",
//       format: "raw-binary",
//       architecture: "arm",
//       availableArchitectures: ["arm"],
//       entryPoint: "0x8000000",
//       entryPointSource: "0x08000000",
//     };
//     expect(ghidra.inspectTargetSupport(target).status).toBe("supported");
//     const resolved = await ghidra.resolveAnalysisProfile(target);
//     expect(resolved.ok && resolved.value).toMatchObject({
//       profile: {
//         parameters: {
//           target_format: "raw-binary",
//           architecture: "arm",
//           loader: "BinaryLoader",
//           language_id: "ARM:LE:32:v7",
//           compiler_spec_id: "default",
//           language_selection: "caller-supplied-v1",
//           entry_point: "0x8000000",
//         },
//       },
//     });
//     const shifted = await ghidra.resolveAnalysisProfile({
//       ...target,
//       entryPoint: "0x8001000",
//       entryPointSource: "0x8001000",
//     });
//     expect(resolved.ok && shifted.ok).toBe(true);
//     if (!resolved.ok || !shifted.ok || resolved.value.profile === null)
//       throw new Error("expected raw-binary profiles");
//     expect(shifted.value.profile?.digest).not.toBe(
//       resolved.value.profile.digest,
//     );
//     const windows = provider(installationHost("win32"));
//     expect(windows.inspectTargetSupport(target).status).toBe("unsupported");
//   });
// });
//
// describe("Ghidra Mach-O slice support", () => {
export const _l = 343;
