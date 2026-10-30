import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { execFileBoundedOutput } from "../process/ExecFileBoundedOutput.js";
import { execFileOutput } from "../process/ExecFileOutput.js";
import { downloadHopperPackage } from "./HopperDownload.js";
import { hashStableFile } from "../filesystem/StableFileHash.js";
import { err, type Result } from "../domain/result.js";

// LinuxHopperUtils.ts 409-597
export const systemLinuxHopperInstallHost = (
  environment: Readonly<NodeJS.ProcessEnv>,
): LinuxHopperInstallHost => {
  const publisher = systemLinuxHopperPublisher(environment);
  return {
    distribution: readLinuxDistribution,
    release: (family, signal) => publisher.currentRelease(family, signal),
    download: downloadHopperPackage,
    createTemporaryDirectory: () => mkdtemp(join(tmpdir(), "rea-hopper-")),
    writeArchive: (path, bytes) => writeFile(path, bytes, { mode: 0o600 }),
    installPackage: (family, archive) =>
      installSystemPackage(family, archive, environment),
    verifyArchive: (family, release, archive, signal) =>
      publisher.verifyArchive(family, release, archive, signal),
    retainVerifiedArchive: (verified, archive, signal) =>
      publisher.retainVerifiedArchive(verified, archive, signal),
    async launcherStatus(path, expectedSha256) {
      try {
        await access(path);
        const linked = await execFileOutput("ldd", [path], {
          env: environment,
        });
        if (
          !linuxSharedLibrariesAvailable(`${linked.stdout}\n${linked.stderr}`)
        )
          return "runtime_dependencies";
        return (await hashStableFile(path)).sha256 === expectedSha256
          ? "ready"
          : "unsupported_hopper_build";
      } catch (cause: unknown) {
        // best-effort cleanup: optional launcher probing; unreadable means missing.
        void cause;
        return "missing";
      }
    },
    cleanup: (path) => rm(path, { recursive: true, force: true }),
    close: async () => {
      await publisher.close();
      await retryLinuxHopperPublisherCleanup();
    },
  };
};

export const systemLinuxHopperPublisher = (
  environment: Readonly<NodeJS.ProcessEnv>,
): LinuxHopperPublisher =>
  new LinuxHopperPublisher(
    environment,
    async () => (await readLinuxDistribution())?.packageFamily,
  );

/** Read-only authentication; persistent package retention belongs to approved setup. */
export const inspectLinuxHopperLauncher = async (
  path: string,
  environment: Readonly<NodeJS.ProcessEnv>,
  signal?: AbortSignal,
): Promise<Result<VerifiedLinuxHopperLauncher, HopperReleaseError>> => {
  const publisher = systemLinuxHopperPublisher(environment);
  const result = await publisher.inspectLauncher(path, signal);
  try {
    await publisher.close();
    await retryLinuxHopperPublisherCleanup();
    return result;
  } catch (cause: unknown) {
    return err(
      new HopperReleaseError(
        "cleanup_failed",
        "Hopper publisher verification retains incomplete cleanup.",
        {
          cause: new AggregateError(
            result.ok ? [cause] : [result.error, cause],
            "Publisher verification outcomes",
          ),
        },
      ),
    );
  }
};

/** Interpret ldd output conservatively so a present but broken launcher is unhealthy. */
export const linuxSharedLibrariesAvailable = (output: string): boolean =>
  !/(?:=>\s+not found|error while loading shared libraries)/iu.test(output);

const installSystemPackage = async (
  family: LinuxPackageFamily,
  archive: string,
  environment: Readonly<NodeJS.ProcessEnv>,
): Promise<LinuxPackageInstallOutcome> => {
  for (const command of linuxPackageManagerCommands(
    family,
    archive,
    process.getuid?.() === 0,
  )) {
    const output = await execFileBoundedOutput(
      command.executable,
      command.args,
      {
        env: environment,
        limit: PACKAGE_MANAGER_OUTPUT_BYTES,
      },
    );
    if (output.exitCode !== 0) {
      return {
        status: "failed",
        failure: {
          command: formatCommandForDisplay(command.executable, command.args),
          exitCode: output.exitCode,
          // The streams stay separate; their original interleaved order
          // is not recoverable after capture.
          stdout: output.stdout,
          stderr: output.stderr,
          outputTruncated: output.outputTruncated,
        },
      };
    }
  }
  return { status: "installed" };
};

/** Preserve argument boundaries in a command shown to the user. */
export const formatCommandForDisplay = (
  executable: string,
  args: readonly string[],
): string =>
  [executable, ...args]
    .map((part) =>
      /^[A-Za-z0-9_./:@%+=,-]+$/u.test(part) ? part : JSON.stringify(part),
    )
    .join(" ");

/** Select the native package manager and authorization boundary without shell evaluation. */
export const linuxPackageManagerCommands = (
  family: LinuxPackageFamily,
  archive: string,
  isRoot: boolean,
): readonly {
  readonly executable: string;
  readonly args: readonly string[];
}[] => {
  const runtimeDependencies =
    family === "deb"
      ? ["xvfb", "xauth", "python3", "libx11-6", "libxtst6"]
      : family === "rpm"
        ? [
            "xorg-x11-server-Xvfb",
            "xorg-x11-xauth",
            "python3",
            "libX11",
            "libXtst",
          ]
        : ["xorg-server-xvfb", "xorg-xauth", "python", "libx11", "libxtst"];
  const commands =
    family === "deb"
      ? [["apt-get", "install", "-y", archive, ...runtimeDependencies]]
      : family === "rpm"
        ? [["dnf", "install", "-y", archive, ...runtimeDependencies]]
        : [
            ["pacman", "-S", "--needed", "--noconfirm", ...runtimeDependencies],
            ["pacman", "-U", "--noconfirm", archive],
          ];
  return commands.map((command) => {
    const executable = isRoot ? command[0] : "pkexec";
    if (executable === undefined) throw new Error("package command is empty");
    return { executable, args: isRoot ? command.slice(1) : command };
  });
};

const packageFamilyFor = (
  id: string,
  idLike: string | undefined,
): LinuxPackageFamily | undefined => {
  const identities = new Set([
    id,
    ...(idLike?.toLowerCase().split(/\s+/u) ?? []),
  ]);
  if (identities.has("ubuntu") || identities.has("debian")) return "deb";
  if (identities.has("fedora") || identities.has("rhel")) return "rpm";
  if (identities.has("arch")) return "arch";
  return undefined;
};

const versionAtLeast = (
  version: string | undefined,
  minimum: number,
): boolean =>
  version !== undefined &&
  Number.parseInt(version.split(".")[0] ?? "0", 10) >= minimum;
const isAbortCause = (cause: unknown): boolean =>
  cause instanceof Error && cause.name === "AbortError";
