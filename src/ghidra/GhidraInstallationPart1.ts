export const __stub = 1;
// import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
// import { spawnSync } from "node:child_process";
// import { constants } from "node:fs";
// import {
//   accessSync,
//   closeSync,
//   fstatSync,
//   openSync,
//   readFileSync,
//   readSync,
//   realpathSync,
//   statSync,
// } from "node:fs";
// import { delimiter as pathDelimiter, dirname, posix, win32 } from "node:path";
//
// import type { ProviderRejectionCode } from "../contracts/providerSelection.js";
// import {
//   parseExecutableHeader,
//   type ExecutableMetadata,
// } from "../domain/binaryTarget.js";
// import {
//   isMachOFormat,
//   type BinaryArchitecture,
// } from "../domain/binaryTargetTypes.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import {
//   ghidraApplicationProperties,
//   ghidraJavaMajorAccepted,
//   ghidraJavaRangeLabel,
//   ghidraJavaRequirement,
//   type GhidraApplicationProperties,
//   type GhidraJavaRequirement,
// } from "./GhidraInstallationPolicy.js";
// import {
//   ghidraReleaseAccepted,
//   ghidraReleaseCompatibility,
//   ghidraReleaseLine,
//   ghidraVersionDetail,
//   SUPPORTED_GHIDRA_VERSION,
// } from "./GhidraReleasePolicy.js";
//
// const NATIVE_PLATFORMS: Readonly<
//   Partial<
//     Record<
//       NodeJS.Platform,
//       Readonly<Partial<Record<NodeJS.Architecture, string>>>
//     >
//   >
// > = {
//   linux: { x64: "linux_x86_64", arm64: "linux_arm_64" },
//   darwin: { x64: "mac_x86_64", arm64: "mac_arm_64" },
//   win32: { x64: "win_x86_64" },
// };
//
// /** Executable format each supported host runs its own Ghidra native tools as. */
// const NATIVE_TOOL_FORMATS: Readonly<
//   Partial<Record<NodeJS.Platform, ExecutableMetadata["format"]>>
// > = {
//   linux: "elf",
//   darwin: "mach-o",
//   win32: "pe",
// };
//
// /** Node architecture identifiers as the executable-header parser reports them. */
// const NATIVE_ARCHITECTURES: readonly {
//   readonly node: NodeJS.Architecture;
//   readonly binary: BinaryArchitecture;
// }[] = [
//   { node: "x64", binary: "x86_64" },
//   { node: "ia32", binary: "x86" },
//   { node: "arm", binary: "arm" },
//   { node: "arm64", binary: "arm64" },
// ];
//
// /** Bound installation discovery reads; larger headers remain unknown. */
// const EXECUTABLE_HEADER_PROBE_BYTES = 4096;
//
// /**
//  * Bound the Java version probe so a chatty or hostile JVM cannot force an
//  * unbounded in-memory capture. Well-behaved JVMs print a few kilobytes for
//  * `-XshowSettings:properties`; the same 1 MiB budget used for other Java
//  * listings leaves ample headroom. A probe that exceeds the budget yields no
//  * observation and is reported through the existing failed-probe path.
//  */
// const JAVA_PROBE_MAX_OUTPUT_BYTES = 1024 * 1024;
//
// /** Compatibility of one present native decompiler with the inspected host. */
// type NativeDecompilerCompatibility =
//   | {
//       readonly status: "incompatible";
//       readonly detail: string;
//       readonly remediation: string;
//     }
//   | { readonly status: "compatible"; readonly detail: string }
//   | { readonly status: "unknown"; readonly detail: string };
//
// /**
//  * Judge a native decompiler by its own executable header instead of the
//  * directory name that admits it.
//  *
//  * Only a header that positively contradicts the host is `incompatible`. An
//  * absent, unreadable, truncated, or unrecognized header stays `unknown`, so a
//  * file the other checks already accept is never refused on missing evidence.
//  */
// const assessNativeDecompiler = (
//   path: string,
//   platform: NodeJS.Platform,
//   architecture: NodeJS.Architecture,
//   probe: GhidraExecutableHeaderProbe | undefined,
// ): NativeDecompilerCompatibility => {
//   const expectedFormat = NATIVE_TOOL_FORMATS[platform];
//   const expectedArchitecture = NATIVE_ARCHITECTURES.find(
//     ({ node }) => node === architecture,
//   )?.binary;
//   if (expectedFormat === undefined || expectedArchitecture === undefined)
//     return {
//       status: "unknown",
//       detail: `${path} is executable, but no native tool format is defined for ${platform}/${architecture}`,
//     };
//   let parsed =
//     probe === undefined
//       ? undefined
//       : parseExecutableHeader(probe.bytes, architecture, probe.size);
//   if (probe !== undefined && parsed !== undefined && !parsed.ok) {
//     // FAT parsing selects a host slice. A validated foreign slice can still
//     // prove that its complete architecture table excludes this host. If the
//     // host is listed but its slice is malformed, preserve the unknown outcome.
//     for (const { node } of NATIVE_ARCHITECTURES) {
//       if (node === architecture) continue;
//       const alternative = parseExecutableHeader(probe.bytes, node, probe.size);
//       if (
//         alternative.ok &&
//         !alternative.value.availableArchitectures.some(
//           (available) => available === expectedArchitecture,
//         )
//       ) {
//         parsed = alternative;
//         break;
//       }
//     }
//   }
//   if (parsed === undefined || !parsed.ok)
//     return {
//       status: "unknown",
//       detail: `${path} is executable, but its executable format for ${platform}/${architecture} could not be established`,
//     };
//   const observed = `${parsed.value.format} ${parsed.value.architecture}`;
//   const expected = `${expectedFormat} ${expectedArchitecture}`;
//   const formatMatches = isMachOFormat(expectedFormat)
//     ? isMachOFormat(parsed.value.format)
//     : parsed.value.format === expectedFormat;
//   if (formatMatches && parsed.value.architecture === expectedArchitecture)
//     return {
//       status: "compatible",
//       detail: `${path} reports ${observed}, which matches ${platform}/${architecture}`,
//     };
//   const nativeDirectory = NATIVE_PLATFORMS[platform]?.[architecture];
//   const executable = platform === "win32" ? "decompile.exe" : "decompile";
//   return {
//     status: "incompatible",
//     detail: `${path} reports ${observed}, but ${platform}/${architecture} requires ${expected}`,
//     remediation: `Provide an executable Ghidra/Features/Decompiler/os/${nativeDirectory ?? "<platform>"}/${executable} built for ${expected}, or its build/os equivalent. REA does not build or install native tools.`,
//   };
// };
//
// /** Caller-owned paths and host coordinates used for one installation probe. */
// export interface GhidraInstallationOptions {
//   readonly environment: Readonly<NodeJS.ProcessEnv>;
//   readonly installDir?: string;
//   readonly javaHome?: string;
//   readonly platform?: NodeJS.Platform;
//   readonly architecture?: NodeJS.Architecture;
// }
//
// /** One independently actionable part of the supported-installation contract. */
// export type GhidraInstallationCheck =
//   | {
//       readonly status: "passed";
//       readonly name: GhidraInstallationCheckName;
//       readonly detail: string;
//     }
//   | {
//       readonly status: "failed";
//       readonly name: GhidraInstallationCheckName;
//       readonly code: ProviderRejectionCode;
//       readonly detail: string;
//       readonly remediation: string;
//     };
//
// /** Stable identity for one Ghidra installation check. */
// export type GhidraInstallationCheckName =
//   | "configuration"
//   | "platform"
//   | "architecture"
//   | "installation"
//   | "version"
//   | "headless"
//   | "native_decompiler"
//   | "java";
//
// interface GhidraInstallationObservation {
//   readonly platform: NodeJS.Platform;
//   readonly architecture: NodeJS.Architecture;
//   readonly applicationPropertiesPath: string | null;
//   readonly nativeDecompilerPath: string | null;
//   readonly javaCommand: string;
//   /** Observed java.vm.name; omitted when the probe cannot establish VM identity. */
//   readonly javaVmName?: string;
//   /**
//    * Observed JVM os.arch; omitted when the probe cannot establish it. Ghidra
//    * selects its native decompiler directory from this value.
//    */
//   readonly javaOsArch?: string;
//   /**
//    * Observed JVM os.name; omitted when the probe cannot establish it. Ghidra
//    * selects its native decompiler OS directory from the JVM OS/architecture
//    * pair, so a non-host value selects an unvalidated directory.
//    */
//   readonly javaOsName?: string;
//   readonly checks: readonly GhidraInstallationCheck[];
// }
//
// /** Bounded observation of a supported BYO Ghidra installation and JDK. */
// export interface AvailableGhidraInstallation extends GhidraInstallationObservation {
//   readonly status: "available";
//   readonly installDir: string;
//   readonly analyzeHeadlessPath: string;
//   readonly applicationPropertiesPath: string;
//   readonly providerVersion: string;
//   readonly javaHome: string;
//   readonly javaVersion: string;
// }
//
// /** Bounded observation explaining why a BYO Ghidra installation is unusable. */
// export interface UnavailableGhidraInstallation extends GhidraInstallationObservation {
//   readonly status: "unavailable";
//   readonly installDir: string | null;
//   readonly analyzeHeadlessPath: string | null;
//   readonly providerVersion: string | null;
//   readonly javaHome: string | null;
//   readonly javaVersion: string | null;
//   readonly rejection: Readonly<{
//     code: ProviderRejectionCode;
//     reason: string;
//   }>;
// }
//
// /** Parsed available or unavailable state of one BYO Ghidra installation. */
// export type GhidraInstallationInspection =
//   | AvailableGhidraInstallation
//   | UnavailableGhidraInstallation;
//
// /** Parsed identity of the JDK selected for Ghidra. */
// export interface GhidraJavaObservation {
//   readonly version: string;
//   readonly major: number;
//   readonly home: string;
//   readonly bits: number | null;
//   /** Present when Java reported a bitness value that could not be parsed exactly. */
//   readonly unparsedBits?: string;
//   readonly runtime: "jdk" | "jre";
export const _l = 261;
