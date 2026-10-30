import { constants, type Stats } from "node:fs";
import { createHash } from "node:crypto";
import { access, lstat, realpath, type FileHandle } from "node:fs/promises";

import { BinaryTargetError } from "../domain/configurationErrors.js";
import {
  openRegularFile,
  sameRegularFileState,
} from "../filesystem/RegularFile.js";
import { AnalysisCancelledError } from "../domain/analysisErrorCore.js";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import { err, ok, type Result } from "../domain/result.js";
import {
  resolveAppBundleExecutable,
  type ResolvedAppBundle,
} from "./AppBundleExecutable.js";
import {
  validateDosComLength,
  type ExecutableFormatHint,
} from "../domain/dosCom.js";
import {
  admitRawBinary,
  rawBinarySelectionError,
} from "../domain/rawBinary.js";
import type { BinaryArchitecture } from "../domain/binaryTargetTypes.js";
import {
  createXmlPlistSignatureProbe,
  hasBinaryPlistSignature,
  MAX_XML_PLIST_PROBE_BYTES,
} from "../domain/apple/appleArchiveFormat.js";
import {
  hasZipSignature,
  isZipPackageFormat,
  zipPackageFormatForPath,
} from "../domain/zipPackageFormat.js";

import type { PeCodeViewRecord } from "../domain/binaryTargetTypes.js";
import { absoluteCallerPath } from "../filesystem/callerPath.js";

const XML_PLIST_PROBE_CHUNK_BYTES = 64 * 1024;

/** Options for resolving a local binary target and its stable identity. */
export interface BinaryTargetResolverOptions {
  readonly cwd?: string;
  readonly hostArchitecture?: NodeJS.Architecture;
  readonly targetKind?: BinaryTarget["kind"];
  readonly formatHint?: ExecutableFormatHint;
  readonly architecture?: BinaryArchitecture;
  readonly entryPoint?: string;
  readonly signal?: AbortSignal;
}

/**
 * Resolve and classify a readable local target before a provider is selected.
 * FAT Mach-O inputs select only a host-compatible architecture so setup remains
 * non-interactive; unsupported or ambiguous inputs are returned as typed errors.
 */
export const parseBinaryTarget = async (
  input: string,
  options: BinaryTargetResolverOptions = {},
): Promise<
  Result<BinaryTarget, BinaryTargetError | AnalysisCancelledError>
> => {
  const cwd = options.cwd ?? process.cwd();
  const hostArchitecture = options.hostArchitecture ?? process.arch;
  const { targetKind, formatHint, signal, architecture, entryPoint } = options;
  const candidate = absoluteCallerPath(input, { cwd });
  try {
    throwIfTargetResolutionCancelled(signal);
    await access(candidate, constants.R_OK);
    throwIfTargetResolutionCancelled(signal);
    const canonical = await realpath(candidate);
    // Windows native admission must inspect the caller-selected reparse components.
    const sourcePath = process.platform === "win32" ? candidate : canonical;
    throwIfTargetResolutionCancelled(signal);
    const resolved = await resolveAppBundle(canonical);
    throwIfTargetResolutionCancelled(signal);
    if (!resolved.ok) return err(resolved.error);
    const { executable: path, infoPlist } = resolved.value;
    const bundle =
      infoPlist === undefined ? {} : { bundleInfoPlist: infoPlist };
    const handle = await openRegularFile(path, {
      symlinks: "reject",
      signal,
    });
    try {
      throwIfTargetResolutionCancelled(signal);
      const metadata = await handle.stat();
      throwIfTargetResolutionCancelled(signal);
      if (formatHint === "raw-binary") {
        if (targetKind !== undefined && targetKind !== "executable")
          return err(
            new BinaryTargetError(
              path,
              "raw-binary format requires an executable target kind",
              { constraint: "load_selection_rejected" },
            ),
          );
        const admitted = admitRawBinary({
          architecture,
          entryPoint,
          fileBytes: metadata.size,
        });
        if (!admitted.ok)
          return err(
            new BinaryTargetError(path, admitted.error.reason, {
              constraint: admitted.error.constraint,
            }),
          );
        return ok({
          path,
          sourcePath,
          sha256: await sha256Handle(handle, path, metadata, signal),
          kind: "executable",
          format: "raw-binary",
          architecture: admitted.value.architecture,
          availableArchitectures: [admitted.value.architecture],
          entryPoint: admitted.value.entryPoint,
          entryPointSource: admitted.value.entryPointSource,
        });
      }
      const pairing = rawBinarySelectionError({
        ...(formatHint === undefined ? {} : { format: formatHint }),
        architecture,
        entryPoint,
      });
      if (pairing !== undefined)
        return err(
          new BinaryTargetError(path, pairing, {
            constraint: "load_selection_rejected",
          }),
        );
      if (formatHint === "dos-com") {
        if (targetKind !== undefined && targetKind !== "executable")
          return err(
            new BinaryTargetError(
              path,
              "DOS COM format requires an executable target kind",
              { constraint: "load_selection_rejected" },
            ),
          );
        const length = validateDosComLength(metadata.size);
        if (!length.ok)
          return err(
            new BinaryTargetError(path, length.error, {
              constraint: "file_format_rejected",
            }),
          );
        return ok({
          path,
          sourcePath,
          sha256: await sha256Handle(handle, path, metadata, signal),
          kind: "executable",
          format: "dos-com",
          architecture: "x86",
          availableArchitectures: ["x86"],
        });
      }
      // Probe WASM content before suffix-only database routing; an explicit
      // database selection keeps the caller's chosen interpretation.
      const artifactFormat =
        targetKind === "database"
          ? undefined
          : await detectArtifactFormat(path, handle, signal);
      if (
        targetKind === "database" ||
        (targetKind === undefined && path.toLowerCase().endsWith(".hop"))
      )
        return ok({
          path,
          sourcePath,
          sha256: await sha256Handle(handle, path, metadata, signal),
          kind: "database",
          format: "analysis-database",
        });
      if (artifactFormat !== undefined) {
        const identity = {
          path,
          sourcePath,
          sha256: await sha256Handle(handle, path, metadata, signal),
        };
        return isArchiveFormat(artifactFormat)
          ? ok({ ...identity, kind: "archive", format: artifactFormat })
          : ok({ ...identity, kind: "artifact", format: artifactFormat });
      }
      const detected = await readExecutableMetadata(
        handle,
        hostArchitecture,
        signal,
      );
      if (!detected.ok)
        return err(
          new BinaryTargetError(path, detected.error, {
            constraint: "file_format_rejected",
          }),
        );
      return ok({
        path,
        sourcePath,
        ...bundle,
        sha256: await sha256Handle(handle, path, metadata, signal),
        kind: "executable",
        ...detected.value,
      });
    } finally {
      await handle.close();
    }
  } catch (cause: unknown) {
    if (cause instanceof AnalysisCancelledError) return err(cause);
    if (signal?.aborted === true && cause === signal.reason)
      return err(
        new AnalysisCancelledError("resolve_binary_target", { cause }),
      );
    if (cause instanceof BinaryTargetError) return err(cause);
    if (!(cause instanceof Error)) throw cause;
    const failure = classifyBinaryTargetFilesystemFailure(candidate, cause);
    if (failure === undefined) throw cause;
    return err(failure);
  }
};

/** Classify a filesystem failure while reading a previously selected target. */
export const classifyBinaryTargetFilesystemFailure = (
  path: string,
  cause: unknown,
): BinaryTargetError | undefined => {
  if (!(cause instanceof Error)) return undefined;
  const code = filesystemErrorCode(cause);
  return code === undefined
    ? undefined
    : new BinaryTargetError(path, targetFailureReason(code, cause.message), {
        cause,
      });
};

const filesystemErrorCode = (cause: Error): string | undefined => {
  const code: unknown = Reflect.get(cause, "code");
  return typeof code === "string" ? code : undefined;
};

const targetFailureReason = (code: string, detail: string): string => {
  switch (code) {
    case "ENOENT":
    case "ENOTDIR":
      return `target does not exist or a path component is not a directory: ${detail}`;
    case "EACCES":
    case "EPERM":
      return `permission denied while reading target: ${detail}`;
    case "EISDIR":
      return `target is a directory, not a readable file: ${detail}`;
    case "ENOTFILE":
      return "target is not a regular file";
    case "ELOOP":
      return `target changed while being opened: ${detail}`;
    default:
      return `target could not be read (${code}): ${detail}`;
  }
};

const throwIfTargetResolutionCancelled = (signal?: AbortSignal): void => {
  if (signal?.aborted === true)
    throw new AnalysisCancelledError("resolve_binary_target");
};

const detectArtifactFormat = async (
  path: string,
  handle: FileHandle,
  signal?: AbortSignal,
): Promise<
  | Exclude<
      BinaryTarget["format"],
      | "analysis-database"
      | "mach-o"
      | "mach-o-universal"
      | "elf"
      | "pe"
      | "dos-mz"
      | "dos-com"
      | "raw-binary"
    >
  | undefined
> => {
  throwIfTargetResolutionCancelled(signal);
  const lower = path.toLowerCase();
  const magic = Buffer.alloc(4096);
  const observed = await handle.read(magic, 0, magic.length, 0);
  throwIfTargetResolutionCancelled(signal);
  if (
    observed.bytesRead >= 8 &&
    magic.subarray(0, 8).equals(Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]))
  )
    throw new BinaryTargetError(
      path,
      "WebAssembly v1 artifacts are not supported by the native opening route",
      { constraint: "wasm_requires_static_inspection" },
    );
  if (hasZipSignature(magic.subarray(0, observed.bytesRead))) {
    // The HarmonyOS App Pack suffix `.app` is a root-input concept; a nested
    // ZIP member ending in `.app` keeps the generic zip classification.
    if (lower.endsWith(".app")) return "app-pack";
    return zipPackageFormatForPath(lower) ?? "zip";
  }
  // Binary plists, including keyed archives, often use other extensions.
  if (hasBinaryPlistSignature(magic.subarray(0, observed.bytesRead)))
    return "plist";
  const named = namedArtifactFormat(lower);
  if (named !== undefined) return named;
  if (
    lower.endsWith(".pkg") &&
    observed.bytesRead >= 4 &&
    magic.subarray(0, 4).equals(Buffer.from("xar!"))
  )
    return "pkg";
  if (lower.endsWith(".dmg")) {
    throwIfTargetResolutionCancelled(signal);
    const size = (await handle.stat()).size;
    throwIfTargetResolutionCancelled(signal);
    if (size >= 512) {
      const trailer = Buffer.alloc(4);
      const read = await handle.read(trailer, 0, trailer.length, size - 512);
      throwIfTargetResolutionCancelled(signal);
      if (read.bytesRead === 4 && trailer.equals(Buffer.from("koly")))
        return "dmg";
    }
  }
  // XML property lists can use archive-specific suffixes such as .archive.
  // The named-format check above keeps .js, .map, and .asar classifications.
  const xmlProbe = createXmlPlistSignatureProbe();
  let xmlState = xmlProbe.write(magic.subarray(0, observed.bytesRead));
  if (xmlState === "matched") return "plist";
  const chunk = Buffer.alloc(XML_PLIST_PROBE_CHUNK_BYTES);
  let bytesRead = observed.bytesRead;
  while (xmlState === "pending" && bytesRead < MAX_XML_PLIST_PROBE_BYTES) {
    throwIfTargetResolutionCancelled(signal);
    const read = await handle.read(
      chunk,
      0,
      Math.min(chunk.length, MAX_XML_PLIST_PROBE_BYTES - bytesRead),
      bytesRead,
    );
    throwIfTargetResolutionCancelled(signal);
    if (read.bytesRead === 0) break;
    bytesRead += read.bytesRead;
    xmlState = xmlProbe.write(chunk.subarray(0, read.bytesRead));
    if (xmlState === "matched") return "plist";
  }
  if (bytesRead === MAX_XML_PLIST_PROBE_BYTES) {
    const { size } = await handle.stat();
    throwIfTargetResolutionCancelled(signal);
    if (size > bytesRead)
      throw new BinaryTargetError(
        path,
        "XML plist prolog was not found within the 1 MiB format probe limit",
        { constraint: "file_format_rejected" },
      );
  }
  return undefined;
};

const namedArtifactFormat = (
  lowerPath: string,
): "asar" | "plist" | "source-map" | "javascript" | undefined => {
  if (lowerPath.endsWith(".asar")) return "asar";
  if (lowerPath.endsWith(".plist")) return "plist";
  if (lowerPath.endsWith(".map")) return "source-map";
  return /\.(?:m?js|cjs)$/u.test(lowerPath) ? "javascript" : undefined;
};

const isArchiveFormat = (
  format: Exclude<
    BinaryTarget["format"],
    | "analysis-database"
    | "mach-o"
    | "mach-o-universal"
    | "elf"
    | "pe"
    | "dos-mz"
    | "dos-com"
    | "raw-binary"
  >,
): format is Extract<BinaryTarget, { kind: "archive" }>["format"] =>
  isZipPackageFormat(format) || ["asar", "dmg", "pkg"].includes(format);

const sha256Handle = async (
  handle: FileHandle,
  path: string,
  initial: Stats,
  signal?: AbortSignal,
): Promise<string> => {
  const hash = createHash("sha256");
  const chunk = Buffer.allocUnsafe(64 * 1024);
  let position = 0;
  while (true) {
    throwIfTargetResolutionCancelled(signal);
    const observed = await handle.read(
      chunk,
      0,
      Math.min(chunk.length, initial.size - position + 1),
      position,
    );
    throwIfTargetResolutionCancelled(signal);
    if (observed.bytesRead === 0) break;
    hash.update(chunk.subarray(0, observed.bytesRead));
    position += observed.bytesRead;
    if (position > initial.size)
      throw new BinaryTargetError(path, "target grew while being read");
  }
  throwIfTargetResolutionCancelled(signal);
  const [opened, currentPath] = await Promise.all([handle.stat(), lstat(path)]);
  if (
    !sameRegularFileState(initial, opened) ||
    !sameRegularFileState(initial, currentPath) ||
    position !== initial.size
  )
    throw new BinaryTargetError(path, "target changed while being read");
  return hash.digest("hex");
};
