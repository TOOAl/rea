import { randomUUID, createHash } from "node:crypto";
import { access, realpath, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { ExecutionOptions } from "../application/AnalysisProvider.js";
import { createAnalysisExecution } from "../application/AnalysisProvider.js";
import type {
  WasmArtifactExecution,
  WasmArtifactPort,
} from "../application/wasm/WasmArtifactPort.js";
import { readStableArtifact } from "../artifacts/readStableArtifact.js";
import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import type {
  AnalysisError,
  AnalysisCapturedOutput,
} from "../domain/analysisErrorBase.js";
import {
  AnalysisCancelledError,
  AnalysisArtifactChangedError,
  AnalysisCapabilityUnavailableError,
  AnalysisInputError,
  AnalysisOutputError,
} from "../domain/analysisErrorCore.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import { createEvidence } from "../domain/evidence.js";
import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
import {
  wasmArtifactSchema,
  type InspectWasmArtifactInput,
} from "../domain/wasm/wasmArtifact.js";
import { err, ok, type Result } from "../domain/result.js";
import { runOwnedCommand } from "../process/OwnedCommand.js";
import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
import { WABT_PROVIDER_IDENTITY, WABT_LIMITS } from "./WabtRelease.js";
import { wabtFailure } from "./WabtFailures.js";
import { parseWabtOutput } from "./WabtOutput.js";
import { parseWabtWat } from "./WabtWat.js";
import { associateWasmGlue } from "./WasmGlueAdapter.js";

type Launcher = NonNullable<Parameters<typeof runOwnedCommand>[2]>["launcher"];
const OPERATION = "inspect_wasm_artifact";
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
/** Run caller-supplied WABT against private copies of exactly selected bytes. */
export class WabtArtifactProvider implements WasmArtifactPort {
  protected _resources = new ArtifactResourceScope();
  constructor(
    readonly environment: Readonly<NodeJS.ProcessEnv> = process.env,
    readonly launcher?: Launcher,
    readonly createRuntime: () => Promise<
      Pick<PrivateRuntimeRoot, "path" | "close">
    > = () => PrivateRuntimeRoot.create({ prefix: "rea-wabt-" }),
  ) {}
  /** Retry retained cleanup without discarding roots that still cannot be removed. */
  async close(): Promise<void> {
    try {
      await (this as any)._resources.close();
    } catch (cause: unknown) {
      const cleanup =
        cause instanceof ArtifactReaderFailure ? cause.cleanup : undefined;
      throw new ProviderCleanupError(
        WABT_PROVIDER_IDENTITY.id,
        cleanup?.resources ?? ["artifact-resources"],
        {
          reason:
            cleanup?.reason ??
            (cause instanceof Error ? cause.message : String(cause)),
        },
        { operation: OPERATION, cause },
      );
    }
  }
  async inspect(
    input: InspectWasmArtifactInput,
    options?: ExecutionOptions,
  ): Promise<Result<WasmArtifactExecution, AnalysisError>> {
    try {
      return await (this as any)._resources.run(() =>
        (this as any)._inspect(input, options),
      );
    } catch (cause: unknown) {
      if (
        cause instanceof ArtifactReaderFailure &&
        cause.reason === "unavailable" &&
        cause.cleanup === undefined
      )
        return err((this as any)._closedError());
      return err(wabtFailure(cause, "artifact", input.path));
    }
  }

  _closedError(): AnalysisCapabilityUnavailableError {
    return new AnalysisCapabilityUnavailableError(
      WABT_PROVIDER_IDENTITY.id,
      OPERATION,
      "Provider is closing",
    );
  }

  async _inspect(
    input: InspectWasmArtifactInput,
    options?: ExecutionOptions,
  ): Promise<Result<WasmArtifactExecution, AnalysisError>> {
    const mod = await import("./WabtArtifactProviderInspect.js");
    return (mod as any).inspect.apply(this, [input, options]);
  }
}
