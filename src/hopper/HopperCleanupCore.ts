import type { Socket } from "node:net";

import type { ProgressReporter } from "../application/ProgressReporter.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import type { HopperError } from "../domain/hopperErrors.js";

import type { JsonValue } from "../domain/jsonValue.js";
import { err, type Result } from "../domain/result.js";
import type { Logger } from "pino";
import type { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
import type {
  ProcessCleanupResult,
  ProcessIdentityObservation,
} from "../process/ProcessOwnership.js";
import type { ProviderProcessSupervisor } from "../process/ProviderProcess.js";
import { observeProcessStartIdentityExit } from "../process/ProcessOwnershipObservation.js";
import type { BridgeLaunch } from "./BridgeLauncher.js";
import {
  type HopperDiagnostic,
  providerCleanupFailure,
} from "./HopperDiagnostics.js";
import type { HopperRequestActivity } from "./HopperRequestQueue.js";
import {
  isHopperCleanupRequired,
  isHopperShutdownAcknowledgement,
} from "./HopperSessionValues.js";

interface CleanupIssue {
  readonly resource: string;
  readonly reason: string;
}

interface CleanupState {
  readonly issues: CleanupIssue[];
  readonly resources: Set<string>;
  cleanupResult: ProcessCleanupResult | undefined;
  processStopped: boolean;
}

/** Owned capabilities survive failed cleanup until their release is verified. */
export interface HopperOwnedResources {
  launch: BridgeLaunch | undefined;
  processSupervisor: ProviderProcessSupervisor | undefined;
  runtimeRoot: PrivateRuntimeRoot | undefined;
  shutdownConfirmed: boolean;
  externalApplication:
    | {
        readonly pid: number;
        readonly identity: ProcessIdentityObservation;
      }
    | undefined;
}

export interface HopperCleanupInput {
  readonly socket: Socket | undefined;
  readonly resources: HopperOwnedResources;
  readonly activeRequest: HopperRequestActivity | null;
  readonly retainDocument: boolean;
  readonly progress: ProgressReporter | undefined;
  readonly logger: Logger;
  readonly onDiagnostic: ((event: HopperDiagnostic) => void) | undefined;
  request(
    method: "shutdown" | "shutdown_document",
  ): Promise<Result<JsonValue, HopperError>>;
  releaseTransport(socket: Socket | undefined): void;
}

/** Close Hopper phases and retain every resource whose cleanup is unverified. */
export const cleanupHopperSession = async (
  input: HopperCleanupInput,
): Promise<Result<null, AnalysisError>> => {
  const state: CleanupState = {
    issues: [],
    resources: new Set(),
    cleanupResult: undefined,
    processStopped: input.resources.processSupervisor === undefined,
  };
  await confirmExternalApplicationExit(
    input.resources,
    input.socket,
    input.releaseTransport,
  );
  await report(
    input.progress,
    0,
    input.retainDocument &&
      input.resources.launch?.preparedImagePath === undefined
      ? "detaching REA from the Hopper document"
      : "requesting Hopper document shutdown",
  );
  await requestShutdown(input, state);
  await report(input.progress, 0.35, "releasing Hopper bridge transport");
  if (
    input.resources.shutdownConfirmed ||
    input.resources.launch?.providerLifetime !== "external-application"
  )
    input.releaseTransport(input.socket);
  await stopProcess(input, state);
  recordUnconfirmedDocument(input, state);
  await report(input.progress, 0.75, "removing Hopper private runtime files");
  if (
    input.resources.runtimeRoot !== undefined &&
    (!state.processStopped ||
      (!input.resources.shutdownConfirmed &&
        (input.resources.launch?.preparedImagePath !== undefined ||
          input.resources.launch?.providerLifetime === "external-application")))
  ) {
    const resource = input.resources.runtimeRoot.path;
    state.resources.add(resource);
    state.issues.push({
      resource,
      reason:
        "Private runtime retained because process or native document closure was not confirmed",
    });
  } else {
    await closeRuntimeRoot(input, state);
  }
  if (state.processStopped && input.resources.shutdownConfirmed) {
    const launch = input.resources.launch;
    try {
      await launch?.releaseLease?.();
      input.resources.launch = undefined;
    } catch (cause: unknown) {
      state.resources.add("hopper-lease");
      state.issues.push({
        resource: "hopper-lease",
        reason: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }
  return cleanupOutcome(input, state);
};

export const confirmExternalApplicationExit = async (
  resources: HopperOwnedResources,
  socket: Socket | undefined,
  releaseTransport: (socket: Socket | undefined) => void,
  observeExit: typeof observeProcessStartIdentityExit = observeProcessStartIdentityExit,
): Promise<void> => {
  const application = resources.externalApplication;
  if (
    resources.shutdownConfirmed ||
    resources.launch?.providerLifetime !== "external-application" ||
    application?.identity.state !== "readable"
  )
    return;
  if (
    (await observeExit(application.pid, application.identity.identity)) ===
    "exited"
  ) {
    resources.shutdownConfirmed = true;
    releaseTransport(socket);
  }
};

const requestShutdown = async (
  input: HopperCleanupInput,
  state: CleanupState,
): Promise<void> => {
  if (
    input.resources.shutdownConfirmed ||
    input.socket === undefined ||
    input.socket.destroyed ||
    input.activeRequest !== null
  ) {
    if (input.activeRequest !== null)
      input.logger.warn(
        {
          method: input.activeRequest.operation,
          callerState: input.activeRequest.callerState,
        },
        "Hopper shutdown skipped because a bridge operation remained active",
      );
    return;
  }
  const method =
    (input.retainDocument &&
      input.resources.launch?.preparedImagePath === undefined) ||
    input.resources.launch?.shutdownMode === "process-cleanup"
      ? "shutdown"
      : "shutdown_document";
  const shutdown = await input
    .request(method)
    .catch((cause: unknown) => err(shutdownRequestFailure(method, cause)));
  if (
    shutdown.ok &&
    isHopperCleanupRequired(shutdown.value) &&
    input.resources.launch?.shutdownMode === "process-cleanup"
  ) {
    state.cleanupResult = await input.resources.launch
      .cleanup()
      .catch(providerCleanupFailure);
    if (!state.cleanupResult.cleaned) {
      input.resources.shutdownConfirmed = await fallbackDocumentShutdown(input);
    }
  } else if (shutdown.ok) {
    input.resources.shutdownConfirmed = isHopperShutdownAcknowledgement(
      shutdown.value,
    );
  }
  if (
    !shutdown.ok ||
    (!input.resources.shutdownConfirmed && state.cleanupResult === undefined)
  )
    input.logger.warn(
      {
        status: shutdown.ok ? "invalid-acknowledgement" : "failed",
        ...(shutdown.ok ? {} : shutdownFailureDetails(shutdown.error)),
      },
      "Hopper document shutdown was not confirmed",
    );
};
