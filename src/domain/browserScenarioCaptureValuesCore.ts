import { createHash } from "node:crypto";

import { z } from "zod";

import {
  browserNetworkBodySchema,
  browserNetworkHeadersSchema,
} from "./browserNetworkEvidence.js";
import { sanitizedBrowserUrlSchema } from "./browserObservation.js";
import { webScreenshotArtifactSchema } from "./webScreenshot.js";
import { digestSchema } from "./../domain/digests.js";

const textArtifactSchema = z
  .strictObject({
    sha256: digestSchema,
    bytes: z.number().int().min(0),
    text: z.string(),
  })
  .superRefine((artifact, context) => {
    const bytes = Buffer.from(artifact.text);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== artifact.bytes || sha256 !== artifact.sha256)
      context.addIssue({
        code: "custom",
        message: "Text artifact digest or size mismatch",
      });
  });

export const captureStateSchema = <Schema extends z.ZodType>(value: Schema) =>
  z.discriminatedUnion("state", [
    z.strictObject({ state: z.literal("captured"), value }),
    z.strictObject({
      state: z.literal("not_requested"),
    }),
    z.strictObject({
      state: z.literal("missing"),
      reason: z.string().min(1),
    }),
    z.strictObject({
      state: z.literal("truncated"),
      observed: z.number().int().min(0),
      retained: z.number().int().min(0),
      reason: z.string().min(1),
    }),
  ]);

const historySchema = z.strictObject({
  length: z.number().int().min(0),
  current_url: sanitizedBrowserUrlSchema,
  navigation_entries: z.array(
    z.strictObject({
      type: z.enum([
        "navigate",
        "reload",
        "back_forward",
        "prerender",
        "unknown",
      ]),
      name: sanitizedBrowserUrlSchema,
    }),
  ),
});

const hashedStorageValueShape = {
  value_state: z.literal("hashed"),
  value_sha256: digestSchema,
};
const redactedStorageValueShape = {
  value_state: z.literal("redacted-secret"),
  value_sha256: z.null(),
};
const storageValueFingerprintSchema = z.discriminatedUnion("value_state", [
  z.strictObject(hashedStorageValueShape),
  z.strictObject(redactedStorageValueShape),
]);
export type BrowserStorageValueFingerprint = z.infer<
  typeof storageValueFingerprintSchema
>;

const storageValueSchema = z.discriminatedUnion("value_state", [
  z.strictObject({
    name: z.string(),
    ...hashedStorageValueShape,
  }),
  z.strictObject({
    name: z.string(),
    ...redactedStorageValueShape,
  }),
]);

const cookieShape = {
  name: z.string(),
  domain: z.string(),
  path: z.string(),
  secure: z.boolean(),
  http_only: z.boolean(),
  same_site: z.enum(["Strict", "Lax", "None"]),
};

const storageSnapshotSchema = z.strictObject({
  cookies: z.array(
    z.discriminatedUnion("value_state", [
      z.strictObject({ ...cookieShape, ...hashedStorageValueShape }),
      z.strictObject({ ...cookieShape, ...redactedStorageValueShape }),
    ]),
  ),
  local_storage: z.array(storageValueSchema),
  session_storage: z.array(storageValueSchema),
});

export const browserStepArtifactsSchema = z.strictObject({
  screenshot: captureStateSchema(webScreenshotArtifactSchema),
  dom: captureStateSchema(textArtifactSchema),
  accessibility: captureStateSchema(textArtifactSchema),
  url: captureStateSchema(sanitizedBrowserUrlSchema),
  history: captureStateSchema(historySchema),
  storage: captureStateSchema(storageSnapshotSchema),
});
export type BrowserStepArtifacts = z.infer<typeof browserStepArtifactsSchema>;

/** Event families a scenario can select for capture. */
export const browserScenarioEventFamilySchema = z.enum([
  "console",
  "page-errors",
  "network",
  "websockets",
  "frames",
  "workers",
  "popups",
  "downloads",
]);
export type BrowserScenarioEventFamily = z.infer<
  typeof browserScenarioEventFamilySchema
>;

const eventBase = {
  sequence: z.number().int().min(1),
  step_index: z.number().int().min(0),
};

const eventUrl = sanitizedBrowserUrlSchema.nullable();
const networkEventShape = {
  ...eventBase,
  transaction_id: z.string().min(1),
  redirected_from_transaction_id: z.string().min(1).nullable(),
  /** Distinguishes a captured root from an unobserved predecessor for null links. */
  redirected_from_transaction_state: z.enum(["root", "unknown"]).optional(),
  method: z.string().min(1),
  url: sanitizedBrowserUrlSchema,
  resource_type: z.string().min(1),
  header_names: z.array(z.string()),
};
const webSocketFrameShape = {
  ...eventBase,
  kind: z.enum(["websocket-frame-sent", "websocket-frame-received"]),
  url: sanitizedBrowserUrlSchema,
  payload_bytes: z.number().int().min(0),
  truncated: z.boolean(),
};

export const browserScenarioEventSchema = z
  .union([
    z.strictObject({
      ...eventBase,
      kind: z.literal("console"),
      level: z.string().min(1),
      text: z.string(),
      url: eventUrl,
    }),
    z.strictObject({
      ...eventBase,
      kind: z.literal("page-error"),
      message: z.string(),
      stack: z.string().nullable(),
    }),
    z.strictObject({
      ...networkEventShape,
      kind: z.literal("request"),
      status: z.null(),
      failure: z.null(),
    }),
    z.strictObject({
      ...networkEventShape,
      kind: z.literal("response"),
      status: z.number().int().min(100).max(599),
      failure: z.null(),
    }),
    z.strictObject({
      ...networkEventShape,
      kind: z.literal("request-failed"),
      status: z.null(),
      failure: z.string().min(1),
    }),
    z.strictObject({
      ...networkEventShape,
      kind: z.literal("request-finished"),
      status: z.null(),
      failure: z.null(),
    }),
    z.strictObject({
      ...networkEventShape,
      kind: z.literal("request-unfinished"),
      status: z.null(),
      failure: z.null(),
      reason: z.enum(["capture-ended", "cancelled"]),
    }),
    z.strictObject({
      ...eventBase,
      kind: z.literal("network-content"),
      transaction_id: z.string().min(1),
      source_event_sequence: z.number().int().min(1),
      phase: z.enum(["request", "response"]),
      headers: browserNetworkHeadersSchema,
      body: browserNetworkBodySchema,
    }),
    z.strictObject({
      ...eventBase,
      kind: z.enum(["websocket-opened", "websocket-closed"]),
      url: sanitizedBrowserUrlSchema,
    }),
    z.strictObject({
      ...webSocketFrameShape,
      payload_type: z.literal("text"),
      payload_text: z.string(),
    }),
    z.strictObject({
      ...webSocketFrameShape,
      payload_type: z.literal("binary"),
      payload_text: z.null(),
    }),
    z.strictObject({
      ...eventBase,
      kind: z.enum([
        "frame-attached",
        "frame-detached",
        "frame-navigated",
        "worker-created",
        "worker-closed",
        "popup-opened",
        "popup-closed",
      ]),
      url: eventUrl,
      name: z.string().nullable(),
    }),
    z.strictObject({
      ...eventBase,
      kind: z.literal("download-cancelled"),
      suggested_filename: z.string(),
      url: sanitizedBrowserUrlSchema,
    }),
  ])
  .superRefine((event, context) => {
    if (
      "redirected_from_transaction_id" in event &&
      event.redirected_from_transaction_id !== null &&
      event.redirected_from_transaction_state !== undefined
    )
      context.addIssue({
        code: "custom",
        message:
          "Redirect state is valid only when the predecessor transaction ID is null",
        path: ["redirected_from_transaction_state"],
      });
  });
