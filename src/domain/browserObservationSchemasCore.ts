import { z } from "zod";

import { webTextArtifactSchema } from "./webContentArtifact.js";
import { jsonShapeSchema } from "./jsonShape.js";
import { prefixedDigestSchema } from "./../domain/digests.js";

/** Shared CDP/browser version identity carried on observation Evidence. */
export const browserVersionSchema = z.object({
  product: z.string(),
  protocol_version: z.string(),
  revision: z.string(),
  user_agent: z.string(),
  js_version: z.string(),
});

const browserTargetSchema = z.object({
  target_id: z.string(),
  type: z.string(),
  title: z.string(),
  url: z.string(),
  origin: z.string(),
  attached: z
    .boolean()
    .nullable()
    .describe(
      "Discovery-reported debugger attachment state; null means unknown",
    ),
});

/** Complete policy-filtered browser target discovery result. */
export const browserTargetListSchema = z.object({
  browser: browserVersionSchema,
  targets: z.array(browserTargetSchema),
  excluded: z.object({
    disallowed_origin: z.number().int().min(0),
    unsupported_url: z.number().int().min(0),
    non_page: z.number().int().min(0),
  }),
  limitations: z.array(z.string()),
});
export type BrowserTargetList = z.infer<typeof browserTargetListSchema>;

const browserFrameSchema = z.object({
  frame_id: z.string(),
  parent_frame_id: z.string().nullable(),
  url: z.string(),
  origin: z.string().nullable(),
});
const browserDomNodeSchema = z.object({
  index: z.number().int().min(0),
  parent_index: z.number().int().min(-1),
  node_type: z.number().int().min(0),
  node_name: z.string(),
  node_value_length: z.number().int().min(0),
  attribute_names: z.array(z.string()),
});
const browserAxNodeSchema = z.object({
  node_id: z.string(),
  parent_id: z.string().nullable(),
  role: z.string().nullable(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  ignored: z.boolean(),
  states: z
    .array(
      z.object({
        name: z.string(),
        value: z.union([z.boolean(), z.number(), z.string()]),
      }),
    )
    .default([]),
});
const browserScriptSourceSchema = z.discriminatedUnion("included", [
  z.object({ included: z.literal(false), reason: z.string() }),
  z.object({
    included: z.literal(true),
    artifact: webTextArtifactSchema,
  }),
]);
const browserResourceReconciliationSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("exact"), resource_key: z.string() }),
  z.object({
    status: z.literal("ambiguous"),
    candidate_resource_keys: z.array(z.string()),
  }),
  z.object({
    status: z.literal("unmatched"),
    reason: z.literal("no_exact_sanitized_url"),
  }),
]);
const browserScriptSchema = z.object({
  script_key: z.string().regex(/^scr_[a-f0-9]{64}(?:_[0-9]+)?$/u),
  frame_id: z.string().nullable().default(null),
  url: z.string(),
  origin: z.string().nullable(),
  cdp_hash: z
    .string()
    .nullable()
    .describe("Producer-reported script hash; null when unavailable."),
  length: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("Producer-reported script length; null when unavailable."),
  is_module: z
    .boolean()
    .nullable()
    .describe(
      "Producer-reported module classification; null when unavailable.",
    ),
  language: z.string().nullable(),
  source_map_url: z.string().nullable(),
  resource_reconciliation: browserResourceReconciliationSchema,
  source: browserScriptSourceSchema,
});
const browserResourceSchema = z.object({
  resource_key: prefixedDigestSchema("res"),
  url: z.string(),
  origin: z.string().nullable(),
  type: z.string(),
  mime_type: z.string(),
  content_size: z.number().min(0).nullable(),
});
const browserNetworkRequestSchema = z.object({
  request_id: z.string(),
  url: z.string(),
  origin: z.string().nullable(),
  method: z.string(),
  resource_type: z.string().nullable(),
  status: z.number().nullable(),
  mime_type: z.string().nullable(),
  encoded_data_length: z.number().min(0).nullable(),
  redirects: z
    .array(
      z.object({
        url: z.string(),
        response_url: z.string(),
        method: z.string(),
        resource_type: z.string().nullable(),
        status: z.number().nullable(),
        mime_type: z.string().nullable(),
        encoded_data_length: z.number().min(0).nullable(),
        request_timestamp: z.number().nullable(),
        redirect_event_timestamp: z.number().nullable(),
      }),
    )
    .optional(),
  initiator: z.object({
    type: z.string(),
    url: z.string().nullable(),
    line: z.number().int().min(0).nullable(),
    column: z.number().int().min(0).nullable(),
  }),
  body_shapes: z.object({
    status: z.enum(["not_approved", "included", "partial", "unavailable"]),
    request: jsonShapeSchema.nullable(),
    response: jsonShapeSchema.nullable(),
  }),
});
const browserConsoleEventSchema = z.object({
  type: z.string(),
  timestamp: z.number(),
  argument_types: z.array(z.string()),
  url: z.string().nullable(),
  line: z.number().int().min(0).nullable(),
  column: z.number().int().min(0).nullable(),
  text_capture: z.object({
    status: z.enum(["not_approved", "included"]),
    values: z.array(
      z.object({
        argument_index: z.number().int().min(0),
        type: z.string(),
        text: z.string(),
      }),
    ),
    retained_bytes: z.number().int().min(0),
  }),
});
