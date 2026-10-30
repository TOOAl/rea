import { digestCanonicalValue } from "./canonicalDigest.js";
import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";
import type { WebPageInspection } from "./browserObservationSchemas.js";
import type {
  CompareWebCapturesInput,
  WebCaptureChange,
  WebCaptureDimension,
} from "./webCaptureDiffSchemas.js";
import type { WebMcpDiscovery } from "./webMcpDiscovery.js";
import { fingerprintWebCaptureFrames } from "./webCaptureFrameComparison.js";

type Dimension = WebCaptureDimension;
type Change = WebCaptureChange;

/** Compare normalized observations without treating incomplete absence as proof. */

// src/domain/webCaptureDiffPart2.ts
const networkDimension = (
  before: WebPageInspection,
  after: WebPageInspection,
): Dimension => {
  const requestsComplete = [before, after].every((inspection) =>
    networkInventoryComplete(inspection, ["network_requests"]),
  );
  const webSocketInventoryComplete = [before, after].every((inspection) =>
    networkInventoryComplete(inspection, [
      "websocket_connections",
      "websocket_frames",
    ]),
  );
  const requestIdentities = networkIdentityCoverage(before, after);
  const metadata = sharedNetworkMetadata(before, after);
  const selected = bodyShapesSelected(before) && bodyShapesSelected(after);
  const webSocketShapes =
    webSocketShapesSelected(before) && webSocketShapesSelected(after);
  const projection = {
    metadataFields: metadata.fields,
    ambiguousIdentities: requestIdentities.ambiguousIdentities,
    inventoryComplete: requestsComplete,
  };
  const sources = new Map<string, BodyShapeSources>();
  if (selected) {
    const observedSources = (inspection: WebPageInspection) => {
      const result = new Map<string, BodyShapeSources>();
      for (const request of inspection.network.requests) {
        const identity = networkIdentity(request);
        const previous = result.get(identity);
        result.set(identity, {
          request:
            previous?.request !== false && request.body_shapes.request !== null,
          response:
            previous?.response !== false &&
            request.body_shapes.response !== null,
        });
      }
      return result;
    };
    const left = observedSources(before);
    const right = observedSources(after);
    for (const [identity, coverage] of left) {
      const next = right.get(identity);
      sources.set(identity, {
        request: coverage.request && next?.request === true,
        response: coverage.response && next?.response === true,
      });
    }
  }
  const shapesComplete =
    !selected ||
    [before, after].every(
      (inspection) =>
        sectionsComplete(inspection, ["json_body_shapes"]) &&
        inspection.network.requests.every(
          ({ body_shapes }) => body_shapes.status === "included",
        ),
    );
  const webSocketShapesComplete =
    !webSocketShapes ||
    [before, after].every(
      (inspection) =>
        sectionsComplete(inspection, ["websocket_shapes"]) &&
        inspection.network.websocket_connections.every((connection) =>
          connection.events.every((event) => event.payload_shape !== null),
        ),
    );
  const webSocketPayloadBytesComplete = [before, after].every((inspection) =>
    inspection.network.websocket_connections.every((connection) =>
      connection.events.every((event) => event.payload_bytes !== null),
    ),
  );
  const beforeWebSockets = webSocketGroups(before);
  const afterWebSockets = webSocketGroups(after);
  const [beforeWebSocketPayload, afterWebSocketPayload] = webSocketPayloadMaps(
    beforeWebSockets,
    afterWebSockets,
    webSocketShapes,
  );
  const compared = compareDimension(
    new Map([
      ...networkMap(before, sources, projection),
      ...(webSocketInventoryComplete
        ? webSocketMetadataMap(beforeWebSockets)
        : []),
      ...beforeWebSocketPayload,
    ]),
    new Map([
      ...networkMap(after, sources, projection),
      ...(webSocketInventoryComplete
        ? webSocketMetadataMap(afterWebSockets)
        : []),
      ...afterWebSocketPayload,
    ]),
    requestsComplete &&
      requestIdentities.complete &&
      webSocketInventoryComplete &&
      shapesComplete &&
      webSocketPayloadBytesComplete &&
      webSocketShapesComplete,
    requestIdentities.complete
      ? "Network capture or selected HTTP/WebSocket payload-shape coverage is limited, unavailable, incomplete, or includes dropped network events."
      : "HTTP request identity is incomplete because a resource type is unavailable; potentially matching type groups cannot establish membership/content changes or complete network equality.",
    // HTTP and WebSocket identities have independent inventory coverage. Shape
    // selection can prevent equality without erasing proven membership changes.
    (identity) =>
      identity.startsWith("net_")
        ? requestsComplete
        : identity.startsWith("ws_") && webSocketInventoryComplete,
  );
  if (metadata.complete) return compared;
  const responseEvidenceReason =
    "HTTP response or redirect status, MIME type, byte count, or resource-type evidence is incomplete.";
  if (compared.status === "changed") return compared;
  return {
    status: "unknown",
    total_changes: 0,
    changes: [],
    reason:
      compared.reason === null
        ? responseEvidenceReason
        : `${responseEvidenceReason} ${compared.reason}`,
  };
};

const networkMap = (
  inspection: WebPageInspection,
  sources: ReadonlyMap<string, BodyShapeSources>,
  projection: {
    readonly metadataFields: ReadonlyMap<
      string,
      ReadonlySet<NetworkMetadataField>
    >;
    readonly ambiguousIdentities: ReadonlySet<string>;
    readonly inventoryComplete: boolean;
  },
): ReadonlyMap<string, string> => {
  const grouped = new Map<string, string[]>();
  for (const request of inspection.network.requests) {
    const identity = networkIdentity(request);
    // A missing type can move repeated requests between these buckets. Neither
    // their counts nor fingerprints establish a change to that typed group.
    if (projection.ambiguousIdentities.has(identity)) continue;
    const shapes = sources.get(identity);
    const values = grouped.get(identity) ?? [];
    const response: Record<string, unknown> = {};
    for (const field of projection.metadataFields.get(identity) ?? [])
      response[field] = request[field];
    values.push(
      digestCanonicalValue({
        ...response,
        redirects: (request.redirects ?? []).map(
          (
            {
              request_timestamp: _requestTimestamp,
              redirect_event_timestamp: _redirectEventTimestamp,
              ...redirect
            },
            index,
          ) => {
            const response: Partial<
              Record<NetworkMetadataField, number | string>
            > = {};
            for (const field of projection.metadataFields.get(
              redirectNetworkIdentity(identity, index),
            ) ?? [])
              if (redirect[field] !== null) response[field] = redirect[field];
            return {
              url: redirect.url,
              response_url: redirect.response_url,
              method: redirect.method,
              ...response,
            };
          },
        ),
        initiator: request.initiator,
        ...(shapes?.request === true
          ? { request_shape: request.body_shapes.request }
          : {}),
        ...(shapes?.response === true
          ? { response_shape: request.body_shapes.response }
          : {}),
      }),
    );
    grouped.set(identity, values);
  }
  return new Map(
    [...grouped].map(([identity, values]) => [
      identity,
      digestCanonicalValue(
        // Repeated samples do not establish multiplicity across omissions;
        // keep their known content without interpreting missing rows as change.
        (projection.inventoryComplete ? values : [...new Set(values)]).sort(),
      ),
    ]),
  );
};

type WebSocketGroup = {
  readonly url: string;
  readonly stream: string;
  readonly connections: WebPageInspection["network"]["websocket_connections"];
};

const webSocketGroups = (
  inspection: WebPageInspection,
): ReadonlyMap<string, WebSocketGroup> => {
  const groups = new Map<string, WebSocketGroup>();
  for (const connection of inspection.network.websocket_connections) {
    const stream = digestCanonicalValue(
      connection.events.map(({ direction, opcode }) => ({
        direction,
        opcode,
      })),
    );
    const key = digestCanonicalValue({ url: connection.url, stream });
    const previous = groups.get(key);
    if (previous !== undefined) previous.connections.push(connection);
    else
      groups.set(key, {
        url: connection.url,
        stream,
        connections: [connection],
      });
  }
  return groups;
};

const webSocketMetadataMap = (
  groups: ReadonlyMap<string, WebSocketGroup>,
): ReadonlyMap<string, string> => {
  const byUrl = new Map<string, string[]>();
  for (const group of groups.values()) {
    const streams = byUrl.get(group.url) ?? [];
    for (let index = 0; index < group.connections.length; index += 1)
      streams.push(group.stream);
    byUrl.set(group.url, streams);
  }
  return new Map(
    [...byUrl].map(([url, streams]) => [
      `ws_${digestCanonicalValue(url)}`,
      digestCanonicalValue(streams.sort(compareUnicodeCodePoints)),
    ]),
  );
};

const webSocketPayloadMaps = (
  beforeGroups: ReadonlyMap<string, WebSocketGroup>,
  afterGroups: ReadonlyMap<string, WebSocketGroup>,
  selected: boolean,
): readonly [ReadonlyMap<string, string>, ReadonlyMap<string, string>] => {
  const left = new Map<string, string>();
  const right = new Map<string, string>();
  for (const [groupKey, beforeGroup] of beforeGroups) {
    const afterGroup = afterGroups.get(groupKey);
    if (
      afterGroup === undefined ||
      beforeGroup.connections.length !== afterGroup.connections.length
    )
      continue;
    const eventCount = beforeGroup.connections[0]?.events.length ?? 0;
    const comparableBytes = new Set<number>();
    const comparableShapes = new Set<number>();
    for (let index = 0; index < eventCount; index += 1) {
      if (
        beforeGroup.connections.every(
          (connection) => connection.events[index]?.payload_bytes !== null,
        ) &&
        afterGroup.connections.every(
          (connection) => connection.events[index]?.payload_bytes !== null,
        )
      )
        comparableBytes.add(index);
      // Compare only when every same-metadata connection has shape evidence
      // on both sides; this avoids assigning an unknown shape to a known one.
      if (
        selected &&
        beforeGroup.connections.every(
          (connection) => connection.events[index]?.payload_shape !== null,
        ) &&
        afterGroup.connections.every(
          (connection) => connection.events[index]?.payload_shape !== null,
        )
      )
        comparableShapes.add(index);
    }
    if (comparableBytes.size === 0 && comparableShapes.size === 0) continue;
    const project = (group: WebSocketGroup) =>
      digestCanonicalValue(
        group.connections
          .map((connection) =>
            connection.events.map((event, index) => {
              const comparablePayload: Record<string, unknown> = {};
              if (comparableBytes.has(index))
                comparablePayload.payload_bytes = event.payload_bytes;
              if (comparableShapes.has(index))
                comparablePayload.payload_shape = event.payload_shape;
              return Object.keys(comparablePayload).length === 0
                ? null
                : comparablePayload;
            }),
          )
          .map((stream) => digestCanonicalValue(stream))
          .sort(compareUnicodeCodePoints),
      );
    const identity = `wss_${groupKey}`;
    left.set(identity, project(beforeGroup));
    right.set(identity, project(afterGroup));
  }
  return [left, right];
};

const webMcpDimension = (
  before: WebMcpDiscovery | null,
  after: WebMcpDiscovery | null,
): Dimension => {
  const afterTools = new Map(
    after?.tools.items.map((tool) => [tool.tool_key, tool]),
  );
  const unknownHints = new Set(
    (before?.tools.items ?? [])
      .filter((tool) => {
        const other = afterTools.get(tool.tool_key);
        return (
          other !== undefined &&
          (tool.annotations.consequential === undefined ||
            other.annotations.consequential === undefined)
        );
      })
      .map((tool) => tool.tool_key),
  );
  const project = (
    discovery: WebMcpDiscovery | null,
  ): ReadonlyMap<string, string> =>
    keyed(
      (discovery?.tools.items ?? []).map((tool) => {
        if (!unknownHints.has(tool.tool_key)) return tool;
        const { consequential: _unknown, ...annotations } = tool.annotations;
        return { ...tool, annotations };
      }),
      (tool) => tool.tool_key,
    );
  const result = compareDimension(
    project(before),
    project(after),
    webMcpComplete(before) && webMcpComplete(after),
    "WebMCP discovery was unavailable or incomplete in at least one capture.",
  );
  return result.status === "unchanged" && unknownHints.size > 0
    ? {
        ...result,
        status: "unknown",
        reason:
          "Consequential annotations were not recorded or were invalid in at least one capture.",
      }
    : result;
};

const webMcpComplete = (discovery: WebMcpDiscovery | null): boolean =>
  discovery !== null &&
  discovery.status === "available" &&
  !incompleteSections(discovery.completeness).has("webmcp_tools");

const sectionsComplete = (
  inspection: WebPageInspection,
  sections: readonly string[],
): boolean => {
  const incomplete = incompleteSections(inspection.completeness);
  return sections.every((section) => !incomplete.has(section));
};

const incompleteSections = (completeness: {
  readonly policy_filtered_sections: readonly string[];
  readonly attach_limited_sections: readonly string[];
  readonly truncated_sections: readonly string[];
  readonly unavailable_sections: readonly string[];
}): ReadonlySet<string> =>
  new Set([
    ...completeness.policy_filtered_sections,
    ...completeness.attach_limited_sections,
    ...completeness.truncated_sections,
    ...completeness.unavailable_sections,
  ]);

/** Whole-collection digest differences cannot prove a change across omissions. */
const compareAggregate = (
  identity: string,
  before: unknown,
  after: unknown,
  complete: boolean,
  reason: string,
): Dimension =>
  compareDimension(
    complete ? singleton(identity, digestCanonicalValue(before)) : new Map(),
    complete ? singleton(identity, digestCanonicalValue(after)) : new Map(),
    complete,
    reason,
  );

const domDimension = (
  before: WebPageInspection,
  after: WebPageInspection,
): Dimension => {
  const beforeFrames = fingerprintWebCaptureFrames(before.frames);
  const afterFrames = fingerprintWebCaptureFrames(after.frames);
  const nodesComplete = [before, after].every(
    (inspection) =>
      sectionsComplete(inspection, ["dom"]) &&
      inspection.dom.total_nodes === inspection.dom.nodes.length,
  );
  const framesComplete =
    beforeFrames !== null &&
    afterFrames !== null &&
    [before, after].every((inspection) =>
      sectionsComplete(inspection, ["frames"]),
    );
  const changes: Change[] = [];
  if (
    nodesComplete &&
    digestCanonicalValue(before.dom.nodes) !==
      digestCanonicalValue(after.dom.nodes)
  )
    changes.push({ identity: "document", change: "modified" });
  if (framesComplete && beforeFrames !== afterFrames)
    changes.push({ identity: "frames", change: "modified" });
  if (changes.length > 0)
    return {
      status: "changed",
      total_changes: changes.length,
      changes,
      reason: null,
    };
  return nodesComplete && framesComplete
    ? { status: "unchanged", total_changes: 0, changes: [], reason: null }
    : {
        status: "unknown",
        total_changes: 0,
        changes: [],
        reason:
          "DOM or frame capture was incomplete, or frame ancestry was unresolved in at least one observation.",
      };
};
