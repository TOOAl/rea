import { createHash } from "node:crypto";

import { z } from "zod";

import { emptyArraySchema } from "./emptyArraySchema.js";
import {
  browserNetworkBodySchema,
  browserNetworkHeadersSchema,
} from "./browserNetworkEvidence.js";
import { sanitizedBrowserUrlSchema } from "./browserObservation.js";
import { webScreenshotArtifactSchema } from "./webScreenshot.js";
import { digestSchema } from "./../domain/digests.js";

export type BrowserScenarioEvent = z.infer<typeof browserScenarioEventSchema>;

const completenessSectionSchema = z.enum([
  "action",
  "screenshot",
  "dom",
  "accessibility",
  "url",
  "history",
  "storage",
  "events",
  "frames",
  "workers",
  "popups",
  "websockets",
]);

export const browserScenarioEventKindSchema = z.enum([
  "console",
  "page-error",
  "request",
  "response",
  "request-failed",
  "request-finished",
  "request-unfinished",
  "network-content",
  "websocket-opened",
  "websocket-closed",
  "websocket-frame-sent",
  "websocket-frame-received",
  "frame-attached",
  "frame-detached",
  "frame-navigated",
  "worker-created",
  "worker-closed",
  "popup-opened",
  "popup-closed",
  "download-cancelled",
]);
export const browserScenarioEventBudgetReasonSchema = z.enum([
  "max-events",
  "max-event-allocation-bytes",
  "max-total-event-allocation-bytes",
  "max-network-transactions",
  "max-network-metadata-allocation-bytes",
  "max-listener-owners",
]);
export const browserScenarioEventOmissionsSchema = z.strictObject({
  by_kind: z.array(
    z.strictObject({
      kind: browserScenarioEventKindSchema,
      count: z.number().int().positive(),
      reasons: z.array(browserScenarioEventBudgetReasonSchema).min(1),
    }),
  ),
  network_transactions: z.array(
    z.strictObject({
      transaction_id: z.string().min(1),
      omitted_kinds: z.array(browserScenarioEventKindSchema).min(1),
      reasons: z.array(browserScenarioEventBudgetReasonSchema).min(1),
    }),
  ),
  network_transaction_range: z
    .strictObject({
      first_transaction_id: z.string().min(1),
      last_transaction_id: z.string().min(1),
      count: z.number().int().positive(),
      reason: z.literal("max-network-transactions"),
    })
    .nullable(),
});
export type BrowserScenarioEventOmissions = z.infer<
  typeof browserScenarioEventOmissionsSchema
>;
export type BrowserScenarioEventBudgetReason = z.infer<
  typeof browserScenarioEventBudgetReasonSchema
>;
export type BrowserScenarioEventAdmission =
  | { readonly status: "retained"; readonly sequence: number }
  | {
      readonly status: "omitted";
      readonly sequence: number;
      readonly reason: BrowserScenarioEventBudgetReason;
    };
export type BrowserScenarioCompletenessSection = z.infer<
  typeof completenessSectionSchema
>;

export const browserScenarioCompletenessSchema = z.discriminatedUnion(
  "status",
  [
    z.strictObject({
      status: z.literal("complete"),
      equality_eligible: z.literal(true),
      missing_sections: emptyArraySchema,
      truncated_sections: emptyArraySchema,
    }),
    z.strictObject({
      status: z.literal("incomplete"),
      equality_eligible: z.literal(false),
      missing_sections: z.array(completenessSectionSchema).min(1),
      truncated_sections: emptyArraySchema,
    }),
    z.strictObject({
      status: z.literal("truncated"),
      equality_eligible: z.literal(false),
      missing_sections: z.array(completenessSectionSchema),
      truncated_sections: z.array(completenessSectionSchema).min(1),
    }),
  ],
);
export type BrowserScenarioCompleteness = z.infer<
  typeof browserScenarioCompletenessSchema
>;

/** Classify canonical browser-scenario completeness from section accounting. */
export const classifyBrowserScenarioCompleteness = (
  missing: Iterable<BrowserScenarioCompletenessSection>,
  truncated: Iterable<BrowserScenarioCompletenessSection>,
): BrowserScenarioCompleteness => {
  const missingSections = [...new Set(missing)].sort();
  const truncatedSections = [...new Set(truncated)].sort();
  if (truncatedSections.length > 0)
    return browserScenarioCompletenessSchema.parse({
      status: "truncated",
      equality_eligible: false,
      missing_sections: missingSections,
      truncated_sections: truncatedSections,
    });
  if (missingSections.length > 0)
    return browserScenarioCompletenessSchema.parse({
      status: "incomplete",
      equality_eligible: false,
      missing_sections: missingSections,
      truncated_sections: [],
    });
  return {
    status: "complete",
    equality_eligible: true,
    missing_sections: [],
    truncated_sections: [],
  };
};

const browserScenarioStepShape = {
  step_index: z.number().int().min(0),
  step_id: z.string().min(1),
  action: z.string().min(1),
  elapsed_ms: z.number().int().min(0),
  before_url: sanitizedBrowserUrlSchema,
  after_url: sanitizedBrowserUrlSchema,
  event_sequence_start: z.number().int().min(1),
  event_sequence_end: z.number().int().min(0),
  artifacts: browserStepArtifactsSchema,
  completeness: browserScenarioCompletenessSchema,
};
export const browserScenarioStepSchema = z.union([
  z.strictObject({
    ...browserScenarioStepShape,
    status: z.literal("completed"),
    error: z.null(),
  }),
  z.strictObject({
    ...browserScenarioStepShape,
    status: z.enum(["failed", "cancelled"]),
    error: z.string(),
  }),
]);
export type BrowserScenarioStep = z.infer<typeof browserScenarioStepSchema>;
type StepOutcome<Step> = Step extends BrowserScenarioStep
  ? Pick<Step, "status" | "error">
  : never;
export type BrowserScenarioStepOutcome = StepOutcome<BrowserScenarioStep>;
