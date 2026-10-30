import type { EvidenceMcpServer } from "./EvidenceMcpServer.js";
import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";

import {
  getNavigationContext,
  inspectAddressContext,
} from "../application/AnalysisContextQueries.js";
import { readAnalysisSnapshot } from "../application/binary/AnalysisSnapshotFiles.js";
import type { BinarySessionPort } from "../application/binary/BinarySessionPort.js";
import { captureProcessScenario } from "../process/capture/ProcessHarness.js";
import { ProcessCaptureResourceScope } from "../process/capture/ProcessCaptureLifecycle.js";
import { ProcessCaptureError } from "../process/capture/ProcessCaptureError.js";
import { toolContract } from "../contracts/toolContracts.js";
import { binaryTargetSummary } from "../application/binary/BinaryTargetSummary.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import type { ProcessCapture } from "../domain/process/processCaptureParsing.js";
import { err, ok } from "../domain/result.js";
import type { Logger } from "pino";
import type { ProviderAvailability } from "../application/AnalysisProvider.js";
import { registerArtifactComparisonTool } from "./registerArtifactComparisonTool.js";
import { registerBundleComparisonTool } from "./registerBundleComparisonTool.js";
import { registerFunctionComparisonTool } from "./registerFunctionComparisonTool.js";
import { registerInvestigationTools } from "./registerInvestigationTools.js";
import { registerProcessComparisonTool } from "./registerProcessComparisonTool.js";
import {
  registerEvidenceTools,
  registerUnknownTools,
} from "./registerSessionRecordTools.js";
import type { SessionAvailabilityProbes } from "./registerSessionStatusTool.js";
import { sessionAvailabilityPolicy } from "./sessionAvailabilityPolicy.js";
import type { AvailabilityPolicy } from "../application/CapabilityInventory.js";
import { logToolExecution } from "./toolLogging.js";
import { toolRegistrationOptions } from "./toolRegistrationOptions.js";
import { runAdmittedToolOperation } from "./admittedToolOperation.js";

const registerOpenLifecycleTool = (
  { server, session, logger, openContract }: LifecycleToolRegistration,
  artifactResources: ArtifactResourceScope,
): void => {
  server.registerTool(
    openContract.name,
    toolRegistrationOptions(openContract),
    async (input, context) => {
      const snapshotPath = input.snapshot_path;
      const opened = await logToolExecution(logger, openContract.name, () =>
        session.open(input.path, {
          signal: context.mcpReq.signal,
          ...(input.format === undefined ? {} : { formatHint: input.format }),
          ...(input.architecture === undefined
            ? {}
            : { architecture: input.architecture }),
          ...(input.entry_point === undefined
            ? {}
            : { entryPoint: input.entry_point }),
          ...(input.provider_id === undefined
            ? {}
            : { providerId: input.provider_id }),
          ...(snapshotPath === undefined
            ? {}
            : {
                // Read inside the open's turn: calls issued after it must not
                // overtake a file read that precedes its place in the order.
                loadSnapshot: () =>
                  readAnalysisSnapshot(
                    snapshotPath,
                    context.mcpReq.signal,
                    artifactResources,
                  ),
              }),
        }),
      );
      return opened.ok
        ? server.delivery.toCallToolResult(
            {
              ok: true,
              value: binaryTargetSummary(opened.value),
            },
            openContract,
          )
        : server.delivery.toCallToolResult(opened, openContract);
    },
  );
};

/** Register MCP-only target lifecycle operations on a long-lived session. */
export interface SessionToolOptions extends Partial<SessionAvailabilityProbes> {
  readonly artifactResources: ArtifactResourceScope;
  readonly startedAt?: string;
  readonly availabilityPolicy?: () => AvailabilityPolicy;
}

const registerContextTools = (
  server: EvidenceMcpServer,
  session: BinarySessionPort,
): void => {
  const navigationContract = toolContract("get_navigation_context");
  const addressContract = toolContract("inspect_address_context");
  server.registerTool(
    navigationContract.name,
    toolRegistrationOptions(navigationContract),
    async (input, context) => {
      const admitted = await session.withAdmittedAnalysis(
        navigationContract.name,
        context.mcpReq.signal,
        async (analysis) =>
          server.delivery.toCallToolResult(
            await getNavigationContext(analysis, input, context.mcpReq.signal),
            navigationContract,
          ),
      );
      return admitted.ok
        ? admitted.value
        : server.delivery.toCallToolResult(admitted, navigationContract);
    },
  );
  server.registerTool(
    addressContract.name,
    toolRegistrationOptions(addressContract),
    async (input, context) => {
      const admitted = await session.withAdmittedAnalysis(
        addressContract.name,
        context.mcpReq.signal,
        async (analysis) =>
          server.delivery.toCallToolResult(
            await inspectAddressContext(analysis, input, context.mcpReq.signal),
            addressContract,
          ),
      );
      return admitted.ok
        ? admitted.value
        : server.delivery.toCallToolResult(admitted, addressContract);
    },
  );
};

export const registerSessionTools = (
  server: EvidenceMcpServer,
  session: BinarySessionPort,
  logger: Logger,
  options: SessionToolOptions,
): void => {
  const openContract = toolContract("open_binary");
  const closeContract = toolContract("close_binary");
  const statusContract = toolContract("binary_session");
  const exportContract = toolContract("export_evidence_bundle");
  const importContract = toolContract("import_evidence_bundle");
  const captureContract = toolContract("capture_process_scenario");
  const compareContract = toolContract("compare_process_captures");
  const compareArtifactsContract = toolContract("compare_artifacts");
  const compareFunctionsContract = toolContract("compare_functions");
  const compareBundlesContract = toolContract("compare_bundles");
  const snapshotContract = toolContract("get_evidence_bundle");
  const processResources = new ProcessCaptureResourceScope();
  registerLifecycleTools(
    {
      ...options,
      server,
      session,
      logger,
      openContract,
      closeContract,
      statusContract,
      startedAt: options.startedAt ?? new Date().toISOString(),
      availabilityPolicy: sessionAvailabilityPolicy(
        options.availabilityPolicy,
        {},
      ),
      androidAnalysisAvailability:
        options.androidAnalysisAvailability ?? missingAndroidAvailability,
      closeProcessResources: async () => {
        try {
          await processResources.retryCleanup();
          return ok(null);
        } catch (cause: unknown) {
          return err(
            new ProcessCaptureError(
              "process capture cleanup remains incomplete",
              {
                cause,
                reason: "cleanup_incomplete",
                cleanupResources: ["process_capture_resources"],
                executionFailure:
                  cause instanceof Error
                    ? cause.message || cause.name
                    : String(cause),
              },
            ),
          );
        }
      },
    },
    options.artifactResources,
  );
  registerEvidenceTools({
    server,
    session,
    resources: options.artifactResources,
    exportContract,
    importContract,
    snapshotContract,
  });
  registerProcessTools({
    server,
    session,
    logger,
    captureContract,
    resourceScope: processResources,
  });
  const closeServer = server.close.bind(server);
  server.close = async () => {
    const results = await Promise.allSettled([
      closeServer(),
      processResources.close(),
    ]);
    const failures = results.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    if (failures.length > 0)
      throw new AggregateError(failures, "REA session cleanup failed");
  };
  const previousOnclose = server.server.onclose;
  server.server.onclose = () => {
    try {
      previousOnclose?.();
    } finally {
      void processResources.close().catch((cause: unknown) => {
        logger.error(
          { error: cause instanceof Error ? cause.message : String(cause) },
          "Process capture cleanup failed during server shutdown",
        );
      });
    }
  };
  registerProcessComparisonTool(server, session, compareContract);
  registerArtifactComparisonTool(server, session, compareArtifactsContract);
  registerFunctionComparisonTool(server, session, compareFunctionsContract);
  registerBundleComparisonTool(
    server,
    session,
    compareBundlesContract,
    options.artifactResources,
  );
  registerInvestigationTools(server, session);
  registerUnknownTools({ server, session });
  registerContextTools(server, session);
};

const missingAndroidAvailability = async (): Promise<ProviderAvailability> => ({
  status: "unavailable",
  code: "not_configured",
  reason:
    "Set REA_JADX_MCP_JAR to a caller-supplied jadx-headless-mcp 0.7.1 JAR and provide a full JDK on Linux, macOS, or Windows x64 with its matching bundled native controls.",
  diagnostics: { configured: false },
});
