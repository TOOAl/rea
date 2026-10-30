import {
  AnalysisCancelledError,
  AnalysisTimeoutError,
} from "../domain/analysisErrorCore.js";
import { isAbsolute, win32 } from "node:path";
import { stat } from "node:fs/promises";
import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
import { ABORTED, waitForAbortable } from "../process/AbortablePromise.js";
import { ProviderStartupDeadline } from "../process/ProviderDeadline.js";

import { randomUUID } from "node:crypto";
import {
  OwnedCommandFailure,
  runOwnedCommand,
} from "../process/OwnedCommand.js";
import type { ProviderProcessSupervisor } from "../process/ProviderProcess.js";
import type { ProviderAvailability } from "../application/AnalysisProvider.js";
import type { ProviderRejectionCode } from "../contracts/providerSelection.js";
import type { JsonValue } from "../domain/jsonValue.js";
import { gte, valid } from "semver";
import {
  isWindowsBatchFile,
  windowsBatchCommand,
  WindowsBatchCommandError,
} from "../process/WindowsBatchCommand.js";

/** Environment key selecting the caller's apktool launcher. */
export const APKTOOL_COMMAND_ENV = "REA_APKTOOL_COMMAND";

const VERSION_TIMEOUT_MS = 20_000;
const VERSION_MAX_OUTPUT_BYTES = 64 * 1024;

/** How the apktool launcher was selected for this provider instance. */
export interface ApktoolCommandSelection {
  readonly command: string;
  readonly commandSource: "environment" | "path";
}

/**
 * Preserve an explicit launcher, or resolve the default Windows command before
 * choosing native versus batch process creation. POSIX keeps execFile's PATH
 * lookup. The resolved selection is reused for the version and decode runs.
 */
export const resolveApktoolCommand = async (
  environment: Readonly<Record<string, string | undefined>>,
  platform: NodeJS.Platform = process.platform,
  signal?: AbortSignal,
): Promise<ApktoolCommandSelection> => {
  if (signal?.aborted === true)
    throw new AnalysisCancelledError("inspect_apktool_client");
  const selectedEnvironment = snapshotEnvironment(environment, platform);
  const configured = selectedEnvironment[APKTOOL_COMMAND_ENV];
  if (configured !== undefined && configured.trim() !== "") {
    if (
      !(platform === "win32"
        ? win32.isAbsolute(configured)
        : isAbsolute(configured))
    )
      throw new ApktoolConfigurationFailure(
        "not_absolute",
        `${APKTOOL_COMMAND_ENV} must be an absolute path to the apktool launcher`,
        { configured_command: configured },
      );
    return { command: configured, commandSource: "environment" };
  }
  if (platform !== "win32")
    return { command: "apktool", commandSource: "path" };
  const extensions = (selectedEnvironment.PATHEXT ?? ".EXE;.COM;.BAT;.CMD")
    .split(";")
    .filter((extension) => extension !== "");
  for (const extension of extensions)
    if (!extension.startsWith(".") || /[\\/:\0]/u.test(extension))
      throw new ApktoolConfigurationFailure(
        "command_unresolved",
        "Windows PATHEXT must contain filename extensions, not paths",
        {
          selected_command: "apktool",
          command_source: "path",
          invalid_extension: extension,
        },
      );
  const directories = (selectedEnvironment.PATH ?? "")
    .split(";")
    .filter((directory) => directory !== "");
  if (selectedEnvironment.NODEFAULTCURRENTDIRECTORYINEXEPATH === undefined)
    directories.unshift(process.cwd());
  // A single deadline owns the whole PATH search, including filesystem waits.
  const deadline = new ProviderStartupDeadline(VERSION_TIMEOUT_MS, signal);
  const lookupInterruption = () =>
    deadline.interruption === "cancelled"
      ? new AnalysisCancelledError("inspect_apktool_client")
      : new AnalysisTimeoutError("inspect_apktool_client", VERSION_TIMEOUT_MS, {
          diagnostics: { phase: "windows_path_lookup" },
        });
  try {
    for (const entry of directories) {
      const directory =
        entry.startsWith('"') && entry.endsWith('"')
          ? entry.slice(1, -1)
          : entry;
      for (const extension of extensions) {
        if (deadline.interruption !== undefined) throw lookupInterruption();
        const candidate = win32.resolve(directory, `apktool${extension}`);
        try {
          const metadata = await waitForAbortable(
            stat(candidate),
            deadline.signal,
          );
          if (metadata === ABORTED || deadline.interruption !== undefined)
            throw lookupInterruption();
          if (metadata.isFile())
            return { command: candidate, commandSource: "path" };
        } catch (cause: unknown) {
          if (deadline.interruption !== undefined) throw lookupInterruption();
          const code =
            typeof cause === "object" && cause !== null
              ? Reflect.get(cause, "code")
              : undefined;
          if (code === "ENOENT" || code === "ENOTDIR") continue;
          throw new ApktoolConfigurationFailure(
            "command_unresolved",
            `The PATH-selected apktool launcher could not be inspected: ${candidate}`,
            {
              selected_command: "apktool",
              command_source: "path",
              candidate_path: candidate,
              ...(typeof code === "string" ? { filesystem_error: code } : {}),
            },
            { cause },
          );
        }
      }
    }
  } finally {
    deadline.dispose();
  }

  throw new ApktoolConfigurationFailure(
    "command_missing",
    "The apktool launcher was not found on the selected Windows PATH/PATHEXT",
    {
      selected_command: "apktool",
      command_source: "path",
      remediation: `Set ${APKTOOL_COMMAND_ENV} to an absolute apktool launcher, or add its directory and extension to PATH and PATHEXT`,
    },
  );
};

export type ApktoolConfigurationFailureCode =
  | "not_absolute"
  | "command_missing"
  | "command_unresolved"
  | "launcher_unsupported"
  | "version_unresolved"
  | "unsupported_version";

/** Unresolved cleanup of a launched probe; its owner was retained separately. */
export interface ApktoolProbeCleanup {
  readonly reason: string;
  readonly resources: readonly string[];
}

export class ApktoolConfigurationFailure extends Error {
  readonly cleanup: ApktoolProbeCleanup | undefined;

  constructor(
    readonly code: ApktoolConfigurationFailureCode,
    message: string,
    readonly diagnostics: Readonly<Record<string, JsonValue>> = {},
    options?: ErrorOptions & { readonly cleanup?: ApktoolProbeCleanup },
  ) {
    super(message, options);
    this.cleanup = options?.cleanup;
  }
}
