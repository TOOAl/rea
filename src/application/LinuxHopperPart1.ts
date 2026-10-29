export const __stub = 1;
// import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
// import { tmpdir } from "node:os";
// import { join } from "node:path";
//
// import { execFileBoundedOutput } from "../process/ExecFileBoundedOutput.js";
// import { execFileOutput } from "../process/ExecFileOutput.js";
// import { downloadHopperPackage } from "./HopperDownload.js";
// import { hashStableFile } from "../filesystem/StableFileHash.js";
// import { err, type Result } from "../domain/result.js";
// import {
//   HOPPER_RELEASES_URL,
//   HOPPER_PUBLIC_KEY_URL,
//   HOPPER_DOWNLOAD_PREFIX,
//   HOPPER_LINUX_PRIMARY_FINGERPRINT,
//   HopperReleaseError,
//   type LinuxHopperRelease,
//   type LinuxPackageFamily,
// } from "./HopperReleaseFeed.js";
// import {
//   LinuxHopperPublisher,
//   retryLinuxHopperPublisherCleanup,
//   type VerifiedLinuxHopperPackage,
//   type VerifiedLinuxHopperLauncher,
// } from "./LinuxHopperPublisher.js";
//
// export type { LinuxPackageFamily } from "./HopperReleaseFeed.js";
//
// /** Package-manager output retained per stream without stopping the command. */
// const PACKAGE_MANAGER_OUTPUT_BYTES = 64 * 1024;
//
// /** Exact stable external effects disclosed before a Linux Hopper installation. */
// export interface LinuxHopperInstallDisclosure {
//   readonly networkOrigins: readonly string[];
//   readonly integrity: string;
//   readonly commands: readonly string[];
// }
//
// /** Describe the release and package-manager commands without downloading or writing. */
// export const linuxHopperInstallDisclosure = (
//   family: LinuxPackageFamily,
//   isRoot: boolean,
// ): LinuxHopperInstallDisclosure => {
//   return {
//     networkOrigins: [
//       HOPPER_RELEASES_URL,
//       HOPPER_PUBLIC_KEY_URL,
//       HOPPER_DOWNLOAD_PREFIX,
//     ],
//     integrity: `Detached PGP signature · primary ${HOPPER_LINUX_PRIMARY_FINGERPRINT} · package byte identity and installed launcher SHA-256 from the official feed`,
//     commands: linuxPackageManagerCommands(
//       family,
//       `<verified-hopper.${family}>`,
//       isRoot,
//     ).map(({ executable, args }) => formatCommandForDisplay(executable, args)),
//   };
// };
//
// interface LinuxDistributionIdentity {
//   readonly id: string;
//   readonly versionId?: string;
// }
//
// /**
//  * Parsed Linux distribution information used for package selection.
//  *
//  * `hopperSetupSupported` is the automated Hopper installer's tested list. It is
//  * narrower than the hosts where REA itself runs, which {@link supportsReaHost}
//  * answers from the package family.
//  */
// export type LinuxDistribution = LinuxDistributionIdentity &
//   (
//     | {
//         readonly packageFamily: LinuxPackageFamily;
//         readonly hopperSetupSupported: true;
//       }
//     | {
//         readonly packageFamily: LinuxPackageFamily | undefined;
//         readonly hopperSetupSupported: false;
//       }
//   );
//
// /**
//  * Whether REA's analysis providers run on this distribution. A recognized
//  * package family means a glibc host with a known package layout, which is what
//  * the providers need; downloading and installing the official Hopper package
//  * additionally requires a distribution on its tested list.
//  */
// export const supportsReaHost = (
//   distribution: LinuxDistribution | undefined,
// ): boolean => distribution?.packageFamily !== undefined;
//
// /** Download response kept independent of Node's global fetch implementation. */
// export interface LinuxHopperDownload {
//   readonly ok: boolean;
//   readonly bytes: Uint8Array;
// }
//
// /** One failed package-manager command, with the output that explains it. */
// export interface LinuxPackageInstallFailure {
//   /** The executed executable and arguments, joined for display. */
//   readonly command: string;
//   readonly exitCode: string | number | null;
//   readonly stdout: string;
//   readonly stderr: string;
//   /** Whether the command produced more output than was retained. */
//   readonly outputTruncated: boolean;
// }
//
// /** Whether the package-manager step installed the verified package. */
// export type LinuxPackageInstallOutcome =
//   | { readonly status: "installed" }
//   | {
//       readonly status: "failed";
//       readonly failure: LinuxPackageInstallFailure;
//     };
//
// /** External effects required to install the official Linux package. */
// export interface LinuxHopperInstallHost {
//   distribution(): Promise<LinuxDistribution | undefined>;
//   release(
//     family: LinuxPackageFamily,
//     signal?: AbortSignal,
//   ): Promise<Result<LinuxHopperRelease, HopperReleaseError>>;
//   download(
//     url: string,
//     options: { readonly signal?: AbortSignal },
//   ): Promise<LinuxHopperDownload>;
//   createTemporaryDirectory(): Promise<string>;
//   writeArchive(path: string, bytes: Uint8Array): Promise<void>;
//   installPackage(
//     family: LinuxPackageFamily,
//     archive: string,
//   ): Promise<LinuxPackageInstallOutcome>;
//   verifyArchive(
//     family: LinuxPackageFamily,
//     release: LinuxHopperRelease,
//     archive: string,
//     signal?: AbortSignal,
//   ): Promise<Result<VerifiedLinuxHopperPackage, HopperReleaseError>>;
//   retainVerifiedArchive(
//     verified: VerifiedLinuxHopperPackage,
//     archive: string,
//     signal?: AbortSignal,
//   ): Promise<Result<void, HopperReleaseError>>;
//   launcherStatus(
//     path: string,
//     expectedSha256: string,
//   ): Promise<LinuxHopperLauncherStatus>;
//   cleanup(path: string): Promise<void>;
//   close?(): Promise<void>;
export const _l = 150;
