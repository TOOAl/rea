import { z } from "zod";

import {
  nativeMetadataEvidenceSchema,
  nativeMetadataLocationSchema,
  type ObjcSwiftMetadata,
} from "./objcSwiftMetadata.js";
import { jsonValueSchema } from "../jsonValue.js";

/** Entity kinds shared by decoded Interface Builder archives and native code. */
export const nativeInvestigationNodeKindSchema = z.enum([
  "storyboard",
  "scene",
  "view_controller",
  "view",
  "control",
  "constraint",
  "layout_guide",
  "resource",
  "placeholder",
  "external_object",
  "outlet",
  "action",
  "segue",
  "objc_class",
  "objc_selector",
  "swift_declaration",
  "swift_requirement",
  "dispatch_table",
  "dispatch_slot",
  "thunk",
  "function",
  "state_value",
  "global_value",
  "field",
  "branch_condition",
  "sink",
  "unknown",
]);

/** One UI, dispatch, or value entity with optional decoded source location. */
export const nativeInvestigationNodeSchema = z.strictObject({
  id: z.string().min(1),
  kind: nativeInvestigationNodeKindSchema,
  name: z.string().min(1),
  location: nativeMetadataLocationSchema.nullable(),
  attributes: z.record(z.string(), jsonValueSchema),
  evidence: z.array(nativeMetadataEvidenceSchema),
});

/** Relationship types preserve UI wiring, native dispatch, and value flow. */
export const nativeInvestigationRelationSchema = z.enum([
  "contains",
  "outlet_to",
  "target_action",
  "segue_to",
  "objc_dispatch",
  "swift_witness_dispatch",
  "swift_vtable_dispatch",
  "thunk_to",
  "direct_call",
  "indirect_call",
  "provider_call",
  "reads",
  "writes",
  "flows_to",
  "controls",
]);

/** An observed, inferred, or unresolved relationship between entities. */
export const nativeInvestigationEdgeSchema = z.discriminatedUnion(
  "resolution",
  [
    z.strictObject({
      id: z.string().min(1),
      from: z.string().min(1),
      to: z.string().min(1),
      relation: nativeInvestigationRelationSchema,
      resolution: z.enum(["observed", "inferred", "resolved", "ambiguous"]),
      evidence: z.array(nativeMetadataEvidenceSchema).min(1),
      limitations: z.array(z.string()),
    }),
    z.strictObject({
      id: z.string().min(1),
      from: z.string().min(1),
      to: z.null(),
      relation: nativeInvestigationRelationSchema,
      resolution: z.literal("unresolved"),
      reason: z.string().min(1),
      evidence: z.array(nativeMetadataEvidenceSchema),
      limitations: z.array(z.string()),
    }),
  ],
);

export type NativeInvestigationEdge = z.infer<
  typeof nativeInvestigationEdgeSchema
>;

/** Explicit inventory coverage so missing graph parts are not read as absent. */
export const nativeInvestigationCoverageSchema = z.strictObject({
  facet: z.string().min(1),
  status: z.enum(["complete", "partial", "unsupported", "not_requested"]),
  reason: z.string().nullable(),
  examined: z.number().int().nonnegative(),
  omitted: z.number().int().nonnegative(),
});

/** Complete provider-neutral graph bound to one immutable target identity. */
export const nativeInvestigationGraphSchema = z.strictObject({
  target_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  provider: z.strictObject({
    id: z.string().min(1),
    version: z.string().nullable(),
    tool_version: z.string().min(1),
  }),
  nodes: z.array(nativeInvestigationNodeSchema),
  edges: z.array(nativeInvestigationEdgeSchema),
  coverage: z.array(nativeInvestigationCoverageSchema),
  truncated: z.boolean(),
});

export type NativeInvestigationGraph = z.infer<
  typeof nativeInvestigationGraphSchema
>;

/** Caller-controlled hard limits for a bounded relationship trace. */
export const nativeInvestigationTraceLimitsSchema = z.strictObject({
  max_depth: z.number().int().min(0).max(32).default(8),
  max_nodes: z.number().int().min(1).max(2000).default(250),
  max_edges: z.number().int().min(1).max(5000).default(500),
});

export type NativeInvestigationTraceLimits = z.infer<
  typeof nativeInvestigationTraceLimitsSchema
>;

/** Exact graph route and any unresolved edges encountered along the route. */
export const nativeInvestigationTraceSchema = z.strictObject({
  target_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  provider: nativeInvestigationGraphSchema.shape.provider,
  start: z.string().min(1),
  direction: z.enum(["forward", "backward"]),
  nodes: z.array(nativeInvestigationNodeSchema),
  edges: z.array(nativeInvestigationEdgeSchema),
  unresolved: z.array(nativeInvestigationEdgeSchema),
  reached_depth: z.number().int().nonnegative(),
  truncated: z.boolean(),
  reason: z.string().nullable(),
  coverage: z.array(nativeInvestigationCoverageSchema),
  limitations: z.array(z.string().min(1)),
});
