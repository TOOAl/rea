import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Result } from "../domain/result.js";
import {
  HOPPER_RELEASES_URL,
  HOPPER_PUBLIC_KEY_URL,
  HOPPER_DOWNLOAD_PREFIX,
  HOPPER_LINUX_PRIMARY_FINGERPRINT,
  HopperReleaseError,
  type LinuxHopperRelease,
  type LinuxPackageFamily,
} from "./HopperReleaseFeed.js";
import {
  retryLinuxHopperPublisherCleanup,
  type VerifiedLinuxHopperPackage,
} from "./LinuxHopperPublisher.js";

export type { LinuxPackageFamily } from "./HopperReleaseFeed.js";

/** Package-manager output retained per stream without stopping the command. */
const PACKAGE_MANAGER_OUTPUT_BYTES = 64 * 1024;

/** Exact stable external effects disclosed before a Linux Hopper installation. */
export interface LinuxHopperInstallDisclosure {
  readonly networkOrigins: readonly string[];
  readonly integrity: string;
  readonly commands: readonly string[];
}

/** Describe the release and package-manager commands without downloading or writing. */
export const linuxHopperInstallDisclosure = (
  family: LinuxPackageFamily,
  isRoot: boolean,
): LinuxHopperInstallDisclosure => {
  return {
    networkOrigins: [
      HOPPER_RELEASES_URL,
      HOPPER_PUBLIC_KEY_URL,
      HOPPER_DOWNLOAD_PREFIX,
    ],
    integrity: `Detached PGP signature · primary ${HOPPER_LINUX_PRIMARY_FINGERPRINT} · package byte identity and installed launcher SHA-256 from the official feed`,
    commands: linuxPackageManagerCommands(
      family,
      `<verified-hopper.${family}>`,
      isRoot,
    ).map(({ executable, args }) => formatCommandForDisplay(executable, args)),
  };
};

interface LinuxDistributionIdentity {
  readonly id: string;
  readonly versionId?: string;
}

/**
 * Parsed Linux distribution information used for package selection.
 *
 * `hopperSetupSupported` is the automated Hopper installer's tested list. It is
 * narrower than the hosts where REA itself runs, which {@link supportsReaHost}
 * answers from the package family.
 */
export type LinuxDistribution = LinuxDistributionIdentity &
  (
    | {
        readonly packageFamily: LinuxPackageFamily;
        readonly hopperSetupSupported: true;
      }
    | {
        readonly packageFamily: LinuxPackageFamily | undefined;
        readonly hopperSetupSupported: false;
      }
  );

/**
 * Whether REA's analysis providers run on this distribution. A recognized
 * package family means a glibc host with a known package layout, which is what
 * the providers need; downloading and installing the official Hopper package
 * additionally requires a distribution on its tested list.
 */
export const supportsReaHost = (
  distribution: LinuxDistribution | undefined,
): boolean => distribution?.packageFamily !== undefined;

/** Download response kept independent of Node's global fetch implementation. */
export interface LinuxHopperDownload {
  readonly ok: boolean;
  readonly bytes: Uint8Array;
}

/** One failed package-manager command, with the output that explains it. */
export interface LinuxPackageInstallFailure {
  /** The executed executable and arguments, joined for display. */
  readonly command: string;
  readonly exitCode: string | number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** Whether the command produced more output than was retained. */
  readonly outputTruncated: boolean;
}

/** Whether the package-manager step installed the verified package. */
export type LinuxPackageInstallOutcome =
  | { readonly status: "installed" }
  | {
      readonly status: "failed";
      readonly failure: LinuxPackageInstallFailure;
    };

/** External effects required to install the official Linux package. */
export interface LinuxHopperInstallHost {
  distribution(): Promise<LinuxDistribution | undefined>;
  release(
    family: LinuxPackageFamily,
    signal?: AbortSignal,
  ): Promise<Result<LinuxHopperRelease, HopperReleaseError>>;
  download(
    url: string,
    options: { readonly signal?: AbortSignal },
  ): Promise<LinuxHopperDownload>;
  createTemporaryDirectory(): Promise<string>;
  writeArchive(path: string, bytes: Uint8Array): Promise<void>;
  installPackage(
    family: LinuxPackageFamily,
    archive: string,
  ): Promise<LinuxPackageInstallOutcome>;
  verifyArchive(
    family: LinuxPackageFamily,
    release: LinuxHopperRelease,
    archive: string,
    signal?: AbortSignal,
  ): Promise<Result<VerifiedLinuxHopperPackage, HopperReleaseError>>;
  retainVerifiedArchive(
    verified: VerifiedLinuxHopperPackage,
    archive: string,
    signal?: AbortSignal,
  ): Promise<Result<void, HopperReleaseError>>;
  launcherStatus(
    path: string,
    expectedSha256: string,
  ): Promise<LinuxHopperLauncherStatus>;
  cleanup(path: string): Promise<void>;
  close?(): Promise<void>;
}

/** Structured outcome for every expected Linux installation failure. */
export type LinuxHopperInstallResult =
  | ({ readonly status: "installed"; readonly launcherPath: string } & {
      readonly cleanupFailure?: LinuxHopperTemporaryCleanupFailure;
    })
  | ({
      readonly status: "failed";
      readonly reason:
        | "unsupported_host"
        | "release_metadata"
        | "download"
        | "integrity"
        | "authorization_or_package_manager"
        | "launcher_missing"
        | "runtime_dependencies"
        | "unsupported_hopper_build"
        | "publisher_verification_failed"
        | "verification_unavailable"
        | "cleanup_failed"
        | "cancelled";
      /**
       * The failing package-manager command and its output. Present only when
       * the package-manager step itself failed, so setup can report what the
       * package manager said instead of assuming an authorization problem.
       */
      readonly packageFailure?: LinuxPackageInstallFailure;
      /** Publisher-owned failure, retained for the public setup diagnostic. */
      readonly verificationFailure?: HopperReleaseError;
    } & { readonly cleanupFailure?: LinuxHopperTemporaryCleanupFailure });

/** Failed removal of an owned temporary install directory. */
export interface LinuxHopperTemporaryCleanupFailure {
  readonly path: string;
  readonly reason: string;
}

/** Own failed temporary cleanup until a later retry succeeds. */
export class LinuxHopperTemporaryCleanupOwner {
  private readonly pending = new Map<
    string,
    LinuxHopperTemporaryCleanupFailure
  >();

  retain(failure: LinuxHopperTemporaryCleanupFailure): void {
    this.pending.set(failure.path, failure);
  }

  async retry(
    cleanup: (path: string) => Promise<void>,
  ): Promise<string | undefined> {
    const failures: string[] = [];
    for (const path of this.pending.keys()) {
      try {
        await cleanup(path);
        this.pending.delete(path);
      } catch (cause: unknown) {
        const reason = cause instanceof Error ? cause.message : String(cause);
        failures.push(
          `Linux Hopper temporary cleanup failed for ${path}: ${reason}`,
        );
      }
    }
    return failures.length === 0 ? undefined : failures.join("; ");
  }
}

export type LinuxHopperLauncherStatus =
  | "ready"
  | "missing"
  | "runtime_dependencies"
  | "unsupported_hopper_build";

/** Parse an os-release document without executing its shell syntax. */
export const parseLinuxDistribution = (text: string): LinuxDistribution => {
  const fields = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = /^([A-Z_]+)=(.*)$/u.exec(line.trim());
    if (match === null) continue;
    const key = match[1];
    const encoded = match[2];
    if (key === undefined || encoded === undefined) continue;
    const quote = encoded[0];
    const quoted = (quote === "'" || quote === '"') && encoded.endsWith(quote);
    const value = !quoted
      ? encoded
      : quote === "'"
        ? encoded.slice(1, -1)
        : encoded.slice(1, -1).replace(/\\(["\\$`])/gu, "$1");
    fields.set(key, value);
  }
  const id = (fields.get("ID") ?? "unknown").toLowerCase();
  const versionId = fields.get("VERSION_ID");
  const packageFamily = packageFamilyFor(id, fields.get("ID_LIKE"));
  const hopperSetupSupported =
    packageFamily !== undefined &&
    (id === "arch" ||
      id === "cachyos" ||
      (id === "omarchy" && packageFamily === "arch") ||
      (id === "ubuntu" && versionAtLeast(versionId, 24)) ||
      (id === "fedora" && versionAtLeast(versionId, 41)) ||
      (id === "nobara" && versionAtLeast(versionId, 44)));
  const identity = {
    id,
    ...(versionId === undefined ? {} : { versionId }),
  };
  return hopperSetupSupported
    ? { ...identity, packageFamily, hopperSetupSupported: true }
    : { ...identity, packageFamily, hopperSetupSupported: false };
};

/** Read and classify the current Linux distribution. */
export const readLinuxDistribution = async (): Promise<
  LinuxDistribution | undefined
> => {
  try {
    return parseLinuxDistribution(await readFile("/etc/os-release", "utf8"));
  } catch (cause: unknown) {
    // best-effort cleanup: optional host probing; unknown distribution means unsupported.
    void cause;
    return undefined;
  }
};

/** Download, verify, install, and read back the official Hopper Linux package. */
export const installLinuxHopper = async (
  host: LinuxHopperInstallHost = systemLinuxHopperInstallHost(process.env),
  options: {
    readonly signal?: AbortSignal;
  } = {},
): Promise<LinuxHopperInstallResult> => {
  if (options.signal?.aborted === true)
    return { status: "failed", reason: "cancelled" };
  const distribution = await host.distribution();
  if (distribution?.hopperSetupSupported !== true)
    return { status: "failed", reason: "unsupported_host" };
  let temporary: string | undefined;
  let result: LinuxHopperInstallResult;
  try {
    result = await (async (): Promise<LinuxHopperInstallResult> => {
      const selected = await host.release(
        distribution.packageFamily,
        options.signal,
      );
      if (!selected.ok)
        return {
          status: "failed",
          verificationFailure: selected.error,
          reason:
            selected.error.reason === "cancelled"
              ? "cancelled"
              : "release_metadata",
        };
      const release = selected.value;
      const archiveDownload = await host.download(release.filename, options);
      if (!archiveDownload.ok) return { status: "failed", reason: "download" };
      temporary = await host.createTemporaryDirectory();
      const archive = join(temporary, `hopper.${distribution.packageFamily}`);
      await host.writeArchive(archive, archiveDownload.bytes);
      const verified = await host.verifyArchive(
        distribution.packageFamily,
        release,
        archive,
        options.signal,
      );
      if (!verified.ok)
        return {
          status: "failed",
          verificationFailure: verified.error,
          reason:
            verified.error.reason === "cache_missing"
              ? "verification_unavailable"
              : verified.error.reason,
        };
      const retained = await host.retainVerifiedArchive(
        verified.value,
        archive,
        options.signal,
      );
      if (!retained.ok)
        return {
          status: "failed",
          verificationFailure: retained.error,
          reason:
            retained.error.reason === "cache_missing"
              ? "verification_unavailable"
              : retained.error.reason,
        };
      if (options.signal?.aborted === true)
        return { status: "failed", reason: "cancelled" };
      const install = await host.installPackage(
        distribution.packageFamily,
        archive,
      );
      if (install.status === "failed")
        return {
          status: "failed",
          reason: "authorization_or_package_manager",
          packageFailure: install.failure,
        };
      const launcherPath = "/opt/hopper/bin/Hopper";
      const launcherStatus = await host.launcherStatus(
        launcherPath,
        release.main_exe_hash,
      );
      if (launcherStatus !== "ready")
        return {
          status: "failed",
          reason:
            launcherStatus === "missing" ? "launcher_missing" : launcherStatus,
        };
      return { status: "installed", launcherPath };
    })();
  } catch (cause: unknown) {
    result = {
      status: "failed",
      reason: isAbortCause(cause) ? "cancelled" : "download",
    };
  }
  if (temporary === undefined) return result;
  try {
    await host.cleanup(temporary);
    return result;
  } catch (cause: unknown) {
    return {
      ...result,
      cleanupFailure: {
        path: temporary,
        reason: cause instanceof Error ? cause.message : String(cause),
      },
    };
  }
};

/** Canonical launcher path for a legacy user-local Linux Hopper installation. */
export const linuxHopperLauncherPath = (home: string): string =>
  join(home, ".local/share/rea/hopper/bin/Hopper");

/** REA's managed Linux install path, preferred when no explicit launcher is set. */
export const REA_MANAGED_LINUX_HOPPER_LAUNCHER = "/opt/hopper/bin/Hopper";

/** Other system-wide Hopper paths used by package installations. */
export const systemLinuxHopperLauncherCandidates: readonly string[] = [
  "/opt/hopper-v4/bin/hopper",
  "/usr/bin/hopper",
];

/** Probe REA-managed and user-local installs before arbitrary system builds. */
export const linuxHopperLauncherCandidates = (
  home: string,
): readonly string[] => [
  REA_MANAGED_LINUX_HOPPER_LAUNCHER,
  linuxHopperLauncherPath(home),
  ...systemLinuxHopperLauncherCandidates,
];

/** Compose package-manager and linker checks from the selected caller environment. */
