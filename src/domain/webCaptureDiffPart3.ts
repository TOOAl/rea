import { digestCanonicalValue } from "./canonicalDigest.js";
import type { WebPageInspection } from "./browserObservationSchemas.js";
import type {
  CompareWebCapturesInput,
  WebCaptureChange,
  WebCaptureDimension,
} from "./webCaptureDiffSchemas.js";

type Dimension = WebCaptureDimension;
type Change = WebCaptureChange;

/** Compare normalized observations without treating incomplete absence as proof. */

// src/domain/webCaptureDiffPart3.ts
const scriptProjection = (
  script: WebPageInspection["scripts"]["items"][number],
) => ({
  script_key: script.script_key,
  url: script.url,
  cdp_hash: script.cdp_hash,
  length: script.length,
  is_module: script.is_module,
  language: script.language,
  source_map_url: script.source_map_url,
});

const metadataProjection = (inspection: WebPageInspection) => ({
  responses: inspection.metadata.responses
    .map(({ request_id: _requestId, ...response }) => response)
    .map((value) => digestCanonicalValue(value))
    .sort(),
  dom_urls: inspection.metadata.dom_urls
    .map((value) => digestCanonicalValue(value))
    .sort(),
  agent_hints: inspection.metadata.agent_hints
    .map((value) => digestCanonicalValue(value))
    .sort(),
  excluded_dom_urls: inspection.metadata.excluded_dom_urls,
  headers_allowlisted: inspection.metadata.headers_allowlisted,
});

const singleton = (key: string, value: string): ReadonlyMap<string, string> =>
  new Map([[key, value]]);

const accessibilityComparable = (
  inspection: WebPageInspection,
): {
  readonly text: boolean;
  readonly nodes: boolean;
  readonly complete: boolean;
} => {
  const text =
    inspection.accessibility.text_capture.status === "included" &&
    inspection.accessibility.text_capture.excluded_fields === 0;
  const nodes =
    inspection.accessibility.total_nodes ===
    inspection.accessibility.nodes.length;
  const complete =
    text && nodes && sectionsComplete(inspection, ["accessibility"]);
  return { text, nodes, complete };
};

const accessibilityProjection = (
  accessibility: WebPageInspection["accessibility"],
  includeText: boolean,
  includeNodes: boolean,
): unknown => {
  if (!includeNodes) return { total_nodes: accessibility.total_nodes };
  const nodeIndexes = new Map(
    accessibility.nodes.map((node, index) => [node.node_id, index]),
  );
  return {
    total_nodes: accessibility.total_nodes,
    nodes: accessibility.nodes.map((node) => ({
      parent_index:
        node.parent_id === null
          ? null
          : (nodeIndexes.get(node.parent_id) ?? -1),
      role: node.role,
      ignored: node.ignored,
      states: node.states,
      ...(includeText
        ? { name: node.name, description: node.description }
        : {}),
    })),
  };
};

const storageKeysComparable = (inspection: WebPageInspection): boolean =>
  sectionsComplete(inspection, ["storage_keys"]);

const storageComparable = (
  before: WebPageInspection,
  after: WebPageInspection,
  keysComplete: boolean,
  usageComplete: boolean,
): boolean =>
  keysComplete &&
  usageComplete &&
  before.storage.fingerprints_complete &&
  after.storage.fingerprints_complete;

const storageMap = (
  storage: WebPageInspection["storage"],
  includeKeys: boolean,
  includeUsage: boolean,
  fingerprintIdentities: ReadonlySet<string>,
): ReadonlyMap<string, string> => {
  const map = new Map<string, string>([
    [
      "storage:summary",
      digestCanonicalValue({
        origin: storage.origin,
        values_redacted: storage.values_redacted,
        ...(includeUsage
          ? {
              usage_bytes: storage.usage_bytes,
              quota_bytes: storage.quota_bytes,
            }
          : {}),
      }),
    ],
  ]);
  const add = (kind: string, keys: readonly string[]) => {
    for (const key of keys) {
      map.set(`storage:${kind}:${key}`, digestCanonicalValue(key));
    }
  };
  if (includeKeys) {
    add("local_storage", storage.local_storage_keys);
    add("session_storage", storage.session_storage_keys);
    add("indexed_db", storage.indexed_db_names);
    add("cache", storage.cache_names);
  }
  for (const fingerprint of storage.content_fingerprints) {
    const identity = `${fingerprint.scope}:${fingerprint.identity_sha256}`;
    if (!fingerprintIdentities.has(identity)) continue;
    map.set(
      `storage:content:${identity}`,
      digestCanonicalValue(fingerprint.value_sha256),
    );
  }
  return map;
};

const storageFingerprintIdentities = (
  before: WebPageInspection["storage"],
  after: WebPageInspection["storage"],
): ReadonlySet<string> => {
  const beforeComplete = completeStorageFingerprints(before);
  const afterComplete = completeStorageFingerprints(after);
  if (before.fingerprints_complete && after.fingerprints_complete)
    return new Set([...beforeComplete.keys(), ...afterComplete.keys()]);
  return new Set(
    [...beforeComplete.keys()].filter((identity) =>
      afterComplete.has(identity),
    ),
  );
};

const completeStorageFingerprints = (
  storage: WebPageInspection["storage"],
): ReadonlyMap<string, string | null> =>
  new Map(
    storage.content_fingerprints
      .filter(({ complete }) => complete)
      .map(({ scope, identity_sha256, value_sha256 }) => [
        `${scope}:${identity_sha256}`,
        value_sha256,
      ]),
  );
