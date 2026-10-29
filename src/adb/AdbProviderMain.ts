import type {
  ExecutionOptions,
  ProviderAvailability,
} from "../application/AnalysisProvider.js";
import { providerConfigurationRefusal } from "../domain/providerConfigurationRefusal.js";
import {
  createAnalysisExecution,
  type AnalysisExecution,
} from "../application/AnalysisProvider.js";
import type { AdbRequest } from "../domain/adb/adbDeviceAnalysis.js";
import {
  AnalysisCancelledError,
  AnalysisProtocolError,
} from "../domain/analysisErrorCore.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
import { err, ok, type Result } from "../domain/result.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import {
  AdbConfigurationFailure,
  adbConfigurationAvailability,
  inspectAdbClient,
  resolveAdbBinary,
  type AdbBinarySelection,
  type AdbClientIdentity,
} from "./AdbConfiguration.js";
import {
  ADB_PROVIDER_IDENTITY,
  adbArguments,
  runAdb,
  clientIdentityResult,
} from "./AdbProviderHelpers.js";
import type { PendingOutputDirectoryCleanup } from "./AdbProviderPaths.js";
import * as Introspection from "./AdbProviderIntrospection.js";
import * as Pull from "./AdbProviderPull.js";
import * as Push from "./AdbProviderPush.js";
import * as Screens from "./AdbProviderScreens.js";
export class AdbProvider {
  private readonly environment: Readonly<Record<string, string | undefined>>;
  readonly #pendingOutputDirectoryCleanup =
    new Set<PendingOutputDirectoryCleanup>();
  readonly #activeOperations = new Set<Promise<void>>();
  #closing = false;
  #closePromise: Promise<void> | undefined;
  #outputCleanupPromise: Promise<void> | undefined;

  constructor(options: AdbProviderOptions = {}) {
    this.environment = options.environment ?? process.env;
  }

  private selection(): AdbBinarySelection {
    return resolveAdbBinary(this.environment);
  }

  /** Probe the selected adb binary; never contacts devices or the server. */
  async inspectAvailability(
    signal?: AbortSignal,
  ): Promise<ProviderAvailability> {
    try {
      const selection = this.selection();
      await inspectAdbClient(selection, signal);
      return {
        status: "available",
        code: null,
        reason: null,
        diagnostics: {
          selected_binary: selection.binary,
          path_source: selection.pathSource,
        },
      };
    } catch (cause) {
      if (cause instanceof AdbConfigurationFailure)
        return adbConfigurationAvailability(cause);
      throw cause;
    }
  }

  /** Retry removal of owned output directories retained after failed cleanup. */
  close(): Promise<void> {
    this.#closing = true;
    if (this.#closePromise !== undefined) return this.#closePromise;
    const closing = (async () => {
      await Promise.all(this.#activeOperations);
      await this.#retryOutputDirectoryCleanup();
    })().finally(() => {
      if (this.#closePromise === closing) this.#closePromise = undefined;
    });
    this.#closePromise = closing;
    return this.#closePromise;
  }

  #retryOutputDirectoryCleanup(): Promise<void> {
    if (this.#outputCleanupPromise !== undefined)
      return this.#outputCleanupPromise;
    const cleanup = this.#performOutputDirectoryCleanup().finally(() => {
      if (this.#outputCleanupPromise === cleanup)
        this.#outputCleanupPromise = undefined;
    });
    this.#outputCleanupPromise = cleanup;
    return cleanup;
  }

  async #performOutputDirectoryCleanup(): Promise<void> {
    const failures: AnalysisError[] = [];
    for (const owner of this.#pendingOutputDirectoryCleanup) {
      try {
        await owner.remove();
        this.#pendingOutputDirectoryCleanup.delete(owner);
      } catch (cause: unknown) {
        const cleanup = new ProviderCleanupError(
          ADB_PROVIDER_IDENTITY.id,
          [owner.path],
          {
            reason: cause instanceof Error ? cause.message : String(cause),
          },
          { operation: owner.operation, cause },
        );
        failures.push(
          analysisErrorWithCleanupFailure(
            owner.primary,
            cleanup,
            owner.operation,
          ),
        );
      }
    }
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1)
      throw new ProviderCleanupError(
        ADB_PROVIDER_IDENTITY.id,
        [...this.#pendingOutputDirectoryCleanup].map(({ path }) => path),
        {
          reason: "Failed ADB output directories remain after cleanup retry",
          operations: [...this.#pendingOutputDirectoryCleanup].map(
            ({ operation }) => operation,
          ),
          failures: failures.map(({ message, cleanupResources }) => ({
            message,
            resources: [...cleanupResources],
          })),
        },
        {
          operation: "close_binary",
          cause: new AggregateError(
            failures,
            "Multiple ADB output directory cleanups failed",
          ),
        },
      );
  }

  async execute(
    request: AdbRequest,
    options?: ExecutionOptions,
  ): Promise<Result<AnalysisExecution, AnalysisError>> {
    if (this.#closing)
      return err(new AnalysisCancelledError(request.operation));
    let release!: () => void;
    const active = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#activeOperations.add(active);
    try {
      if (this.#pendingOutputDirectoryCleanup.size > 0) {
        try {
          await this.#retryOutputDirectoryCleanup();
        } catch (cause: unknown) {
          return err(
            cause instanceof AnalysisError
              ? cause
              : new ProviderCleanupError(
                  ADB_PROVIDER_IDENTITY.id,
                  [...this.#pendingOutputDirectoryCleanup].map(
                    ({ path }) => path,
                  ),
                  {
                    reason:
                      cause instanceof Error ? cause.message : String(cause),
                  },
                  { operation: request.operation, cause },
                ),
          );
        }
      }
      return await this.#executeOperation(request, options);
    } finally {
      this.#activeOperations.delete(active);
      release();
    }
  }

  async #executeOperation(
    request: AdbRequest,
    options?: ExecutionOptions,
  ): Promise<Result<AnalysisExecution, AnalysisError>> {
    const signal = options?.signal;
    if (signal?.aborted === true)
      return err(new AnalysisCancelledError(request.operation));
    let selection: AdbBinarySelection;
    let identity: AdbClientIdentity;
    try {
      selection = this.selection();
      identity = await inspectAdbClient(selection, signal);
    } catch (cause) {
      if (cause instanceof AnalysisCancelledError) return err(cause);
      if (cause instanceof AdbConfigurationFailure)
        return err(
          providerConfigurationRefusal(
            ADB_PROVIDER_IDENTITY.id,
            request.operation,
            cause,
          ),
        );
      return err(
        new AnalysisProtocolError(
          `adb version probe failed for ${request.operation}`,
          { cause },
        ),
      );
    }
    const client = clientIdentityResult(selection, identity);
    const provider: ProviderIdentity = {
      ...ADB_PROVIDER_IDENTITY,
      version: identity.version,
    };
    const { operation } = request;
    const shell = (arguments_: readonly string[], limits: AdbRunLimits) =>
      runAdb(
        operation,
        "serial" in request.input ? request.input.serial : operation,
        selection.binary,
        adbArguments(
          "serial" in request.input ? request.input.serial : undefined,
          ["shell", ...arguments_],
        ),
        limits,
        signal,
      );
    switch (operation) {
      case "inspect_adb_client":
        return ok(
          createAnalysisExecution(
            { client, contacted_adb_server: false },
            provider,
          ),
        );
      case "list_adb_devices":
      case "inspect_adb_device":
      case "list_adb_packages":
        return (Introspection as any).handle(
          operation,
          selection,
          client,
          provider,
          request,
          signal,
          { shell, runAdb },
        );
      case "pull_adb_package":
        return (Pull as any).pullPackage.call(
          this,
          operation,
          selection,
          client,
          provider,
          request.input,
          signal,
        );
      case "pull_adb_file":
        return (Pull as any).pullFile.call(
          this,
          operation,
          selection,
          client,
          provider,
          request.input,
          signal,
        );
      case "push_adb_file":
        return (Push as any).pushFile.call(
          this,
          operation,
          selection,
          client,
          provider,
          request.input,
          signal,
        );
      case "install_adb_package":
        return (Push as any).installPackage.call(
          this,
          operation,
          selection,
          client,
          provider,
          request.input,
          signal,
        );
      case "uninstall_adb_package":
        return (Push as any).uninstallPackage.call(
          this,
          operation,
          selection,
          client,
          provider,
          request.input,
          signal,
        );
      case "capture_adb_screen":
        return (Screens as any).captureScreen.call(
          this,
          operation,
          selection,
          client,
          provider,
          request.input,
          signal,
        );
      case "collect_adb_bugreport":
        return (Screens as any).collectBugreport.call(
          this,
          operation,
          selection,
          client,
          provider,
          request.input,
          signal,
        );
      default:
        return err(
          new AnalysisProtocolError(`unsupported operation ${operation}`),
        );
    }
  }
}
