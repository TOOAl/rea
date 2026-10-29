export const __stub = 1;
// import { createHash } from "node:crypto";
// import { execFile } from "node:child_process";
// import {
//   access,
//   mkdir,
//   mkdtemp,
//   readdir,
//   rename,
//   rm,
//   writeFile,
// } from "node:fs/promises";
// import { tmpdir } from "node:os";
// import { dirname, join } from "node:path";
// import { promisify } from "node:util";
//
// import { z } from "zod";
// import { homeDirectoryFromEnvironment } from "../config/homeDirectory.js";
// import { HOPPER_PUBLISHER } from "../domain/hopperPublisher.js";
// import { macDeveloperIdRequirement } from "../process/MacCodeSignature.js";
// import { macHopperUserApplicationPath } from "./MacHopperPaths.js";
// import {
//   downloadHopperPackage,
//   HOPPER_DOWNLOAD_BYTES,
// } from "./HopperDownload.js";
// import type { HopperInstallFailureReason } from "./SetupInstallFailure.js";
//
// const execFileAsync = promisify(execFile);
// const RELEASES_URL =
//   "https://www.hopperapp.com/include/files-api.php?request=releases&public=true";
// const DOWNLOAD_PREFIX = "https://www.hopperapp.com:443/downloader/public/";
// const HOPPER_PUBLISHER_REQUIREMENT = macDeveloperIdRequirement(
//   HOPPER_PUBLISHER.bundleIdentifier,
//   HOPPER_PUBLISHER.teamIdentifier,
// );
//
// /** Outcome of reading a mounted bundle's signature and publisher identity. */
// export type MacHopperBundleVerification =
//   | "verified"
//   | "invalid_signature"
//   | "unverified_publisher";
//
// type MacHopperInstallFailureReason = Extract<
//   HopperInstallFailureReason,
//   | "release_metadata"
//   | "download"
//   | "integrity"
//   | "launcher_missing"
//   | "destination_exists"
//   | "mount"
//   | "bundle"
//   | "publisher_verification_failed"
//   | "copy"
// >;
//
// export type MacHopperBundleInstallResult =
//   | { readonly status: "installed"; readonly cleanupFailure?: string }
//   | {
//       readonly status: "failed";
//       readonly reason: "copy" | "launcher_missing";
//       readonly diagnostic: string;
//       readonly cleanupFailure?: string;
//     };
//
// /** Filesystem effects for one installer-owned bundle replacement transaction. */
// export interface MacHopperBundleInstallOperations {
//   createStagingRoot(parent: string): Promise<string>;
//   copyBundle(source: string, stage: string): Promise<void>;
//   requireLauncher(path: string): Promise<void>;
//   pathExists(path: string): Promise<boolean>;
//   rename(source: string, destination: string): Promise<void>;
//   removeStagingRoot(path: string): Promise<void>;
// }
//
// /** Stable network and command effects disclosed before macOS Hopper setup. */
// export const macHopperInstallDisclosure = {
//   networkOrigins: [RELEASES_URL, DOWNLOAD_PREFIX] as const,
//   commands: [
//     "hdiutil attach -readonly -nobrowse -mountpoint <private-mount> <verified-hopper.dmg>",
//     "codesign --verify --deep --strict <mounted-hopper.app>",
//     `codesign --verify --strict '-R${HOPPER_PUBLISHER_REQUIREMENT}' <mounted-hopper.app>`,
//     "ditto <mounted-hopper.app> <user-Applications-stage>",
//     "open <installed-hopper.app>",
//   ] as const,
// };
//
// /** Result of installing the official Hopper macOS application. */
// export type MacHopperInstallResult =
//   | {
//       readonly status: "installed";
//       readonly launcherPath: string;
//       readonly cleanupFailure?: string;
//       readonly openFailure?: string;
//     }
//   | {
//       readonly status: "failed";
//       readonly reason: MacHopperInstallFailureReason;
//       readonly diagnostic?: string;
//       readonly cleanupFailure?: string;
//     };
//
// /** External effects used by the bounded macOS Hopper installer. */
// export interface MacHopperInstallHost {
//   download(
//     url: string,
//   ): Promise<{ readonly ok: boolean; readonly bytes: Uint8Array }>;
//   createTemporaryDirectory(): Promise<string>;
//   createMountDirectory(path: string): Promise<void>;
//   writePackage(path: string, bytes: Uint8Array): Promise<void>;
//   mount(packagePath: string, mountPath: string): Promise<boolean>;
//   unmount(mountPath: string): Promise<void>;
//   appBundle(mountPath: string): Promise<string | undefined>;
//   validBundle(appPath: string): Promise<MacHopperBundleVerification>;
//   destinationExists(path: string): Promise<boolean>;
//   installBundle(
//     source: string,
//     destination: string,
//     replaceExisting: boolean,
//   ): Promise<MacHopperBundleInstallResult>;
//   openApplication(path: string): Promise<void>;
//   cleanup(path: string): Promise<void>;
//   /** Retain the cleanup capability until the owning setup host retries it. */
//   retainCleanup?(cleanup: () => Promise<void>): void;
//   destination(): string;
// }
//
// /** Download, verify, and install Hopper into the current user's Applications directory. */
// export const installMacHopper = async (
//   options: { readonly replaceExisting?: boolean } = {},
export const _l = 128;
