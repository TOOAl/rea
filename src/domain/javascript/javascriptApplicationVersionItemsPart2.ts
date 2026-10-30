import { absenceClaimable } from "../comparisonSemantics.js";
import { digestCanonicalValue } from "../canonicalDigest.js";
import type { Evidence } from "../evidence.js";
import type { ApplicationNode } from "./javascriptApplicationGraphSchemas.js";
import type { ApplicationVersionComparisonItem } from "./javascriptApplicationVersionComparisonSchemas.js";
import type { ApplicationVersionNodePair } from "./javascriptApplicationVersionKeys.js";

/** All classified entities and their complete ambiguity candidate sets. */
export interface ApplicationVersionItemProjection {
  readonly items: ApplicationVersionComparisonItem[];
}

// src/domain/javascript/javascriptApplicationVersionItemsPart2.ts
const nativeLinks = (
  node: ApplicationNode | undefined,
  evidenceByDigest: ReadonlyMap<string, readonly string[]>,
): readonly string[] => {
  const identity = node === undefined ? null : contentIdentity(node);
  if (identity === null) return [];
  const digest = identity.replace(/^content:/u, "");
  return evidenceByDigest.get(digest) ?? [];
};

const indexNativeEvidence = (
  evidence: readonly Evidence[],
): ReadonlyMap<string, readonly string[]> => {
  const evidenceByDigest = new Map<string, string[]>();
  for (const { evidence_id: id, subject } of evidence) {
    const digest = subject?.digest.sha256;
    if (digest === undefined) continue;
    const ids = evidenceByDigest.get(digest);
    if (ids === undefined) evidenceByDigest.set(digest, [id]);
    else ids.push(id);
  }
  return evidenceByDigest;
};

const pairLimitations = (
  pair: ApplicationVersionNodePair,
  status: ApplicationVersionComparisonItem["status"],
): string[] => [
  ...(pair.basis === "structural-fingerprint"
    ? [
        "Structural fingerprint equality is rename-resistant inference; it is not byte identity or proof of semantic equivalence.",
      ]
    : []),
  ...(pair.basis === "source-map-identity"
    ? [
        "Source-map original names identify a candidate source lineage; changed or unavailable source content remains explicit.",
      ]
    : []),
  ...(pair.basis === "semantic-key"
    ? [
        "Semantic-key pairing is a deterministic inference and is never promoted to exact identity.",
      ]
    : []),
  ...(status === "unknown"
    ? ["Incomplete graph coverage prevents a complete node-level conclusion."]
    : []),
];

const itemWithId = <Semantic extends ComparisonItemSemantic>(
  semantic: Semantic,
): Semantic & { readonly item_id: string } => ({
  ...semantic,
  item_id: `javc_item_${digestCanonicalValue(semantic, "Application version item")}`,
});

const stringProperty = (node: ApplicationNode, key: string): string | null => {
  const values = [
    ...new Set(
      node.observations
        .map(({ properties: values }) => values[key])
        .filter((value): value is string => typeof value === "string"),
    ),
  ];
  return values.length === 1 ? (values[0] ?? null) : null;
};

const graphsComplete = (context: ItemContext): boolean =>
  absenceClaimable(context.leftGraph.coverage) &&
  absenceClaimable(context.rightGraph.coverage);
