import { constants as fsConstants } from "node:fs";
import { copyFile, lstat, mkdir, rmdir, rm } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { AnalysisOutputError } from "../domain/analysisErrorCore.js";
import { displayDevicePath } from "./AdbDeviceOutput.js";

export interface AdbProviderOptions {
  readonly environment?: Readonly<Record<string, string | undefined>>;
}
export interface PendingOutputDirectoryCleanup {
  readonly operation: "pull_adb_package" | "collect_adb_bugreport";
  readonly path: string;
  readonly identity: OutputDirectoryIdentity | undefined;
  readonly primary: import("../domain/analysisErrorBase.js").AnalysisError;
  readonly remove: () => Promise<void>;
}
export interface OutputDirectoryIdentity {
  readonly dev: number;
  readonly ino: number;
  readonly mode: number;
}
export const publishBugreport = async (
  source: string,
  directory: string,
): Promise<string> => {
  const fileName = basename(source);
  const extension = extname(fileName);
  const stem =
    extension === "" ? fileName : fileName.slice(0, -extension.length);
  for (let suffix = 0; ; suffix += 1) {
    const destination = join(
      directory,
      suffix === 0 ? fileName : `${stem} (${String(suffix)})${extension}`,
    );
    try {
      await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
      return destination;
    } catch (cause: unknown) {
      if (cause instanceof Error && "code" in cause && cause.code === "EEXIST")
        continue;
      throw cause;
    }
  }
};
export const removeOwnedOutputDirectory = async (
  path: string,
  identity: OutputDirectoryIdentity | undefined,
): Promise<void> => {
  if (identity === undefined)
    throw new Error(
      `Cannot verify the created output directory identity; refusing to remove ${path}`,
    );
  let current: Awaited<ReturnType<typeof lstat>>;
  try {
    current = await lstat(path);
  } catch (cause: unknown) {
    if (cause instanceof Error && Reflect.get(cause, "code") === "ENOENT")
      return;
    throw cause;
  }
  if (
    !current.isDirectory() ||
    current.isSymbolicLink() ||
    current.dev !== identity.dev ||
    current.ino !== identity.ino ||
    current.mode !== identity.mode
  )
    throw new Error(
      `The created output directory was replaced or changed; refusing to remove ${path}`,
    );
  await rm(path, { recursive: true, force: true });
};
export const refuseExistingTarget = async (
  operation: string,
  path: string,
): Promise<
  import("../domain/analysisErrorBase.js").AnalysisError | undefined
> => {
  if (
    await lstat(path).then(
      () => true,
      () => false,
    )
  )
    return new AnalysisOutputError(
      operation,
      `The output file already exists: ${path}`,
    );
  return undefined;
};
export const reservePackageDestinations = async (
  operation: string,
  packageName: string,
  packageDirectory: string,
  entries: readonly {
    readonly file_name: string;
    readonly device_path: string;
  }[],
  capturedOutput: {
    readonly stdout: string;
    readonly stderr: string;
    readonly truncated: boolean;
  },
): Promise<AnalysisOutputError | undefined> => {
  const reservations: {
    readonly path: string;
    readonly file_name: string;
    readonly device_path: string;
    readonly identity: OutputDirectoryIdentity;
  }[] = [];
  for (const entry of entries) {
    const path = join(packageDirectory, entry.file_name);
    try {
      await mkdir(path);
      const created = await lstat(path);
      if (!created.isDirectory() || created.isSymbolicLink())
        throw new Error(`Could not reserve local filename ${entry.file_name}`);
      reservations.push({
        path,
        file_name: entry.file_name,
        device_path: entry.device_path,
        identity: {
          dev: created.dev,
          ino: created.ino,
          mode: created.mode,
        },
      });
    } catch (cause: unknown) {
      const errorCode =
        cause instanceof Error &&
        "code" in cause &&
        typeof cause.code === "string"
          ? cause.code
          : null;
      return new AnalysisOutputError(
        operation,
        "local_destination_unavailable",
        {
          cause,
          capturedOutput,
          userMessage: `pm path for ${packageName} reported ${displayDevicePath(entry.device_path)}, whose file name ${displayDevicePath(entry.file_name)} cannot be written to a unique local destination (${errorCode ?? "unknown error"}). No APK was pulled.`,
          remediationAction:
            "Review details.diagnostics and details.captured_output for the refused destination. Correct the output filesystem conflict before retrying; REA does not rename APKs.",
          diagnostics: {
            package_name: packageName,
            device_path: entry.device_path,
            file_name: entry.file_name,
            error_code: errorCode,
          },
        },
      );
    }
  }
  for (const reservation of reservations) {
    try {
      const current = await lstat(reservation.path);
      if (
        !current.isDirectory() ||
        current.isSymbolicLink() ||
        current.dev !== reservation.identity.dev ||
        current.ino !== reservation.identity.ino ||
        current.mode !== reservation.identity.mode
      )
        throw new Error(
          `The local filename reservation changed before release: ${reservation.path}`,
        );
      await rmdir(reservation.path);
    } catch (cause: unknown) {
      const errorCode =
        cause instanceof Error &&
        "code" in cause &&
        typeof cause.code === "string"
          ? cause.code
          : null;
      return new AnalysisOutputError(
        operation,
        "local_destination_unavailable",
        {
          cause,
          capturedOutput,
          userMessage: `Could not release the local filename reservation for ${displayDevicePath(reservation.device_path)} (${errorCode ?? "unknown error"}); no APK was pulled.`,
          remediationAction:
            "Review details.diagnostics and details.captured_output for the refused destination. Correct the output filesystem conflict before retrying; REA does not rename APKs.",
          diagnostics: {
            package_name: packageName,
            device_path: reservation.device_path,
            file_name: reservation.file_name,
            error_code: errorCode,
          },
        },
      );
    }
  }
  return undefined;
};
