import { z } from "zod";
import { WEB_SOURCE_MAP_LIMITS } from "../../domain/webSourceLocation.js";
import type { EncodedSourceMapXInput } from "@jridgewell/trace-mapping";

const leafSchema = z.object({
  version: z.literal(3),
  file: z.string().nullable().optional(),
  sourceRoot: z.string().nullable().optional(),
  sources: z.array(z.string().nullable()),
  sourcesContent: z.array(z.string().nullable()).nullable().optional(),
  names: z.array(z.string()).default([]),
  mappings: z.string().regex(/^[A-Za-z0-9+/,;]*$/u),
  ignoreList: z.array(z.number().int().min(0)).optional(),
  x_google_ignoreList: z.array(z.number().int().min(0)).optional(),
});
const mapHeaderSchema = z.object({
  version: z.literal(3),
  file: z.string().nullable().optional(),
  sections: z.unknown().optional(),
});
const sectionSchema = z.object({
  offset: z.object({
    line: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    column: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  }),
  map: z.unknown().optional(),
  url: z.string().optional(),
});
const indexedSchema = z.object({
  version: z.literal(3),
  sections: z.array(sectionSchema),
});

type Offset = { readonly line: number; readonly column: number };
interface PendingMap {
  readonly value: unknown;
  readonly path: readonly number[];
  readonly offset: Offset;
  readonly stop: Offset | null;
}

/** Shared structural constraints configurable only for stricter consumers. */
export interface SourceMapStructureBudget {
  records: number;
}

export interface SourceMapStructureOptions {
  readonly profile?: "browser-collection";
  readonly budget?: SourceMapStructureBudget;
  readonly check?: () => void;
}

/** A decoder-profile failure with an actionable producer constraint. */
export class SourceMapFormatFailure extends Error {
  constructor(
    readonly reason: "format" | "unsupported" | "limit",
    message: string,
  ) {
    super(message);
  }
}

/** Raw declaration identity, separate from flattened engine URL identity. */
export interface SourceMapSourceDeclaration {
  readonly sectionPath: readonly number[];
  readonly sourceIndex: number;
  readonly source: string | null;
  readonly root: string | null;
  readonly content: string | null;
  readonly ignored: boolean;
}

/** Validated leaf with absolute first-line offsets and its enclosing section boundary. */
export interface SourceMapLeaf {
  readonly map: z.output<typeof leafSchema>;
  readonly codecMap: EncodedSourceMapXInput;
  readonly offset: Offset;
  readonly stop: Offset | null;
}

const codecLeaf = (
  map: z.output<typeof leafSchema>,
): EncodedSourceMapXInput => ({
  version: 3,
  ...(map.file === undefined ? {} : { file: map.file }),
  ...(typeof map.sourceRoot === "string" ? { sourceRoot: map.sourceRoot } : {}),
  sources: map.sources,
  ...(map.sourcesContent == null ? {} : { sourcesContent: map.sourcesContent }),
  names: map.names,
  mappings: map.mappings,
  ...(map.ignoreList === undefined ? {} : { ignoreList: map.ignoreList }),
  ...(map.x_google_ignoreList === undefined
    ? {}
    : { x_google_ignoreList: map.x_google_ignoreList }),
});

const compare = (a: Offset, b: Offset): number =>
  a.line - b.line || a.column - b.column;
const addOffset = (base: Offset, offset: Offset): Offset => {
  const result = {
    line: base.line + offset.line,
    column: offset.column + (offset.line === 0 ? base.column : 0),
  };
  if (
    !Number.isSafeInteger(result.line) ||
    !Number.isSafeInteger(result.column) ||
    result.line >= WEB_SOURCE_MAP_LIMITS.decodedRows
  )
    throw new SourceMapFormatFailure(
      "limit",
      "Indexed offset exceeds the 262144 generated-row decoder budget.",
    );
  return result;
};

const consumeRecords = (budget: { records: number }, count: number): void => {
  if (count > WEB_SOURCE_MAP_LIMITS.decodedRecords - budget.records)
    throw new SourceMapFormatFailure(
      "limit",
      `Source-map structure exceeds the ${WEB_SOURCE_MAP_LIMITS.decodedRecords}-record decoder budget.`,
    );
  budget.records += count;
};

const addSections = (
  node: PendingMap,
  pending: PendingMap[],
  budget: { records: number },
  options: SourceMapStructureOptions,
): void => {
  options.check?.();
  const header = mapHeaderSchema.parse(node.value);
  if (!Array.isArray(header.sections))
    throw new SourceMapFormatFailure(
      "format",
      "Indexed source-map sections must be an array.",
    );
  consumeRecords(budget, header.sections.length);
  const sections = indexedSchema.parse(node.value).sections;
  for (const [index, section] of sections.entries()) {
    if ((index & 255) === 0) options.check?.();
    const previous = sections[index - 1];
    if (previous !== undefined && compare(section.offset, previous.offset) <= 0)
      throw new SourceMapFormatFailure(
        "format",
        "Indexed section offsets must be strictly increasing.",
      );
    if (section.url !== undefined)
      throw new SourceMapFormatFailure(
        "unsupported",
        `External source-map section URL is not fetched: ${section.url}`,
      );
    if (section.map === undefined)
      throw new SourceMapFormatFailure(
        "format",
        "Indexed section requires an embedded map.",
      );
  }
  for (let index = sections.length - 1; index >= 0; index -= 1) {
    const section = sections[index];
    if (section === undefined) continue;
    const next = sections[index + 1];
    const nextOffset =
      next === undefined ? null : addOffset(node.offset, next.offset);
    const stop =
      nextOffset === null
        ? node.stop
        : node.stop === null || compare(nextOffset, node.stop) < 0
          ? nextOffset
          : node.stop;
    const offset = addOffset(node.offset, section.offset);
    if (node.stop !== null && compare(offset, node.stop) >= 0)
      throw new SourceMapFormatFailure(
        "format",
        "Nested source-map section overlaps its enclosing boundary.",
      );
    pending.push({
      value: section.map,
      path: [...node.path, index],
      offset,
      stop,
    });
  }
};
