import { z } from "zod";
import { canonicalJson } from "../comparisonSemantics.js";
import { digestCanonicalValue } from "../canonicalDigest.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import { applicationGraphEvidenceSchema } from "./javascriptApplicationEvidenceSchemas.js";
import {
  JAVASCRIPT_SEMANTIC_RELATION_FAMILIES,
  JAVASCRIPT_SEMANTIC_RELATION_FAMILY,
} from "./javascriptSemanticGraphSchemas.js";

type GraphRecord = z.infer<
  import("./javascriptSemanticGraphSchemas.js").javaScriptSemanticGraphRecordSchema
>;
export type SemanticGraphIssue = {
  readonly code: "custom";
  readonly path: PropertyKey[];
  readonly message: string;
};
export interface GraphIssueReporter {
  readonly addIssue: (issue: SemanticGraphIssue) => void;
}
export const evidenceContextId = (
  context: import("./javascriptApplicationEvidenceSchemas.js").ApplicationGraphEvidenceContext,
): string =>
  `jsrg_evidence_${digestCanonicalValue(context, "JavaScript semantic evidence context")}`;
const sortedUniqueIssue = (
  values: readonly string[],
  path: PropertyKey[],
  label: string,
  context: GraphIssueReporter,
): void => {
  for (let index = 1; index < values.length; index += 1) {
    if (
      compareUnicodeCodePoints(values[index - 1] ?? "", values[index] ?? "") < 0
    )
      continue;
    context.addIssue({
      code: "custom",
      path: [...path, index],
      message: `${label} must be sorted and unique`,
    });
    return;
  }
};
export function* checkCoverageSteps(
  graph: GraphRecord,
  context: GraphIssueReporter,
): Generator<void> {
  const families = graph.coverage.families.map(({ family }) => family);
  if (
    canonicalJson(families, "JavaScript semantic graph") !==
    canonicalJson(
      JAVASCRIPT_SEMANTIC_RELATION_FAMILIES,
      "JavaScript semantic graph",
    )
  )
    context.addIssue({
      code: "custom",
      path: ["coverage", "families"],
      message:
        "Coverage must name every semantic relation family once in canonical order",
    });
  if (
    graph.coverage.status === "complete" &&
    (graph.coverage.truncated ||
      graph.coverage.omitted_nodes !== 0 ||
      graph.coverage.omitted_relations !== 0 ||
      graph.coverage.families.some(({ status }) => status !== "complete"))
  )
    context.addIssue({
      code: "custom",
      path: ["coverage"],
      message: "Complete graph coverage cannot omit or truncate semantic facts",
    });
  if (graph.coverage.truncated && graph.coverage.limits.length === 0)
    context.addIssue({
      code: "custom",
      path: ["coverage", "limits"],
      message: "Truncated graph coverage must identify an effective limit",
    });
  const relationsByFamily = new Map(
    JAVASCRIPT_SEMANTIC_RELATION_FAMILIES.map((family) => [family, 0]),
  );
  for (const [index, relation] of graph.relations.entries()) {
    if (index % 256 === 0) yield;
    const family = JAVASCRIPT_SEMANTIC_RELATION_FAMILY[relation.relation];
    relationsByFamily.set(family, (relationsByFamily.get(family) ?? 0) + 1);
  }
  const unknownsById = new Map<string, GraphRecord["unknowns"][number]>();
  const unknownFamilies = new Set<string>();
  for (const [index, unknown] of graph.unknowns.entries()) {
    if (index % 256 === 0) yield;
    unknownsById.set(unknown.unknown_id, unknown);
    unknownFamilies.add(unknown.family);
  }
  for (const [index, family] of graph.coverage.families.entries()) {
    if (family.retained_relations !== relationsByFamily.get(family.family))
      context.addIssue({
        code: "custom",
        path: ["coverage", "families", index, "retained_relations"],
        message: "Family retained relation count does not match graph content",
      });
    if (
      family.unknown_ids.some(
        (identifier) => unknownsById.get(identifier)?.family !== family.family,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["coverage", "families", index, "unknown_ids"],
        message: "Family coverage references an unknown from another family",
      });
    if (
      family.status === "complete" &&
      (family.omitted_relations !== 0 ||
        family.unknown_ids.length > 0 ||
        unknownFamilies.has(family.family))
    )
      context.addIssue({
        code: "custom",
        path: ["coverage", "families", index],
        message: "Complete family coverage cannot omit or retain unknown facts",
      });
  }
}
export const checkCanonicalOrder = (
  graph: GraphRecord,
  context: GraphIssueReporter,
): void => {
  sortedUniqueIssue(
    graph.root_node_ids,
    ["root_node_ids"],
    "Root nodes",
    context,
  );
  sortedUniqueIssue(
    graph.evidence_contexts.map(({ context_id }) => context_id),
    ["evidence_contexts"],
    "Evidence contexts",
    context,
  );
  sortedUniqueIssue(
    graph.nodes.map(({ node_id }) => node_id),
    ["nodes"],
    "Nodes",
    context,
  );
  sortedUniqueIssue(
    graph.relations.map(({ relation_id }) => relation_id),
    ["relations"],
    "Relations",
    context,
  );
  sortedUniqueIssue(
    graph.fingerprints.map(({ fingerprint_id }) => fingerprint_id),
    ["fingerprints"],
    "Fingerprints",
    context,
  );
  sortedUniqueIssue(
    graph.unknowns.map(({ unknown_id }) => unknown_id),
    ["unknowns"],
    "Unknown frontiers",
    context,
  );
  sortedUniqueIssue(graph.limitations, ["limitations"], "Limitations", context);
};
export function* checkEvidenceContextReferencesSteps(
  graph: GraphRecord,
  context: GraphIssueReporter,
): Generator<void> {
  const contexts = new Map(
    graph.evidence_contexts.map((value) => [value.context_id, value]),
  );
  const referenced = new Set<string>();
  const validateReferences = function* (
    entities: readonly {
      evidence: import("./javascriptSemanticGraphSchemas.js").JavaScriptSemanticEvidenceReference;
    }[],
    entityKind: "nodes" | "relations" | "unknowns" | "fingerprints",
  ): Generator<void> {
    for (const [index, { evidence }] of entities.entries()) {
      if (index % 256 === 0) yield;
      referenced.add(evidence.context_id);
      const evidenceContext = contexts.get(evidence.context_id);
      if (evidenceContext === undefined) {
        context.addIssue({
          code: "custom",
          path: [entityKind, index, "evidence", "context_id"],
          message: "Evidence reference names an absent context",
        });
        continue;
      }
      const { context_id: _contextId, ...evidenceValue } = evidenceContext;
      if (
        !applicationGraphEvidenceSchema.safeParse({
          ...evidenceValue,
          location: evidence.location,
        }).success
      )
        context.addIssue({
          code: "custom",
          path: [entityKind, index, "evidence"],
          message: "Evidence context is incompatible with its fact location",
        });
    }
  };
  yield* validateReferences(graph.nodes, "nodes");
  yield* validateReferences(graph.relations, "relations");
  yield* validateReferences(graph.unknowns, "unknowns");
  yield* validateReferences(graph.fingerprints, "fingerprints");
  for (const [index, evidenceContext] of graph.evidence_contexts.entries()) {
    if (index % 256 === 0) yield;
    const { context_id: identifier, ...value } = evidenceContext;
    if (identifier !== evidenceContextId(value))
      context.addIssue({
        code: "custom",
        path: ["evidence_contexts", index, "context_id"],
        message: "Evidence context identifier is stale",
      });
    if (!referenced.has(identifier))
      context.addIssue({
        code: "custom",
        path: ["evidence_contexts", index],
        message: "Evidence context is not referenced by a graph fact",
      });
  }
}
