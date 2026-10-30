import { z } from "zod";

import { canonicalJson } from "../comparisonSemantics.js";
import { digestCanonicalValue } from "../canonicalDigest.js";
import { uniqueSorted } from "../canonicalOrdering.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import { canonicalJsonDigestSteps } from "../canonicalJsonDigestSteps.js";
import { freezeOwnedJsonSnapshotSteps } from "../immutableJson.js";
import {
  arrayContainerSchema,
  parseElementSteps,
} from "../zodCollectionSteps.js";
import type { ApplicationGraphEvidence } from "./javascriptApplicationEvidenceSchemas.js";
import {
  javaScriptSemanticFingerprintInputSchema,
  javaScriptSemanticEvidenceContextSchema,
  javaScriptSemanticGraphInputSchema,
  javaScriptSemanticGraphRecordSchema,
  javaScriptSemanticNodeInputSchema,
  javaScriptSemanticRelationInputSchema,
  javaScriptSemanticUnknownInputSchema,
  type JavaScriptSemanticGraphInput,
  type JavaScriptSemanticGraphNode,
  type JavaScriptSemanticGraphRelation,
  type JavaScriptSemanticGraphUnknown,
  type JavaScriptSemanticFingerprint,
  type JavaScriptSemanticEvidenceContext,
  type JavaScriptSemanticEvidenceReference,
} from "./javascriptSemanticGraphSchemas.js";
import { evidenceContextId } from "./javascriptSemanticGraphValidation.js";
import {
  checkGraph,
  checkGraphContent,
  checkGraphContentSteps,
} from "./javascriptSemanticGraphValidationCore.js";

const normalizeEvidence = (
  evidence: ApplicationGraphEvidence,
): ApplicationGraphEvidence => ({
  ...evidence,
  coverage: {
    ...evidence.coverage,
    limits: [...evidence.coverage.limits].sort((left, right) =>
      compareUnicodeCodePoints(
        canonicalJson(left, "JavaScript semantic graph"),
        canonicalJson(right, "JavaScript semantic graph"),
      ),
    ),
  },
  limitations: uniqueSorted(evidence.limitations),
  evidence_ids: uniqueSorted(evidence.evidence_ids),
});

/** Graph-scoped owner for canonical provenance shared by semantic facts. */
export class JavaScriptSemanticEvidenceContextRegistry {
  readonly #contexts = new Map<string, JavaScriptSemanticEvidenceContext>();
  readonly #idsByCanonicalContext = new Map<string, string>();
  intern(
    evidence: ApplicationGraphEvidence,
  ): JavaScriptSemanticEvidenceReference {
    const normalized = normalizeEvidence(evidence);
    const { location, ...context } = normalized;
    const canonicalContext = canonicalJson(
      context,
      "JavaScript semantic graph",
    );
    const internedId = this.#idsByCanonicalContext.get(canonicalContext);
    if (internedId !== undefined) return { context_id: internedId, location };
    const contextId = evidenceContextId(context);
    if (this.#contexts.has(contextId))
      throw new TypeError(
        "JavaScript semantic evidence context digest collision",
      );
    this.#contexts.set(contextId, { ...context, context_id: contextId });
    this.#idsByCanonicalContext.set(canonicalContext, contextId);
    return { context_id: contextId, location };
  }
  resolve(
    reference: JavaScriptSemanticEvidenceReference,
  ): ApplicationGraphEvidence {
    const context = this.#contexts.get(reference.context_id);
    if (context === undefined)
      throw new TypeError(
        "Semantic evidence reference names an absent context",
      );
    const { context_id: _contextId, ...evidenceContext } = context;
    return { ...evidenceContext, location: reference.location };
  }
  get contexts(): JavaScriptSemanticEvidenceContext[] {
    return [...this.#contexts.values()].sort((left, right) =>
      compareUnicodeCodePoints(left.context_id, right.context_id),
    );
  }
  clear(): void {
    this.#contexts.clear();
    this.#idsByCanonicalContext.clear();
  }
  adopt(input: unknown): void {
    const context = javaScriptSemanticEvidenceContextSchema.parse(input);
    const { context_id: identifier, ...value } = context;
    if (identifier !== evidenceContextId(value))
      throw new TypeError(
        "Transferred semantic evidence context identifier is stale",
      );
    const canonical = canonicalJson(
      value,
      "JavaScript semantic evidence context",
    );
    const existing = this.#contexts.get(identifier);
    if (existing !== undefined) {
      const { context_id: _existingIdentifier, ...existingValue } = existing;
      if (
        canonical !==
        canonicalJson(existingValue, "JavaScript semantic evidence context")
      )
        throw new TypeError(
          "Transferred semantic evidence context digest collision",
        );
    }
    this.#contexts.set(identifier, context);
    this.#idsByCanonicalContext.set(canonical, identifier);
  }
}

/** Derive a semantic node ID from its kind and exact artifact identity. */
export const javaScriptSemanticNodeId = (
  node: Pick<JavaScriptSemanticGraphNode, "kind" | "identity">,
): string =>
  `jsrg_node_${digestCanonicalValue({ kind: node.kind, identity: node.identity }, "JavaScript semantic graph")}`;

/** Normalize one semantic entity and derive its artifact-version identifier. */
export const createJavaScriptSemanticGraphNode = (
  input: unknown,
  evidenceContexts: JavaScriptSemanticEvidenceContextRegistry,
): JavaScriptSemanticGraphNode => {
  const parsed = javaScriptSemanticNodeInputSchema.parse(input);
  const semantic = {
    ...parsed,
    application_node_ids: uniqueSorted(parsed.application_node_ids),
    evidence: evidenceContexts.intern(parsed.evidence),
  };
  return { ...semantic, node_id: javaScriptSemanticNodeId(semantic) };
};

/** Normalize one semantic relationship and derive its exact identifier. */
export const createJavaScriptSemanticGraphRelation = (
  input: unknown,
  evidenceContexts: JavaScriptSemanticEvidenceContextRegistry,
): JavaScriptSemanticGraphRelation => {
  const parsed = javaScriptSemanticRelationInputSchema.parse(input);
  const semantic = {
    ...parsed,
    evidence: evidenceContexts.intern(parsed.evidence),
  };
  return {
    ...semantic,
    relation_id: `jsrg_relation_${digestCanonicalValue(semantic, "JavaScript semantic graph")}`,
  };
};

/** Normalize one unresolved semantic frontier and derive its identifier. */
export const createJavaScriptSemanticGraphUnknown = (
  input: unknown,
  evidenceContexts: JavaScriptSemanticEvidenceContextRegistry,
): JavaScriptSemanticGraphUnknown => {
  const parsed = javaScriptSemanticUnknownInputSchema.parse(input);
  const semantic = {
    ...parsed,
    relation_kinds: uniqueSorted(parsed.relation_kinds),
    candidate_node_ids: uniqueSorted(parsed.candidate_node_ids),
    evidence: evidenceContexts.intern(parsed.evidence),
  };
  return {
    ...semantic,
    unknown_id: `jsrg_unknown_${digestCanonicalValue(semantic, "JavaScript semantic graph")}`,
  };
};

/** Normalize one function fingerprint and derive its component commitment. */
export const createJavaScriptSemanticFingerprint = (
  input: unknown,
  evidenceContexts: JavaScriptSemanticEvidenceContextRegistry,
): JavaScriptSemanticFingerprint => {
  const parsed = javaScriptSemanticFingerprintInputSchema.parse(input);
  const semantic = {
    ...parsed,
    components: {
      ...parsed.components,
      effects: uniqueSorted(parsed.components.effects),
    },
    limitations: uniqueSorted(parsed.limitations),
    evidence: evidenceContexts.intern(parsed.evidence),
  };
  const fingerprintSha256 = digestCanonicalValue(
    semantic.components,
    "JavaScript semantic graph",
  );
  return {
    ...semantic,
    fingerprint_sha256: fingerprintSha256,
    fingerprint_id: `jsrg_fingerprint_${digestCanonicalValue({ function_node_id: semantic.function_node_id, algorithm: semantic.algorithm, fingerprint_sha256: fingerprintSha256 }, "JavaScript semantic graph")}`,
  };
};

export type SemanticGraphIssue =
  import("./javascriptSemanticGraphValidation.js").SemanticGraphIssue;
export type GraphIssueReporter =
  import("./javascriptSemanticGraphValidation.js").GraphIssueReporter;

/** Strict semantic graph schema with verified canonical commitments. */
export const javaScriptSemanticGraphSchema =
  javaScriptSemanticGraphRecordSchema.superRefine(checkGraph);

/** Fully validated JavaScript Semantic Relation Graph. */
export type JavaScriptSemanticGraph = z.infer<
  typeof javaScriptSemanticGraphSchema
>;

/** Resolve one fact's compact provenance without changing its stored shape. */
export const resolveJavaScriptSemanticEvidence = (
  graph: Pick<JavaScriptSemanticGraph, "evidence_contexts">,
  reference: JavaScriptSemanticEvidenceReference,
): ApplicationGraphEvidence => {
  const context = graph.evidence_contexts.find(
    ({ context_id }) => context_id === reference.context_id,
  );
  if (context === undefined)
    throw new TypeError("Semantic evidence reference names an absent context");
  const { context_id: _contextId, ...evidenceContext } = context;
  return { ...evidenceContext, location: reference.location };
};

const normalizeGraphInput = (
  parsed: JavaScriptSemanticGraphInput,
): JavaScriptSemanticGraphInput => ({
  ...parsed,
  root_node_ids: uniqueSorted(parsed.root_node_ids),
  evidence_contexts: [...parsed.evidence_contexts].sort((left, right) =>
    compareUnicodeCodePoints(left.context_id, right.context_id),
  ),
  nodes: [...parsed.nodes].sort((left, right) =>
    compareUnicodeCodePoints(left.node_id, right.node_id),
  ),
  relations: [...parsed.relations].sort((left, right) =>
    compareUnicodeCodePoints(left.relation_id, right.relation_id),
  ),
  fingerprints: [...parsed.fingerprints].sort((left, right) =>
    compareUnicodeCodePoints(left.fingerprint_id, right.fingerprint_id),
  ),
  unknowns: [...parsed.unknowns].sort((left, right) =>
    compareUnicodeCodePoints(left.unknown_id, right.unknown_id),
  ),
  coverage: {
    ...parsed.coverage,
    limits: [...parsed.coverage.limits].sort((left, right) =>
      compareUnicodeCodePoints(
        canonicalJson(left, "JavaScript semantic graph"),
        canonicalJson(right, "JavaScript semantic graph"),
      ),
    ),
    families: [...parsed.coverage.families]
      .map((family) => ({
        ...family,
        unknown_ids: uniqueSorted(family.unknown_ids),
      }))
      .sort((left, right) =>
        compareUnicodeCodePoints(left.family, right.family),
      ),
  },
  limitations: uniqueSorted(parsed.limitations),
});

/** Normalize a complete companion graph and derive its graph ID. */
export const createJavaScriptSemanticGraph = (
  input: unknown,
): JavaScriptSemanticGraph => {
  const semantic = normalizeGraphInput(
    javaScriptSemanticGraphInputSchema.parse(input),
  );
  const record: import("zod").infer<
    typeof javaScriptSemanticGraphRecordSchema
  > = {
    ...semantic,
    graph_id: `jsrg_${digestCanonicalValue(semantic, "JavaScript semantic graph")}`,
  };
  const issues: SemanticGraphIssue[] = [];
  checkGraphContent(record, {
    addIssue: (issue) => {
      issues.push(issue);
    },
  });
  if (issues.length > 0) throw new z.ZodError(issues);
  return record;
};

const validatedImmutableSemanticGraphs = new WeakSet<object>();
const semanticGraphShape = javaScriptSemanticGraphInputSchema.shape;
const semanticGraphContainerSchema = javaScriptSemanticGraphInputSchema.extend({
  evidence_contexts: arrayContainerSchema(semanticGraphShape.evidence_contexts),
  nodes: arrayContainerSchema(semanticGraphShape.nodes),
  relations: arrayContainerSchema(semanticGraphShape.relations),
  fingerprints: arrayContainerSchema(semanticGraphShape.fingerprints),
  unknowns: arrayContainerSchema(semanticGraphShape.unknowns),
});

/** Clone input synchronously; commit, check and seal the owned graph in steps. */
export const createImmutableJavaScriptSemanticGraphSteps = (
  input: unknown,
): Generator<void, JavaScriptSemanticGraph> =>
  validateAndSealSemanticGraphSteps(
    normalizeGraphInput(javaScriptSemanticGraphInputSchema.parse(input)),
  );

/**
 * Seal a graph whose input the caller transfers: the caller neither retains nor
 * mutates any part of it afterwards. Only the graph's own fields are validated
 * synchronously; collection elements are validated and cloned in steps, because
 * a whole-graph parse of a large application held the event loop for seconds.
 */
export const sealTransferredJavaScriptSemanticGraphSteps = (
  input: unknown,
): Generator<void, JavaScriptSemanticGraph> =>
  parseAndSealSemanticGraphSteps(semanticGraphContainerSchema.parse(input));

function* parseAndSealSemanticGraphSteps(
  container: z.output<typeof semanticGraphContainerSchema>,
): Generator<void, JavaScriptSemanticGraph> {
  const issues: z.core.$ZodIssue[] = [];
  const parsed: JavaScriptSemanticGraphInput = {
    ...container,
    evidence_contexts: yield* parseElementSteps(
      semanticGraphShape.evidence_contexts.element,
      container.evidence_contexts,
      ["evidence_contexts"],
      issues,
    ),
    nodes: yield* parseElementSteps(
      semanticGraphShape.nodes.element,
      container.nodes,
      ["nodes"],
      issues,
    ),
    relations: yield* parseElementSteps(
      semanticGraphShape.relations.element,
      container.relations,
      ["relations"],
      issues,
    ),
    fingerprints: yield* parseElementSteps(
      semanticGraphShape.fingerprints.element,
      container.fingerprints,
      ["fingerprints"],
      issues,
    ),
    unknowns: yield* parseElementSteps(
      semanticGraphShape.unknowns.element,
      container.unknowns,
      ["unknowns"],
      issues,
    ),
  };
  if (issues.length > 0) throw new z.ZodError(issues);
  return yield* validateAndSealSemanticGraphSteps(normalizeGraphInput(parsed));
}

function* validateAndSealSemanticGraphSteps(
  semantic: JavaScriptSemanticGraphInput,
): Generator<void, JavaScriptSemanticGraph> {
  const graph: z.infer<typeof javaScriptSemanticGraphRecordSchema> = {
    ...semantic,
    graph_id: `jsrg_${yield* canonicalJsonDigestSteps(semantic)}`,
  };
  const issues: SemanticGraphIssue[] = [];
  yield* checkGraphContentSteps(graph, {
    addIssue: (issue) => {
      issues.push(issue);
    },
  });
  if (issues.length > 0) throw new z.ZodError(issues);
  yield* freezeOwnedJsonSnapshotSteps(graph);
  validatedImmutableSemanticGraphs.add(graph);
  return graph;
}

/** Recognize the exact completely sealed graph produced by the owned factory. */
export const isValidatedImmutableJavaScriptSemanticGraph = (
  value: unknown,
): value is JavaScriptSemanticGraph =>
  typeof value === "object" &&
  value !== null &&
  validatedImmutableSemanticGraphs.has(value);
