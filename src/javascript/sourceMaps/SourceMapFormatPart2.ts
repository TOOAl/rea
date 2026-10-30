import { z } from "zod";
import { WEB_SOURCE_MAP_LIMITS } from "../../domain/webSourceLocation.js";
import { sourceMapJsonText } from "../../domain/sourceMapEnvelope.js";

const inspectMappingLayout = (
  mappings: string,
  check?: () => void,
): { lines: number; segments: number } => {
  let lines = 1;
  let segments = 0;
  let components = 0;
  let inSegment = false;
  let continued = false;
  let digits = 0;
  const finish = (): void => {
    if (continued)
      throw new SourceMapFormatFailure(
        "format",
        "Source-map VLQ ends with an unfinished continuation.",
      );
    if (inSegment && ![1, 4, 5].includes(components))
      throw new SourceMapFormatFailure(
        "format",
        "Source-map segment requires one, four or five VLQ components.",
      );
  };
  let index = 0;
  for (const character of mappings) {
    if ((index++ & 0x3fff) === 0) check?.();
    if (character === "," || character === ";") {
      finish();
      inSegment = false;
      components = 0;
      if (character === ";") lines += 1;
    } else {
      digits += 1;
      if (
        (digits === 7 && !/[A-Dg-j]/u.test(character)) ||
        (digits > 7 && character !== "A" && character !== "g")
      )
        throw new SourceMapFormatFailure(
          "format",
          "Source-map VLQ exceeds the format's 32-bit quantity representation.",
        );
      if (!inSegment) segments += 1;
      inSegment = true;
      continued = /[g-z0-9+/]/u.test(character);
      if (!continued) {
        components += 1;
        digits = 0;
      }
    }
    if (
      segments > WEB_SOURCE_MAP_LIMITS.decodedSegments ||
      lines > WEB_SOURCE_MAP_LIMITS.decodedRows
    )
      throw new SourceMapFormatFailure(
        "limit",
        "Source-map layout exceeds the 262144 segment/generated-row decoder budget.",
      );
  }
  finish();
  return { lines, segments };
};

const inspectLeaf = (
  node: PendingMap,
  budget: { records: number },
  options: SourceMapStructureOptions,
): z.output<typeof leafSchema> => {
  options.check?.();
  consumeRecords(budget, 1);
  if (
    typeof node.value !== "object" ||
    node.value === null ||
    Array.isArray(node.value)
  )
    return leafSchema.parse(node.value);
  const rawMap = node.value as Readonly<Record<string, unknown>>;
  const rawSources = rawMap.sources;
  const rawNames = rawMap.names;
  const rawContents = rawMap.sourcesContent;
  consumeRecords(budget, Array.isArray(rawSources) ? rawSources.length : 0);
  consumeRecords(budget, Array.isArray(rawNames) ? rawNames.length : 0);
  consumeRecords(budget, Array.isArray(rawContents) ? rawContents.length : 0);
  options.check?.();
  const leaf = leafSchema.parse(node.value);
  const layout = inspectMappingLayout(leaf.mappings, options.check);
  consumeRecords(budget, layout.segments + layout.lines);
  if (
    layout.segments > WEB_SOURCE_MAP_LIMITS.decodedSegments ||
    node.offset.line + layout.lines > WEB_SOURCE_MAP_LIMITS.decodedRows
  )
    throw new SourceMapFormatFailure(
      "limit",
      "Source-map layout exceeds the 262144 segment/generated-row decoder budget.",
    );
  return leaf;
};

/** Validate structure before allocation, retaining raw declarations and section boundaries. */
export const inspectSourceMap = (
  text: string,
): ReturnType<typeof inspectSourceMapValue> => {
  const jsonText = sourceMapJsonText(text);
  const value: unknown = JSON.parse(jsonText);
  return inspectSourceMapValue(value);
};

/** Return validated leaves when a consumer needs decoded rows after preflight. */
export const inspectSourceMapValue = (
  value: unknown,
  options: SourceMapStructureOptions = {},
): {
  readonly format: "regular" | "indexed";
  readonly reportedFile: string | null;
  readonly declarations: readonly SourceMapSourceDeclaration[];
  readonly leaves: readonly SourceMapLeaf[];
} => {
  options.check?.();
  const root = mapHeaderSchema.parse(value);
  const declarations: SourceMapSourceDeclaration[] = [];
  const leaves: SourceMapLeaf[] = [];
  const pending: PendingMap[] = [
    { value, path: [], offset: { line: 0, column: 0 }, stop: null },
  ];
  const budget = options.budget ?? { records: 0 };
  while (pending.length > 0) {
    options.check?.();
    const node = pending.pop();
    if (node === undefined) break;
    if (node.path.length > WEB_SOURCE_MAP_LIMITS.sectionDepth)
      throw new SourceMapFormatFailure(
        "limit",
        "Indexed source-map nesting exceeds the 64-level decoder stack budget.",
      );
    if (mapHeaderSchema.parse(node.value).sections !== undefined) {
      addSections(node, pending, budget, options);
      continue;
    }
    const leaf = inspectLeaf(node, budget, options);
    leaves.push({
      map: leaf,
      codecMap: codecLeaf(leaf),
      offset: node.offset,
      stop: node.stop,
    });
    if (options.profile !== "browser-collection") {
      const ignoredSources = new Set(
        leaf.ignoreList ?? leaf.x_google_ignoreList ?? [],
      );
      for (const [sourceIndex, source] of leaf.sources.entries())
        declarations.push({
          sectionPath: node.path,
          sourceIndex,
          source,
          root: leaf.sourceRoot ?? null,
          content: leaf.sourcesContent?.[sourceIndex] ?? null,
          ignored: ignoredSources.has(sourceIndex),
        });
    }
  }
  return {
    format: root.sections === undefined ? "regular" : "indexed",
    reportedFile: root.file ?? null,
    declarations,
    leaves,
  };
};
