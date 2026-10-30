import canonicalize from "canonicalize";

import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";

import { evidenceSchema, parseEvidence, type Evidence } from "./evidence.js";
import type { ResidualUnknown } from "./residualUnknown.js";

const [detectedSubjectSchema, rawSubjectSchema] =
  evidenceSchema.shape.subject.unwrap().options;

// src/domain/evidenceBundlePart2.ts
export const validateResidualUnknownAddition = (
  unknown: ResidualUnknown,
  evidenceById: Pick<ReadonlyMap<string, Evidence>, "get" | "has">,
  currentHeads: ReadonlyMap<string, ResidualUnknown>,
): void => {
  const current = currentHeads.get(unknown.unknown_id);
  if (
    current === undefined
      ? unknown.revision !== 1 || unknown.previous_revision_digest !== null
      : unknown.revision !== current.revision + 1 ||
        unknown.previous_revision_digest !== current.revision_digest
  )
    throw new TypeError(
      `Residual unknown ${unknown.unknown_id} revision chain is broken`,
    );
  for (const evidenceId of referencedEvidenceIds(unknown))
    if (!evidenceById.has(evidenceId))
      throw new TypeError(
        `Residual unknown references missing evidence ${evidenceId}`,
      );
  for (const relationship of unknown.relationships)
    if (
      relationship.unknown_id !== unknown.unknown_id &&
      !currentHeads.has(relationship.unknown_id)
    )
      throw new TypeError(
        `Residual unknown references missing unknown ${relationship.unknown_id}`,
      );
  if (unknown.resolution?.disposition === "verified")
    validateVerifiedResolution(unknown, evidenceById);
  // In a valid graph, no existing node can point to an absent ID. Since the
  // schema rejects self-relations, a new node's outgoing edges cannot close a
  // cycle; keep graph traversal for revisions of existing nodes only.
  if (current !== undefined) {
    const dependencies = unknown.relationships
      .filter((relationship) => relationship.type === "depends-on")
      .map(({ unknown_id }) => unknown_id);
    if (
      dependencies.length > 0 &&
      reachesUnknown(dependencies, unknown.unknown_id, currentHeads, unknown)
    )
      throw new TypeError("Residual unknown dependency graph contains a cycle");
  }
};

const reachesUnknown = (
  starts: readonly string[],
  goal: string,
  currentHeads: ReadonlyMap<string, ResidualUnknown>,
  candidate: ResidualUnknown,
): boolean => {
  const pending = [...starts];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined) break;
    if (id === goal) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    const unknown =
      id === candidate.unknown_id ? candidate : currentHeads.get(id);
    if (unknown === undefined) continue;
    for (const relationship of unknown.relationships)
      if (relationship.type === "depends-on")
        pending.push(relationship.unknown_id);
  }
  return false;
};

const evidenceQualifies = (
  unknown: ResidualUnknown,
  evidence: Evidence,
): boolean => {
  if (
    unknown.required_authority !== null &&
    evidence.authority !== unknown.required_authority
  )
    return false;
  const confidenceRank = { inferred: 1, derived: 2, observed: 3 } as const;
  if (
    confidenceRank[evidence.confidence] <
    confidenceRank[unknown.required_confidence]
  )
    return false;
  const requirement = unknown.required_environment;
  if (requirement === null) return true;
  if (evidence.environment === null) return false;
  return (
    (requirement.id === null || requirement.id === evidence.environment.id) &&
    (requirement.platform === null ||
      requirement.platform === evidence.environment.platform) &&
    (requirement.architecture === null ||
      requirement.architecture === evidence.environment.architecture) &&
    (requirement.isolation === null ||
      requirement.isolation === evidence.environment.isolation)
  );
};

const rejectDependencyCycles = (
  unknownById: ReadonlyMap<string, ResidualUnknown>,
): void => {
  const visited = new Set<string>();
  const active = new Set<string>();
  const pending: {
    readonly id: string;
    readonly relationships: ResidualUnknown["relationships"];
    nextRelationship: number;
  }[] = [];
  for (const root of unknownById.keys()) {
    if (visited.has(root)) continue;
    const rootUnknown = unknownById.get(root);
    if (rootUnknown === undefined)
      throw new TypeError("Residual unknown dependency graph is inconsistent");
    active.add(root);
    pending.push({
      id: root,
      relationships: rootUnknown.relationships,
      nextRelationship: 0,
    });
    while (pending.length > 0) {
      const frame = pending[pending.length - 1];
      if (frame === undefined) break;
      let descended = false;
      while (frame.nextRelationship < frame.relationships.length) {
        const relationship = frame.relationships[frame.nextRelationship];
        frame.nextRelationship += 1;
        if (relationship?.type !== "depends-on") continue;
        const dependency = relationship.unknown_id;
        if (active.has(dependency))
          throw new TypeError(
            "Residual unknown dependency graph contains a cycle",
          );
        if (visited.has(dependency)) continue;
        const unknown = unknownById.get(dependency);
        if (unknown === undefined)
          throw new TypeError(
            "Residual unknown dependency graph is inconsistent",
          );
        active.add(dependency);
        pending.push({
          id: dependency,
          relationships: unknown.relationships,
          nextRelationship: 0,
        });
        descended = true;
        break;
      }
      if (descended) continue;
      pending.pop();
      active.delete(frame.id);
      visited.add(frame.id);
    }
  }
};

/** Encode a validated bundle as byte-stable RFC 8785 canonical JSON. */
export const serializeEvidenceBundle = (bundle: EvidenceBundle): string => {
  const serialized = canonicalize(parseEvidenceBundle(bundle));
  if (serialized === undefined)
    throw new TypeError("Evidence bundle canonicalization failed");
  return serialized;
};

const uniqueSorted = <Value>(values: readonly Value[]): Value[] => {
  const unique = new Map<string, Value>();
  for (const value of values) unique.set(JSON.stringify(value), value);
  return [...unique.entries()]
    .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
    .map(([, value]) => value);
};
