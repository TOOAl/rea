export const __stub = 1;
// }
//
// /** Structured outcome for every expected Linux installation failure. */
// export type LinuxHopperInstallResult =
//   | ({ readonly status: "installed"; readonly launcherPath: string } & {
//       readonly cleanupFailure?: LinuxHopperTemporaryCleanupFailure;
//     })
//   | ({
//       readonly status: "failed";
//       readonly reason:
//         | "unsupported_host"
//         | "release_metadata"
//         | "download"
//         | "integrity"
//         | "authorization_or_package_manager"
//         | "launcher_missing"
//         | "runtime_dependencies"
//         | "unsupported_hopper_build"
//         | "publisher_verification_failed"
//         | "verification_unavailable"
//         | "cleanup_failed"
//         | "cancelled";
//       /**
//        * The failing package-manager command and its output. Present only when
//        * the package-manager step itself failed, so setup can report what the
//        * package manager said instead of assuming an authorization problem.
//        */
//       readonly packageFailure?: LinuxPackageInstallFailure;
//       /** Publisher-owned failure, retained for the public setup diagnostic. */
//       readonly verificationFailure?: HopperReleaseError;
//     } & { readonly cleanupFailure?: LinuxHopperTemporaryCleanupFailure });
//
// /** Failed removal of an owned temporary install directory. */
// export interface LinuxHopperTemporaryCleanupFailure {
//   readonly path: string;
//   readonly reason: string;
// }
//
// /** Own failed temporary cleanup until a later retry succeeds. */
// export class LinuxHopperTemporaryCleanupOwner {
//   private readonly pending = new Map<
//     string,
//     LinuxHopperTemporaryCleanupFailure
//   >();
//
//   retain(failure: LinuxHopperTemporaryCleanupFailure): void {
//     this.pending.set(failure.path, failure);
//   }
//
//   async retry(
//     cleanup: (path: string) => Promise<void>,
//   ): Promise<string | undefined> {
//     const failures: string[] = [];
//     for (const path of this.pending.keys()) {
//       try {
//         await cleanup(path);
//         this.pending.delete(path);
//       } catch (cause: unknown) {
//         const reason = cause instanceof Error ? cause.message : String(cause);
//         failures.push(
//           `Linux Hopper temporary cleanup failed for ${path}: ${reason}`,
//         );
//       }
//     }
//     return failures.length === 0 ? undefined : failures.join("; ");
//   }
// }
//
// export type LinuxHopperLauncherStatus =
//   | "ready"
//   | "missing"
//   | "runtime_dependencies"
//   | "unsupported_hopper_build";
//
// /** Parse an os-release document without executing its shell syntax. */
// export const parseLinuxDistribution = (text: string): LinuxDistribution => {
//   const fields = new Map<string, string>();
//   for (const line of text.split("\n")) {
//     const match = /^([A-Z_]+)=(.*)$/u.exec(line.trim());
//     if (match === null) continue;
//     const key = match[1];
//     const encoded = match[2];
//     if (key === undefined || encoded === undefined) continue;
//     const quote = encoded[0];
//     const quoted = (quote === "'" || quote === '"') && encoded.endsWith(quote);
//     const value = !quoted
//       ? encoded
//       : quote === "'"
//         ? encoded.slice(1, -1)
//         : encoded.slice(1, -1).replace(/\\(["\\$`])/gu, "$1");
//     fields.set(key, value);
//   }
//   const id = (fields.get("ID") ?? "unknown").toLowerCase();
//   const versionId = fields.get("VERSION_ID");
//   const packageFamily = packageFamilyFor(id, fields.get("ID_LIKE"));
//   const hopperSetupSupported =
//     packageFamily !== undefined &&
//     (id === "arch" ||
//       id === "cachyos" ||
//       (id === "omarchy" && packageFamily === "arch") ||
//       (id === "ubuntu" && versionAtLeast(versionId, 24)) ||
//       (id === "fedora" && versionAtLeast(versionId, 41)) ||
//       (id === "nobara" && versionAtLeast(versionId, 44)));
//   const identity = {
//     id,
//     ...(versionId === undefined ? {} : { versionId }),
//   };
//   return hopperSetupSupported
//     ? { ...identity, packageFamily, hopperSetupSupported: true }
//     : { ...identity, packageFamily, hopperSetupSupported: false };
// };
//
// /** Read and classify the current Linux distribution. */
// export const readLinuxDistribution = async (): Promise<
//   LinuxDistribution | undefined
// > => {
//   try {
//     return parseLinuxDistribution(await readFile("/etc/os-release", "utf8"));
//   } catch (cause: unknown) {
//     // best-effort cleanup: optional host probing; unknown distribution means unsupported.
//     void cause;
//     return undefined;
//   }
// };
//
// /** Download, verify, install, and read back the official Hopper Linux package. */
// export const installLinuxHopper = async (
//   host: LinuxHopperInstallHost = systemLinuxHopperInstallHost(process.env),
//   options: {
//     readonly signal?: AbortSignal;
//   } = {},
// ): Promise<LinuxHopperInstallResult> => {
//   if (options.signal?.aborted === true)
//     return { status: "failed", reason: "cancelled" };
//   const distribution = await host.distribution();
//   if (distribution?.hopperSetupSupported !== true)
//     return { status: "failed", reason: "unsupported_host" };
//   let temporary: string | undefined;
//   let result: LinuxHopperInstallResult;
//   try {
//     result = await (async (): Promise<LinuxHopperInstallResult> => {
//       const selected = await host.release(
//         distribution.packageFamily,
//         options.signal,
//       );
//       if (!selected.ok)
//         return {
//           status: "failed",
//           verificationFailure: selected.error,
//           reason:
export const _l = 150;
