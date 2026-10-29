export const __stub = 1;
// import { constants } from "node:fs";
// import { access, readdir, stat } from "node:fs/promises";
// import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
// import { homeDirectoryFromEnvironment } from "../config/homeDirectory.js";
// import { join } from "node:path";
//
// import { analysisErrorRemediationAction } from "../domain/analysisErrorPresentation.js";
// import { BinaryTargetError } from "../domain/configurationErrors.js";
// import { parseBinaryTarget } from "./BinaryTargetResolver.js";
// import { execFileOutput } from "../process/ExecFileOutput.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import {
//   javaScriptRuntime,
//   type JavaScriptRuntime,
// } from "../domain/runtimeVersion.js";
// import { installedCaskAppdir, probeHomebrew } from "./homebrew.js";
// import {
//   macHopperApplicationRoots,
//   macHopperRenamedLauncherCandidates,
// } from "./MacHopperPaths.js";
// import {
//   inspectLinuxHopperLauncher,
//   linuxSharedLibrariesAvailable,
//   readLinuxDistribution,
//   type LinuxDistribution,
// } from "./LinuxHopper.js";
// import type { Result } from "../domain/result.js";
// import type { HopperReleaseError } from "./HopperReleaseFeed.js";
// import type { VerifiedLinuxHopperLauncher } from "./LinuxHopperPublisher.js";
// import {
//   readInstalledSkillIdentity,
//   type InstalledSkillIdentity,
//   type SkillPathIssue,
// } from "./SetupSkill.js";
// import { CATALOG_IDENTITY } from "../catalogIdentity.js";
// import { PRODUCT_IDENTITY, SDK_IDENTITY } from "../identity.js";
// import {
//   readClientRegistrationStatuses,
//   type ClientRegistrationStatus,
//   type UnhealthyClientRegistrationStatus,
// } from "./ClientRegistrationStatus.js";
// import type { ProviderRequestBudgetResolver } from "./ClientRegistrationEnvironment.js";
// import {
//   collectDoctorDiagnostics,
//   doctorHealthy,
// } from "./DoctorDiagnostics.js";
// import {
//   normalizeDoctorScope,
//   scopeDoctorChecks,
//   type DoctorScopeReport,
// } from "./DoctorScope.js";
//
// /** One actionable environment diagnostic. */
// export interface DoctorCheck {
//   readonly name: string;
//   readonly ok: boolean;
//   readonly classification:
//     | "healthy"
//     | "missing_dependency"
//     | "runtime_failure"
//     | "unsupported_host"
//     | "unsupported_target"
//     | "missing_analysis_engine"
//     | "unknown"
//     | "config_drift";
//   readonly detail?: string;
//   readonly details?: Readonly<Record<string, JsonValue>>;
//   readonly remediation?: string;
// }
//
// /** One provider-owned check projected without importing its adapter types. */
// export interface DoctorProviderCheck {
//   readonly name: string;
//   readonly ok: boolean;
//   readonly code: string | null;
//   readonly detail: string;
//   readonly remediation: string | null;
//   readonly classification: Exclude<DoctorCheck["classification"], "healthy">;
//   readonly details?: Readonly<Record<string, JsonValue>>;
// }
//
// /** Read-only provider inspection supplied by an outer composition adapter. */
// export interface DoctorProviderInspection {
//   readonly id: string;
//   readonly configured: boolean;
//   readonly available: boolean;
//   readonly providerVersion: string | null;
//   /** Adapter-validated non-secret settings, independent of runtime readiness.
//    * Invalid installations publish no settings. */
//   readonly registrationEnvironment: Readonly<Record<string, string>>;
//   readonly checks: readonly DoctorProviderCheck[];
// }
// /** Read-only host capabilities required by diagnostics. */
// export interface DoctorHost {
//   readonly platform: NodeJS.Platform;
//   readonly architecture: NodeJS.Architecture;
//   readonly runtime: JavaScriptRuntime;
//   readonly homeDirectory: string;
//   readonly configuredHopperPath?: string;
//   readonly configuredIlspyCmdPath?: string;
//   macosVersion(): Promise<string | undefined>;
//   linuxDistribution(): Promise<LinuxDistribution | undefined>;
//   validTarget(path: string): Promise<boolean>;
//   /** Route-specific target admission details, when supplied by the host. */
//   inspectTarget?(path: string): Promise<DoctorCheck>;
//   executable(path: string): Promise<boolean>;
//   inspectLinuxHopper(
//     path: string,
//   ): Promise<Result<VerifiedLinuxHopperLauncher, HopperReleaseError>>;
//   linuxDemoRuntimeCheck(): Promise<DoctorCheck>;
//   brewHopperPath(): Promise<string | undefined>;
//   manualHopperPaths(): Promise<readonly string[]>;
//   providerInspections?(): Promise<readonly DoctorProviderInspection[]>;
//   /** Resolve a parsed upstream request budget from the effective client environment. */
//   resolveProviderRequestBudget?: ProviderRequestBudgetResolver;
//   /** Validated provider settings preserved by setup, independent of readiness. */
//   providerRegistrationEnvironment?(): Readonly<Record<string, string>>;
//   installationPaths?(): Promise<readonly string[]>;
//   /** Undefined checks installed skill roots; explicit selections stay scoped. */
//   installedSkillIdentity?(
//     clientIds: readonly string[] | undefined,
//   ): Promise<InstalledSkillIdentity | undefined>;
//   close?(): Promise<string | undefined>;
//   clientRegistrations?(): Promise<readonly ClientRegistrationStatus[]>;
//   ilspyCmdVersion?(path: string): Promise<string | undefined>;
// }
//
// /** Structured result returned by the read-only doctor workflow. */
// export interface DoctorReport {
//   readonly healthy: boolean;
//   readonly environment_healthy: boolean;
//   readonly scope: DoctorScopeReport;
//   readonly scope_checks: readonly DoctorCheck[];
//   readonly informational_checks: readonly DoctorCheck[];
//   readonly hopperPath?: string;
//   readonly providerInspections?: readonly DoctorProviderInspection[];
//   readonly checks: readonly DoctorCheck[];
//   readonly identity?: DoctorIdentity;
// }
//
// /** Caller-selected readiness boundary; omitted values retain audit semantics. */
// export interface DoctorScope {
//   readonly clients?: readonly string[];
//   readonly skillClients?: readonly string[];
//   readonly providers?: readonly string[];
//   readonly skill?: boolean;
// }
//
// /** Installed-package, skill, client, and runtime identity observations. */
// export type DoctorSkillState =
//   | "aligned"
//   | "stale"
//   | "missing"
//   | "unmanaged"
//   | "unknown";
//
// interface DoctorIdentity {
//   readonly cli_package_version: string;
//   readonly expected_skill_version: string;
//   readonly sdk: typeof SDK_IDENTITY;
//   readonly catalog: typeof CATALOG_IDENTITY;
//   readonly live_server: {
//     readonly state: "unknown";
//     readonly remediation: string;
//   };
//   readonly installations: {
//     readonly paths: readonly string[];
//     readonly state: "single" | "multiple" | "unknown";
//   };
//   readonly skill: {
//     readonly installed_version: string | null;
//     readonly installed_tool_count: number | null;
//     readonly state: DoctorSkillState;
//     readonly issues?: readonly SkillPathIssue[];
export const _l = 174;
