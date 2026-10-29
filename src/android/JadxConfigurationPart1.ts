export const __stub = 1;
// import { constants } from "node:fs";
// import { access, realpath, stat } from "node:fs/promises";
// import { delimiter, isAbsolute, join, resolve } from "node:path";
// import { inspectWindowsNativeReadiness } from "../process/WindowsAuthority.js";
// import { systemWindowsNativeAuthority } from "../windows/WindowsNativeLoader.js";
// import { AnalysisCapabilityUnavailableError } from "../domain/analysisErrorCore.js";
// import type { AndroidOperation } from "../domain/android/androidAnalysis.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import type { ProviderAvailability } from "../application/AnalysisProvider.js";
// import { ZipArtifactReader } from "../artifacts/ZipArtifactReader.js";
// import {
//   execFileOutput,
//   execFileOutputFailure,
// } from "../process/ExecFileOutput.js";
// import type { DoctorProviderCheck } from "../application/Doctor.js";
// import {
//   JADX_JAR_CONFIGURATION_REMEDIATION,
//   JADX_JAVA_PROBE_REMEDIATION,
//   JADX_JAVA_RUNTIME_REMEDIATION,
//   JADX_JVM_OPTIONS_REMEDIATION,
//   JADX_UNSUPPORTED_HOST_REMEDIATION,
//   JADX_WINDOWS_NATIVE_REMEDIATION,
// } from "./JadxRelease.js";
//
// const JAVA_MODULE_LISTING_TIMEOUT_MS = 10_000;
// const JAVA_MODULE_LISTING_MAX_OUTPUT_BYTES = 1024 * 1024;
// // Bound ZIP metadata allocation during discovery. The audited 0.7.1 JAR's
// // central directory occupies 2,294,350 bytes; class bodies are not read here.
// const JAR_METADATA_READ_MAX_BYTES = 8 * 1024 * 1024;
//
// /** Caller-supplied tools, resolved only when an Android operation is selected. */
// export interface JadxConfiguration {
//   readonly jar: string;
//   readonly java: string;
//   readonly jvmArguments: readonly string[];
// }
//
// type ConfigurationFailureCode =
//   | "not_configured"
//   | "executable_missing"
//   | "runtime_missing"
//   | "runtime_unavailable"
//   | "unsupported_host"
//   | "unsupported_version"
//   | "version_unresolved"
//   | "open_options_invalid";
//
// /**
//  * Failure kinds tagged at the JADX configuration boundary. Consumers (the
//  * doctor adapter) project the boundary's remediation and classification for
//  * a kind; they must not reinterpret the phase/setting evidence to derive
//  * them.
//  */
// export type JadxFailureKind =
//   | "windows_native_artifact"
//   | "windows_native_runtime"
//   | "java_runtime"
//   | "java_home"
//   | "jvm_options"
//   | "jar"
//   | "java_probe"
//   | "unsupported_host";
//
// /** Runtime mirror of JadxFailureKind for validating the loose diagnostics tag. */
// export const JADX_FAILURE_KINDS: readonly JadxFailureKind[] = [
//   "windows_native_artifact",
//   "windows_native_runtime",
//   "java_runtime",
//   "java_home",
//   "jvm_options",
//   "jar",
//   "java_probe",
//   "unsupported_host",
// ];
//
// export interface JadxFailureOutcome {
//   readonly remediation: string;
//   readonly classification: DoctorProviderCheck["classification"];
// }
//
// /**
//  * Project the boundary-owned remediation and classification for a failure
//  * kind. A null kind (missing or corrupt tag) keeps JAR guidance, matching
//  * the previous fallthrough for unclassified failures.
//  */
// export const projectJadxFailureOutcome = (
//   kind: JadxFailureKind | null,
//   configured: boolean,
// ): JadxFailureOutcome => {
//   const drift = configured ? "config_drift" : "missing_analysis_engine";
//   switch (kind) {
//     case "windows_native_artifact":
//       return {
//         remediation: JADX_WINDOWS_NATIVE_REMEDIATION,
//         classification: "missing_dependency",
//       };
//     case "windows_native_runtime":
//       return {
//         remediation: JADX_WINDOWS_NATIVE_REMEDIATION,
//         classification: "runtime_failure",
//       };
//     case "java_runtime":
//       return {
//         remediation: JADX_JAVA_RUNTIME_REMEDIATION,
//         classification: "missing_dependency",
//       };
//     case "java_home":
//       return {
//         remediation: JADX_JAVA_RUNTIME_REMEDIATION,
//         classification: drift,
//       };
//     case "jvm_options":
//       return {
//         remediation: JADX_JVM_OPTIONS_REMEDIATION,
//         classification: drift,
//       };
//     case "jar":
//       return {
//         remediation: JADX_JAR_CONFIGURATION_REMEDIATION,
//         classification: drift,
//       };
//     case "java_probe":
//       return {
//         remediation: JADX_JAVA_PROBE_REMEDIATION,
//         classification: drift,
//       };
//     case "unsupported_host":
//       return {
//         remediation: JADX_UNSUPPORTED_HOST_REMEDIATION,
//         classification: "unsupported_host",
//       };
//     case null:
//       return {
//         remediation: JADX_JAR_CONFIGURATION_REMEDIATION,
//         classification: drift,
//       };
//   }
// };
//
// class JadxConfigurationFailure extends Error {
//   constructor(
//     readonly code: ConfigurationFailureCode,
//     message: string,
//     readonly diagnostics: Readonly<Record<string, JsonValue>>,
//     readonly kind: JadxFailureKind,
//     options?: ErrorOptions,
//   ) {
//     super(message, options);
//   }
// }
//
// /** Inspect the same JAR and Java prerequisites that gate actual execution. */
// export const inspectJadxAvailability = async (
//   environment: Readonly<Record<string, string | undefined>>,
//   signal?: AbortSignal,
// ): Promise<ProviderAvailability> => {
//   try {
//     const configuration = await readJadxConfigurationInputs(
//       environment,
//       signal,
export const _l = 160;
