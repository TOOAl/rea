import {
  webPageInspectionSchema,
  type WebPageInspection,
} from "../browserObservationSchemas.js";
import type { BrowserCompleteness } from "../browserCompleteness.js";
import {
  electronPageInspectionSchema,
  type ElectronPageInspection,
} from "./electronObservation.js";
import {
  javascriptRuntimeKindSchema,
  type JavaScriptRuntimeObservation,
} from "./javascriptRuntimeObservation.js";
import { digestCanonicalValue } from "../canonicalDigest.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import { parseEvidence, type Evidence } from "../evidence.js";
import { parseActiveElectronCapture } from "./javascriptRuntimeReconciliationActive.js";
import {
  assertEvidenceIdentity,
  invalidInput,
  parseAtPath,
} from "./javascriptRuntimeReconciliationInputValidation.js";

interface RuntimeCaptureBase {
  readonly evidence: Evidence;
  readonly captureSha256: string;
  readonly scriptsCompleteWithinScope: boolean;
}

interface NormalizedV8Inspection {
  readonly target:
    | {
        readonly target_id: string;
        readonly type: string;
        readonly title: string;
        readonly attached: boolean | null;
        readonly file_path: string;
      }
    | {
        readonly target_id: string;
        readonly type: string;
        readonly title: string;
        readonly attached: boolean | null;
        readonly url: string;
      }
    | {
        readonly target_id: string;
        readonly type: string;
        readonly title: string;
        readonly attached: boolean | null;
        readonly unresolved_location: Extract<
          JavaScriptRuntimeObservation["target"]["location"],
          { kind: "unresolved" }
        >;
      };
  readonly frames: readonly [];
  readonly scripts: {
    readonly items: readonly (Readonly<{
      script_key: string;
      frame_id: string | null;
      cdp_hash: string | null;
      length: number | null;
      is_module: boolean | null;
      language: null;
      source: { readonly included: false; readonly reason: string };
    }> &
      (
        | { readonly file_path: string }
        | { readonly url: string }
        | {
            readonly unresolved_location: Extract<
              JavaScriptRuntimeObservation["scripts"]["items"][number]["location"],
              { kind: "unresolved" }
            >;
          }
      ))[];
  };
  readonly workers: readonly [];
  readonly completeness: BrowserCompleteness;
}

export type ParsedRuntimeCapture =
  | (RuntimeCaptureBase & {
      readonly kind: "browser";
      readonly inspection: WebPageInspection;
    })
  | (RuntimeCaptureBase & {
      readonly kind: "electron";
      readonly inspection: ElectronPageInspection;
    })
  | (RuntimeCaptureBase & {
      readonly kind: "v8-inspector";
      readonly inspection: NormalizedV8Inspection;
    })
  | (RuntimeCaptureBase & {
      readonly kind: "electron-active";
      readonly inspection: {
        readonly target: {
          readonly target_id: string;
          readonly type: string;
          readonly title: string;
          readonly attached: boolean;
          readonly file_path: string;
        };
        readonly frames: readonly [];
        readonly scripts: { readonly items: readonly [] };
        readonly workers: readonly [];
        readonly completeness: BrowserCompleteness;
      };
    });

/** Parse only supported passive web/Electron inspection Evidence. */
export const parseRuntimeCaptures = (
  observations: readonly Evidence[],
  path: readonly (string | number)[] = ["runtime_observations"],
): ParsedRuntimeCapture[] =>
  observations
    .map((observation, index) =>
      parseRuntimeCapture(observation, [...path, index]),
    )
    .sort((left, right) =>
      compareUnicodeCodePoints(
        left.evidence.evidence_id,
        right.evidence.evidence_id,
      ),
    );

const parseRuntimeCapture = (
  input: Evidence,
  evidencePath: readonly (string | number)[],
): ParsedRuntimeCapture => {
  const evidence = parseAtPath(parseEvidence, input, evidencePath);
  if (evidence.operation === "inspect_web_page")
    return parseBrowserCapture(evidence, evidencePath);
  if (evidence.operation === "inspect_electron_page")
    return parseElectronCapture(evidence, evidencePath);
  if (evidence.operation === "observe_javascript_runtime")
    return parseV8Capture(evidence, evidencePath);
  if (evidence.operation === "capture_electron_scenario") {
    return parseAtPath(
      () => parseActiveElectronCapture(evidence),
      evidence,
      evidencePath,
    );
  }
  throw invalidInput(
    evidencePath,
    "Runtime reconciliation requires inspect_web_page, inspect_electron_page, observe_javascript_runtime, or capture_electron_scenario Evidence",
  );
};

const parseBrowserCapture = (
  evidence: Evidence,
  path: readonly (string | number)[],
): ParsedRuntimeCapture => {
  assertEvidenceIdentity(
    evidence,
    {
      operation: "inspect_web_page",
      predicate: "rea.web-page-inspection",
      providerId: "rea-cdp-browser",
      providerName: "REA Chrome DevTools Protocol observation provider",
      providerVersion: "2",
      authority: "external-service",
      confidence: "observed",
    },
    path,
  );
  const inspection = parseAtPath(
    (value) => webPageInspectionSchema.parse(value),
    evidence.normalized_result,
    [...path, "normalized_result"],
  );
  assertRuntimeParameters(
    evidence,
    {
      kind: "browser",
      targetId: inspection.target.target_id,
      targetOrigin: inspection.target.origin,
      sourceIncluded: inspection.scripts.items.some(
        ({ source }) => source.included,
      ),
    },
    path,
  );
  return {
    kind: "browser",
    evidence,
    inspection,
    captureSha256: digestCanonicalValue(inspection, "Runtime reconciliation"),
    scriptsCompleteWithinScope: scriptsComplete(inspection.completeness),
  };
};

const parseElectronCapture = (
  evidence: Evidence,
  path: readonly (string | number)[],
): ParsedRuntimeCapture => {
  assertEvidenceIdentity(
    evidence,
    {
      operation: "inspect_electron_page",
      predicate: "rea.electron-page-inspection",
      providerId: "rea-cdp-electron",
      providerName: "REA Electron file-page CDP observation provider",
      providerVersion: "1",
      authority: "external-service",
      confidence: "observed",
    },
    path,
  );
  const inspection = parseAtPath(
    (value) => electronPageInspectionSchema.parse(value),
    evidence.normalized_result,
    [...path, "normalized_result"],
  );
  assertRuntimeParameters(
    evidence,
    {
      kind: "electron",
      targetId: inspection.target.target_id,
      sourceIncluded: inspection.scripts.items.some(
        ({ source }) => source.included,
      ),
    },
    path,
  );
  return {
    kind: "electron",
    evidence,
    inspection,
    captureSha256: digestCanonicalValue(inspection, "Runtime reconciliation"),
    scriptsCompleteWithinScope: scriptsComplete(inspection.completeness),
  };
};
