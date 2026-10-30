import type { BigIntStats } from "node:fs";
import { basename, join } from "node:path";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import {
  AnalysisAccessDeniedError,
  AnalysisArtifactChangedError,
  AnalysisCancelledError,
  AnalysisOutputError,
} from "../domain/analysisErrorCore.js";
import { ProviderAdapterError } from "../domain/providerAdapterError.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
import { err, type Result } from "../domain/result.js";
import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import { NATIVE_MACOS_PROVIDER_IDENTITY } from "./NativeMacOSProviderMetadata.js";

/** Binding of commands to the selected executable's registered content/version. */
export interface SignatureTargetBinding {
  readonly identity: string;
  readonly snapshotPath: string;
}

const identity = (stat: BigIntStats): string =>
  [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join(":");

const changedTarget = (target: BinaryTarget, reason: string) =>
  err(
    new AnalysisArtifactChangedError("inspect_signature", target.path, reason),
  );

const signatureReadFailure = (
  target: BinaryTarget,
  cause: unknown,
): AnalysisError => {
  if (cause instanceof AnalysisError) return cause;
  const code =
    cause instanceof Error && "code" in cause ? cause.code : undefined;
  if (code === "EACCES" || code === "EPERM")
    return new AnalysisAccessDeniedError(
      "inspect_signature",
      target.path,
      code,
      { cause },
    );
  if (code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP")
    return new AnalysisArtifactChangedError(
      "inspect_signature",
      target.path,
      `Registered signature target is no longer readable (${code}): ${target.path}`,
      { cause },
    );
  return new ProviderAdapterError(
    NATIVE_MACOS_PROVIDER_IDENTITY.id,
    "inspect_signature",
    {
      cause,
      diagnostics: {
        path: target.path,
        phase: "target-version-binding",
        system_code: typeof code === "string" ? code : null,
        reason: cause instanceof Error ? cause.message : String(cause),
      },
    },
  );
};

/** Inspect a digest-verified private copy, releasing it on every exit path. */
export const withSignatureTarget = async <T>(
  target: BinaryTarget,
  resources: ArtifactResourceScope,
  inspect: (
    binding: SignatureTargetBinding,
  ) => Promise<Result<T, AnalysisError>>,
  signal?: AbortSignal,
  createRoot: () => Promise<Pick<PrivateRuntimeRoot, "path" | "close">> = () =>
    PrivateRuntimeRoot.create({ prefix: "rea-signature-" }),
): Promise<Result<T, AnalysisError>> => {
  try {
    return await resources.run(async () => {
      let root: Pick<PrivateRuntimeRoot, "path" | "close">;
      try {
        signal?.throwIfAborted();
        root = await createRoot();
      } catch (cause: unknown) {
        return err(
          signal?.aborted
            ? new AnalysisCancelledError("inspect_signature")
            : snapshotFailure(target, "create", cause),
        );
      }
      const owner = {
        kind: "private-runtime-root" as const,
        root,
        resource: root.path,
      };
      let result: Result<T, AnalysisError>;
      try {
        const binding = await bindSignatureTarget(
          target,
          join(root.path, basename(target.path)),
          resources,
          signal,
        );
        if (!binding.ok) result = binding;
        else {
          try {
            result = await inspect(binding.value);
          } catch (cause: unknown) {
            result = err(
              cause instanceof AnalysisError
                ? cause
                : new AnalysisOutputError(
                    "inspect_signature",
                    "Native output parsing failed",
                    { cause },
                  ),
            );
          }
        }
      } catch (cause: unknown) {
        result = err(
          cause instanceof AnalysisError
            ? cause
            : signatureReadFailure(target, cause),
        );
      }
      const cleanup = await resources.release(owner);
      if (cleanup.kind === "failed")
        return combineCleanupFailure(
          target,
          result,
          [root.path],
          cleanup.cause,
          "cleanup",
        );
      return result;
    });
  } catch (cause: unknown) {
    if (cause instanceof AnalysisError) return err(cause);
    const retained =
      cause instanceof ArtifactReaderFailure && cause.cleanup !== undefined
        ? cause.cleanup
        : undefined;
    if (retained !== undefined)
      return combineCleanupFailure(
        target,
        err(
          signal?.aborted
            ? new AnalysisCancelledError("inspect_signature")
            : signatureReadFailure(target, cause),
        ),
        retained.resources,
        cause,
        "retry",
      );
    return err(
      signal?.aborted
        ? new AnalysisCancelledError("inspect_signature")
        : signatureReadFailure(target, cause),
    );
  }
};

const combineCleanupFailure = <T>(
  target: BinaryTarget,
  primary: Result<T, AnalysisError>,
  resources: readonly string[],
  cause: unknown,
  phase: string,
): Result<T, AnalysisError> => {
  const cleanup = new ProviderCleanupError(
    NATIVE_MACOS_PROVIDER_IDENTITY.id,
    resources,
    {
      reason: cause instanceof Error ? cause.message : String(cause),
      phase: `signature-snapshot-${phase}`,
      path: target.path,
    },
    { operation: "inspect_signature", cause },
  );
  return primary.ok
    ? err(cleanup)
    : err(
        analysisErrorWithCleanupFailure(
          primary.error,
          cleanup,
          "inspect_signature",
        ),
      );
};
