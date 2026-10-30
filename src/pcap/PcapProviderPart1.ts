export const __stub = 1;
// import type {
//   ExecutionOptions,
//   ProviderAvailability,
// } from "../application/AnalysisProvider.js";
// import {
//   createAnalysisExecution,
//   type AnalysisExecution,
// } from "../application/AnalysisProvider.js";
// import {
//   pcapResultSchemas,
//   type PcapRequest,
//   type PcapOperation,
// } from "../domain/pcap/pcapAnalysis.js";
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisProtocolError,
// } from "../domain/analysisErrorCore.js";
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
// import { err, ok, type Result } from "../domain/result.js";
// import type { ProviderProcessSupervisor } from "../process/ProviderProcess.js";
// import {
//   PcapConfigurationFailure,
//   inspectPcapClient,
//   resolvePcapTools,
//   pcapConfigurationAvailability,
//   pcapToolUnavailable,
//   type PcapToolSelection,
// } from "./PcapConfiguration.js";
// import {
//   parseCapinfosOutput,
//   parseTsharkJsonOutput,
//   TSHARK_JSON_MAX_BYTES,
// } from "./PcapOutput.js";
// import {
//   runPcapCommand,
//   type PcapCommandCleanup,
//   type PcapCommandLimits,
//   type PcapCommandLauncher,
// } from "./PcapCommand.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import { jsonValueSchema } from "../domain/jsonValue.js";
// import { createPcapEvidence } from "../domain/pcap/pcapEvidence.js";
// import { preparePcapNativeBound } from "./PcapNativeBound.js";
// import { PcapSnapshot } from "./PcapSnapshot.js";
// import { readStableArtifact } from "../artifacts/readStableArtifact.js";
// import { ArtifactAnalysisResources } from "../process/ArtifactAnalysisResources.js";
// import { readLinuxResourceLimits } from "../process/LinuxResourceLimits.js";
//
// export const PCAP_PROVIDER_IDENTITY = {
//   id: "pcap",
//   name: "Packet capture analysis",
//   version: null,
// } as const;
// const FIELDS = [
//   "frame.number",
//   "frame.protocols",
//   "ip.src",
//   "ip.dst",
//   "ipv6.src",
//   "ipv6.dst",
//   "dns.flags.response",
//   "dns.qry.name",
//   "dns.a",
//   "dns.aaaa",
//   "tls.handshake.extensions_server_name",
//   "http.request.full_uri",
// ];
//
// const pcapPartialEvidence = (
//   request: PcapRequest,
//   provider:
//     | typeof PCAP_PROVIDER_IDENTITY
//     | {
//         readonly id: string;
//         readonly name: string;
//         readonly version: string | null;
//       },
//   path: string,
//   identity: { readonly bytes: number; readonly sha256: string },
//   result: unknown,
//   limitations: readonly string[],
// ) =>
//   createPcapEvidence(request, {
//     subject: { path, format: "file", sha256: identity.sha256 },
//     provider,
//     result: jsonValueSchema.parse(result),
//     rawResult: null,
//     limitations,
//     locations: [{ kind: "artifact-path", path }],
//   });
//
// const pcapCommandCleanupError = (
//   operation: PcapOperation,
//   snapshotPath: string | undefined,
//   cleanup: PcapCommandCleanup,
//   capturedOutput: { readonly stdout: string; readonly stderr: string },
//   partialObservation?: ReturnType<typeof pcapPartialEvidence>,
// ) =>
//   new ProviderCleanupError(
//     "pcap",
//     [
//       ...new Set([
//         ...(snapshotPath === undefined ? [] : [snapshotPath]),
//         ...cleanup.resources,
//       ]),
//     ],
//     {
//       reason: cleanup.reason,
//       previous_error: null,
//       captured_output: {
//         stdout: capturedOutput.stdout,
//         stderr: capturedOutput.stderr,
//         truncated: cleanup.capturedOutput.truncated,
//       },
//     },
//     {
//       operation,
//       ...(partialObservation === undefined ? {} : { partialObservation }),
//     },
//   );
//
// export interface PcapProviderOptions {
//   readonly environment?: Readonly<Record<string, string | undefined>>;
//   readonly launcher?: PcapCommandLauncher;
// }
//
// /** Inspect saved captures through bounded, owned tool processes and one stable input copy. */
// export class PcapProvider {
//   readonly #resources = new ArtifactAnalysisResources(
//     "pcap",
//     "inspect_pcap_capture",
//     readStableArtifact,
//     readLinuxResourceLimits,
//     {
//       message: "A packet summary is already active; retry after it completes.",
//       details: { max_concurrent_inspections: 1 },
//     },
//   );
//   private readonly environment: Readonly<Record<string, string | undefined>>;
//   private readonly launcher: PcapCommandLauncher | undefined;
//   private readonly snapshots = new Set<PcapSnapshot>();
//   private readonly commands = new Map<
//     ProviderProcessSupervisor,
//     {
//       snapshot: PcapSnapshot | undefined;
//       resources: readonly string[];
//       reason: string;
//       capturedOutput: PcapCommandCleanup["capturedOutput"];
//     }
//   >();
//
//   constructor(options: PcapProviderOptions = {}) {
//     this.environment = options.environment ?? process.env;
//     this.launcher = options.launcher;
//   }
//
//   private async run(
//     operation: PcapOperation,
//     command: string,
//     args: readonly string[],
//     limits: PcapCommandLimits,
//     signal: AbortSignal | undefined,
//     snapshot?: PcapSnapshot,
//     inputPath?: string,
//   ) {
//     let cleanup: PcapCommandCleanup | undefined;
//     const output = await runPcapCommand({
//       operation,
//       command,
export const _l = 172;
