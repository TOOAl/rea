import { digestCanonicalValue } from "../domain/canonicalDigest.js";
import type { ProgressReporter } from "../application/ProgressReporter.js";
import type {
  ElectronPageInspection,
  InspectElectronPageInput,
} from "../domain/javascript/electronObservation.js";
import { BrowserObservationError } from "../domain/browserObservationError.js";
import type { CdpConnection, CdpEvent } from "./CdpConnection.js";
import type { CdpEndpointDiscovery, CdpEndpointTarget } from "./CdpEndpoint.js";
import { CdpCaptureCompleteness } from "./CdpCaptureCompleteness.js";
import {
  delayWithCancellation,
  numberValue,
  recordValue,
  requiredRecord,
  cdpStringValue,
} from "./CdpCaptureValues.js";
import {
  frameTreeResources,
  snapshotDocumentNodes,
  snapshotDocuments,
  walkFrameTrees,
} from "./CdpCaptureDocuments.js";
import {
  ingestElectronScriptEvent,
  type ElectronScriptDraft,
} from "./CdpElectronScriptEvents.js";
import { captureElectronScripts } from "./CdpElectronScripts.js";
import { captureElectronWorkers } from "./CdpElectronWorkers.js";
import { authorizedElectronFile } from "./ElectronFileScope.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

const assertStableMainFrame = async (
  context: ElectronContext,
  state: ElectronInspectionState,
  expectedPath: string,
): Promise<void> => {
  const result = await context.connection.send(
    "Page.getFrameTree",
    {},
    context.sessionId,
    context.signal,
  );
  const afterPath = await mainFilePath(result);
  if (afterPath === undefined)
    throw new BrowserObservationError("inspect_web_page", "target_not_allowed");
  if (state.navigationDuringCapture || afterPath !== expectedPath)
    throw new BrowserObservationError("inspect_web_page", "target_changed");
};

const navigatedFrameId = (event: CdpEvent): string | undefined => {
  const params = recordValue(event.params);
  if (params === undefined) return undefined;
  if (event.method === "Page.frameNavigated")
    return cdpStringValue(recordValue(params.frame)?.id);
  if (event.method === "Page.navigatedWithinDocument")
    return cdpStringValue(params.frameId);
  return undefined;
};

export const captureFrames = async (
  result: unknown,
  completeness: CdpCaptureCompleteness,
): Promise<ElectronPageInspection["frames"]> => {
  const frameTree = recordValue(requiredRecord(result).frameTree);
  if (frameTree === undefined)
    throw new BrowserObservationError("inspect_web_page", "protocol_error");
  const frames: ElectronPageInspection["frames"] = [];
  for (const tree of walkFrameTrees(frameTree, () =>
    completeness.exclude("frames", "invalid_protocol_value"),
  )) {
    const frame = recordValue(tree.frame);
    const frameId = cdpStringValue(frame?.id);
    if (frame === undefined || frameId === undefined) {
      completeness.exclude("frames", "invalid_protocol_value");
      continue;
    }
    const path = await authorizedElectronFile(cdpStringValue(frame.url) ?? "");
    if (path === undefined) {
      completeness.exclude("frames", "out_of_target_scope");
      continue;
    }
    frames.push({
      frame_id: frameId,
      parent_frame_id: cdpStringValue(frame?.parentId) ?? null,
      file_path: path,
    });
  }
  return frames;
};

const captureResources = async (
  context: ElectronContext,
  completeness: CdpCaptureCompleteness,
): Promise<ElectronPageInspection["resources"]> => {
  const result = await context.connection.send(
    "Page.getResourceTree",
    {},
    context.sessionId,
    context.signal,
  );
  const root = recordValue(requiredRecord(result).frameTree);
  if (root === undefined)
    throw new BrowserObservationError("inspect_web_page", "protocol_error");
  const resources: ElectronPageInspection["resources"] = [];
  const seen = new Set<string>();
  for (const resource of frameTreeResources(root, (count) =>
    completeness.exclude("resources", "invalid_protocol_value", count),
  )) {
    const path = await authorizedElectronFile(
      cdpStringValue(resource.url) ?? "",
    );
    if (path === undefined) {
      completeness.exclude("resources", "out_of_target_scope");
      continue;
    }
    const item = {
      file_path: path,
      type: cdpStringValue(resource.type) ?? "Other",
      mime_type: cdpStringValue(resource.mimeType) ?? "",
      content_size:
        numberValue(resource.contentSize) === undefined
          ? null
          : Math.max(0, numberValue(resource.contentSize) ?? 0),
    };
    const resourceKey = `electron_resource_${digestCanonicalValue(item, "CDP capture")}`;
    if (seen.has(resourceKey)) continue;
    seen.add(resourceKey);
    resources.push({
      resource_key: resourceKey,
      ...item,
    });
  }
  return resources.sort((left, right) =>
    compareUnicodeCodePoints(left.resource_key, right.resource_key),
  );
};

const captureDom = async (
  context: ElectronContext,
  completeness: CdpCaptureCompleteness,
): Promise<ElectronPageInspection["dom"]> => {
  const result = requiredRecord(
    await context.connection.send(
      "DOMSnapshot.captureSnapshot",
      { computedStyles: [], includePaintOrder: false, includeDOMRects: false },
      context.sessionId,
      context.signal,
    ),
  );
  const invalid = (count: number | null) =>
    completeness.exclude("dom", "invalid_protocol_value", count);
  if (!Array.isArray(result.strings)) invalid(null);
  const strings = Array.isArray(result.strings)
    ? result.strings.map((value) => (typeof value === "string" ? value : ""))
    : [];
  const nodes: ElectronPageInspection["dom"]["nodes"] = [];
  let total = 0;
  for (const document of snapshotDocuments(result.documents, invalid)) {
    const documentUrl = stringAt(strings, document.documentURL);
    if ((await authorizedElectronFile(documentUrl)) === undefined) {
      completeness.exclude("dom", "out_of_target_scope");
      continue;
    }
    // The shared snapshot owner validates the parallel node arrays.
    const documentNodes = snapshotDocumentNodes(document.nodes);
    if (documentNodes === undefined) {
      invalid(1);
      continue;
    }
    if (documentNodes.excessAttributes > 0)
      invalid(documentNodes.excessAttributes);
    const { nodeTypes, nodeNames, nodeValues, parents, attributes } =
      documentNodes;
    const baseIndex = nodes.length;
    total += nodeTypes.length;
    for (let index = 0; index < nodeTypes.length; index += 1) {
      const attributeIndexes = arrayValue(attributes[index]);
      const parent = integer(parents[index], -1);
      nodes.push({
        index: nodes.length,
        parent_index: parent < 0 ? -1 : baseIndex + parent,
        node_type: integer(nodeTypes[index], 0),
        node_name: stringAt(strings, nodeNames[index]),
        node_value_length: Buffer.byteLength(
          stringAt(strings, nodeValues[index]),
        ),
        attribute_names: attributeIndexes
          .filter((_value, attributeIndex) => attributeIndex % 2 === 0)
          .map((value) => stringAt(strings, value)),
      });
    }
  }
  return { total_nodes: total, nodes };
};

const mainFilePath = async (result: unknown): Promise<string | undefined> => {
  const frameTree = recordValue(requiredRecord(result).frameTree);
  const frame = recordValue(frameTree?.frame);
  return await authorizedElectronFile(cdpStringValue(frame?.url) ?? "");
};

const arrayValue = (value: unknown): readonly unknown[] =>
  Array.isArray(value) ? value : [];

const stringAt = (strings: readonly string[], value: unknown): string =>
  strings[integer(value, -1)] ?? "";

const integer = (value: unknown, fallback: number): number => {
  const number = numberValue(value);
  return number === undefined ? fallback : Math.trunc(number);
};

const report = async (
  progress: ProgressReporter | undefined,
  completed: number,
  message: string,
): Promise<void> =>
  await progress?.report({
    phase: "browser_observation",
    completed,
    total: 3,
    message,
    ...(completed === 3 ? { terminal: true } : {}),
  });
