import type { EvidenceMcpServer } from "./EvidenceMcpServer.js";
import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";

import {
  getNavigationContext,
  inspectAddressContext,
} from "../application/AnalysisContextQueries.js";
import { readAnalysisSnapshot } from "../application/binary/AnalysisSnapshotFiles.js";
import type { BinarySessionPort } from "../application/binary/BinarySessionPort.js";
import { createProcessCaptureEvidence } from "../application/process/ProcessEvidence.js";
import { captureProcessScenario } from "../process/capture/ProcessHarness.js";
import { ProcessCaptureResourceScope } from "../process/capture/ProcessCaptureLifecycle.js";
import { ProcessCaptureError } from "../process/capture/ProcessCaptureError.js";
import { toolContract } from "../contracts/toolContracts.js";
import { binaryTargetSummary } from "../application/binary/BinaryTargetSummary.js";
import { UnknownRegistryError } from "../domain/unknownRegistryError.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import type { Evidence } from "../domain/evidence.js";
import type { ProcessCapture } from "../domain/process/processCaptureParsing.js";
import { err, ok, type Result } from "../domain/result.js";
import type { Logger } from "pino";
import type { ProviderAvailability } from "../application/AnalysisProvider.js";
import { mcpProgressReporter } from "./mcpProgress.js";
import { registerArtifactComparisonTool } from "./registerArtifactComparisonTool.js";
import { registerBundleComparisonTool } from "./registerBundleComparisonTool.js";
import { registerCloseLifecycleTool } from "./registerCloseLifecycleTool.js";
import { registerFunctionComparisonTool } from "./registerFunctionComparisonTool.js";
import { registerInvestigationTools } from "./registerInvestigationTools.js";
import { registerProcessComparisonTool } from "./registerProcessComparisonTool.js";
import {
  registerEvidenceTools,
  registerUnknownTools,
} from "./registerSessionRecordTools.js";
import {
  registerSessionStatusTool,
  type SessionAvailabilityProbes,
} from "./registerSessionStatusTool.js";
import { sessionAvailabilityPolicy } from "./sessionAvailabilityPolicy.js";
import type { AvailabilityPolicy } from "../application/CapabilityInventory.js";
import { logToolExecution } from "./toolLogging.js";
import { toolRegistrationOptions } from "./toolRegistrationOptions.js";
import { withAdmittedAnalysis } from "./analysisAdmission.js";
import { runAdmittedToolOperation } from "./admittedToolOperation.js";

const recordProcessResidualUnknowns = (
  session: BinarySessionPort,
  evidence: Evidence,
  residuals: ProcessCapture["residual_unknowns"],
): Result<null, AnalysisError> => {
  for (const residual of residuals) {
    const unknown = session.recordUnknown({
      question: `Was ${residual.scope} behavior fully observed during capture?`,
      severity: "medium",
      domain: `process-${residual.scope}`,
      supporting_evidence_ids: [evidence.evidence_id],
      contradicting_evidence_ids: [],
      required_authority: "controlled-replay",
      required_confidence: "observed",
      required_environment: evidence.environment,
      recommended_probes: [
        {
          operation: "capture_process_scenario",
          rationale:
            "Repeat with a scenario that observes the missing behavior.",
        },
      ],
      relationships: [],
    });
    if (
      !unknown.ok &&
      !(
        unknown.error instanceof UnknownRegistryError &&
        unknown.error.reason === "already-exists"
      )
    )
      return unknown;
  }
  return ok(null);
};

interface ProcessToolRegistration {
  readonly server: EvidenceMcpServer;
  readonly session: BinarySessionPort;
  readonly logger: Logger;
  readonly captureContract: ReturnType<
    typeof toolContract<"capture_process_scenario">
  >;
  readonly resourceScope: ProcessCaptureResourceScope;
}

const registerProcessTools = ({
  server,
  session,
  logger,
  captureContract,
  resourceScope,
}: ProcessToolRegistration): void => {
  const admission = withAdmittedAnalysis({ kind: "session", session });
  server.registerTool(
    captureContract.name,
    toolRegistrationOptions(captureContract),
    async (input, context) =>
      runAdmittedToolOperation(
        server,
        admission,
        captureContract.name,
        context.mcpReq.signal,
        async () => {
          const progress = mcpProgressReporter(context);
          const captured = await logToolExecution(
            logger,
            captureContract.name,
            () =>
              captureProcessScenario(
                input,
                context.mcpReq.signal,
                process.platform,
                process.env,
                undefined,
                undefined,
                progress,
                resourceScope,
              ),
          );
          if (!captured.ok)
            return server.delivery.toCallToolResult(captured, captureContract);
          const evidence = createProcessCaptureEvidence(input, captured.value);
          const recorded = session.recordEvidence(evidence);
          if (!recorded.ok)
            return server.delivery.toCallToolResult(recorded, captureContract);
          const unknowns = recordProcessResidualUnknowns(
            session,
            evidence,
            captured.value.residual_unknowns,
          );
          if (!unknowns.ok)
            return server.delivery.toCallToolResult(unknowns, captureContract);
          return server.delivery.toEvidenceToolResult(
            evidence,
            captureContract,
            recorded,
          );
        },
      ),
  );
};

export interface LifecycleToolRegistration extends SessionAvailabilityProbes {
  readonly server: EvidenceMcpServer;
  readonly session: BinarySessionPort;
  readonly logger: Logger;
  readonly openContract: ReturnType<typeof toolContract<"open_binary">>;
  readonly closeContract: ReturnType<typeof toolContract<"close_binary">>;
  readonly statusContract: ReturnType<typeof toolContract<"binary_session">>;
  readonly startedAt: string;
  readonly availabilityPolicy: () => AvailabilityPolicy;
  readonly closeProcessResources: () => Promise<Result<null, AnalysisError>>;
}

const registerLifecycleTools = (
  registration: LifecycleToolRegistration,
  artifactResources: ArtifactResourceScope,
): void => {
  registerOpenLifecycleTool(registration, artifactResources);
  registerCloseLifecycleTool(registration);
  registerSessionStatusTool({
    ...registration,
    contract: registration.statusContract,
  });
};
