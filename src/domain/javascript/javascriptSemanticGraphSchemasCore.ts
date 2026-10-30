import { z } from "zod";

import {
  applicationGraphEvidenceContextSchema,
  applicationGraphEvidenceLocationSchema,
} from "./javascriptApplicationEvidenceSchemas.js";
import { prefixedDigestSchema } from "../digests.js";

const boundedTextSchema = z.string().min(1);
const semanticNodeIdSchema = prefixedDigestSchema("jsrg_node");
const semanticRelationIdSchema = z
  .string()
  .regex(/^jsrg_relation_[a-f0-9]{64}$/u);
const semanticUnknownIdSchema = z
  .string()
  .regex(/^jsrg_unknown_[a-f0-9]{64}$/u);
const semanticEvidenceContextIdSchema = z
  .string()
  .regex(/^jsrg_evidence_[a-f0-9]{64}$/u);

/** One canonical owner for provenance shared by semantic graph facts. */
export const javaScriptSemanticEvidenceContextSchema =
  applicationGraphEvidenceContextSchema.extend({
    context_id: semanticEvidenceContextIdSchema,
  });

/** Location-specific reference to one exact graph-level evidence context. */
export const javaScriptSemanticEvidenceReferenceSchema = z.strictObject({
  context_id: semanticEvidenceContextIdSchema,
  location: applicationGraphEvidenceLocationSchema,
});

/** Semantic entity kinds admitted by JavaScript Semantic Relation Graph. */
export const JAVASCRIPT_SEMANTIC_NODE_KINDS = [
  "module",
  "function",
  "parameter",
  "binding",
  "expression",
  "literal",
  "property-slot",
  "call-site",
  "return-site",
  "closure-capture",
  "promise",
  "task",
  "event",
  "listener",
  "timer",
  "child-process",
  "stdio",
  "signal",
  "config-source",
  "request",
  "response",
  "boundary",
  "resource",
  "unknown-frontier",
] as const;

/** Required semantic-analysis coverage families. */
export const JAVASCRIPT_SEMANTIC_RELATION_FAMILIES = [
  "boundary",
  "call-flow",
  "child-process",
  "closure",
  "configuration",
  "data-flow",
  "event",
  "object-flow",
  "promise-ownership",
  "request",
  "resource-lifecycle",
  "timer",
] as const;

/** Directed semantic relations admitted by the graph. */
export const JAVASCRIPT_SEMANTIC_RELATIONS = [
  "acquires",
  "aggregates",
  "aliases",
  "argument-to-parameter",
  "awaits",
  "calls",
  "cancels-timer",
  "captures",
  "chains",
  "coerces",
  "connects-stdio",
  "consumed-by",
  "constructs-request",
  "creates-promise",
  "defaults",
  "defines",
  "destructures",
  "detaches-task",
  "dispatches-candidate",
  "forwards-signal",
  "listens-error",
  "listens-exit",
  "owns",
  "overrides",
  "parses",
  "reads",
  "reads-argv",
  "reads-config",
  "reads-environment",
  "reads-property",
  "registers-listener",
  "releases",
  "removes-listener",
  "returns-task",
  "returns-to-call",
  "schedules-timer",
  "spawns",
  "spreads",
  "supplies-argv",
  "supplies-env",
  "supplies-request-field",
  "validates",
  "writes",
  "writes-property",
] as const;

/** Map each semantic relation to its coverage family. */
export const JAVASCRIPT_SEMANTIC_RELATION_FAMILY = {
  acquires: "resource-lifecycle",
  aggregates: "promise-ownership",
  aliases: "data-flow",
  "argument-to-parameter": "call-flow",
  awaits: "promise-ownership",
  calls: "call-flow",
  "cancels-timer": "timer",
  captures: "closure",
  chains: "promise-ownership",
  coerces: "boundary",
  "connects-stdio": "child-process",
  "consumed-by": "request",
  "constructs-request": "request",
  "creates-promise": "promise-ownership",
  defaults: "configuration",
  defines: "data-flow",
  destructures: "object-flow",
  "detaches-task": "promise-ownership",
  "dispatches-candidate": "event",
  "forwards-signal": "child-process",
  "listens-error": "child-process",
  "listens-exit": "child-process",
  owns: "promise-ownership",
  overrides: "configuration",
  parses: "boundary",
  reads: "data-flow",
  "reads-argv": "configuration",
  "reads-config": "configuration",
  "reads-environment": "configuration",
  "reads-property": "object-flow",
  "registers-listener": "event",
  releases: "resource-lifecycle",
  "removes-listener": "event",
  "returns-task": "promise-ownership",
  "returns-to-call": "call-flow",
  "schedules-timer": "timer",
  spawns: "child-process",
  spreads: "object-flow",
  "supplies-argv": "child-process",
  "supplies-env": "child-process",
  "supplies-request-field": "request",
  validates: "boundary",
  writes: "data-flow",
  "writes-property": "object-flow",
} as const satisfies Readonly<
  Record<
    (typeof JAVASCRIPT_SEMANTIC_RELATIONS)[number],
    (typeof JAVASCRIPT_SEMANTIC_RELATION_FAMILIES)[number]
  >
>;

const relativePathSchema = z
  .string()
  .min(1)
  .refine(
    (path) =>
      !path.startsWith("/") &&
      path.split("/").every((part) => !["", ".", ".."].includes(part)),
    "Expected a normalized relative POSIX path without traversal",
  );

const sourcePointSchema = z.strictObject({
  line: z.number().int().min(1),
  column: z.number().int().min(0),
});
