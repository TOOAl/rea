import {
  isMap,
  isNode,
  isScalar,
  isSeq,
  parseDocument,
  Document,
  Schema,
  type ParsedNode,
  type Node,
  type ScalarTag,
  type Tags,
} from "yaml";

const createHermesYamlOptions = () => {
  const timestamps = new Map<string, HermesTimestampFacts | undefined>();
  const timestampFacts = (source: string): HermesTimestampFacts | undefined => {
    if (timestamps.has(source)) return timestamps.get(source);
    const facts = parseHermesTimestamp(source);
    timestamps.set(source, facts);
    return facts;
  };
  const hermesTimestampTag: ScalarTag = {
    ...timestampTag,
    test: hermesTimestampImplicit,
    resolve: (source) => {
      const facts = timestampFacts(source);
      if (facts === undefined)
        throw new Error(`Invalid Hermes YAML timestamp: ${source}`);
      return facts.value;
    },
  };
  const keyFacts = new WeakMap<object, HermesKey>();
  const hermesKey = (node: ParsedNode): HermesKey => {
    const cached = keyFacts.get(node);
    if (cached !== undefined) return cached;
    if (!isScalar(node)) return { kind: "other", value: node };
    const numeric = numericValue(node.value);
    const key =
      numeric !== undefined
        ? { kind: "numeric" as const, value: numeric }
        : node.value instanceof Date
          ? {
              kind: "timestamp" as const,
              value:
                timestampFacts(node.source ?? "")?.key ??
                `invalid:${node.source ?? ""}`,
            }
          : { kind: "other" as const, value: node.value };
    keyFacts.set(node, key);
    return key;
  };
  /** Python dict key equality is Hermes' duplicate-key behavior (bool is int). */
  const hermesKeysEqual = (
    leftNode: ParsedNode,
    rightNode: ParsedNode,
  ): boolean => {
    const left = hermesKey(leftNode);
    const right = hermesKey(rightNode);
    if (left.kind !== right.kind) return false;
    if (left.kind === "numeric" && right.kind === "numeric")
      return numericValuesEqual(left.value, right.value);
    return left.value === right.value;
  };
  return {
    // Hermes defaults to YAML 1.1; an explicit document directive still wins.
    // Use the same schema to interpret existing values and quote new strings.
    version: "1.1" as const,
    // Keep integer key identity exact; parseHermesConfigurationYaml's reviver
    // restores the existing number-valued consumer contract.
    intAsBigInt: true,
    customTags: (tags: Tags) => {
      const hasTimestamp = tags.some(
        (tag) => typeof tag !== "string" && tag.tag === timestampTag.tag,
      );
      const withHermesTimestamp = hasTimestamp
        ? tags.map((tag) =>
            typeof tag !== "string" && tag.tag === timestampTag.tag
              ? hermesTimestampTag
              : tag,
          )
        : [...tags, hermesTimestampTag];
      return withHermesTimestamp.map(keepScalarSource);
    },
    uniqueKeys: hermesKeysEqual,
  };
};

/** Create a Hermes config using the same scalar rules as edits and readback. */
export const stringifyHermesConfigurationYaml = (
  document: Record<string, unknown>,
): string =>
  new Document(document, createHermesYamlOptions()).toString({ lineWidth: 0 });

// A comment-only document has no root; a bare marker has an unwritten null
// scalar. Explicit null values, tags and anchors remain actual values.
const isEmptyYamlRoot = (root: Document["contents"]): boolean =>
  root === null ||
  (isScalar(root) &&
    root.value === null &&
    root.source === "" &&
    root.tag === undefined &&
    root.anchor === undefined);

const parseHermesDocument = (text: string) => {
  const document = parseDocument(text, createHermesYamlOptions());
  const error = document.errors[0];
  if (error !== undefined) throw error;
  return document;
};

/** Parse a Hermes `config.yaml`, preserving the distinction between no root and explicit null. */
export const parseHermesConfigurationYaml = (text: string): unknown => {
  const document = parseHermesDocument(text);
  return isEmptyYamlRoot(document.contents)
    ? {}
    : document.toJS({
        reviver: (_key, value) =>
          typeof value === "bigint" ? Number(value) : value,
      });
};

/** Keep unchanged scalar nodes, including their quoting and explicit tags. */
const retainHermesScalarSource = (previous: unknown, next: Node): Node => {
  if (isScalar(previous) && isScalar(next) && previous.value === next.value)
    return previous;
  if (isMap(previous) && isMap(next)) {
    const entries = new Map(
      previous.items.flatMap((pair) =>
        isScalar(pair.key) && typeof pair.key.value === "string"
          ? [[pair.key.value, pair] as const]
          : [],
      ),
    );
    for (const pair of next.items) {
      const key = isScalar(pair.key) ? pair.key.value : undefined;
      const prior = typeof key === "string" ? entries.get(key) : undefined;
      if (prior === undefined) continue;
      pair.key = prior.key;
      if (isNode(pair.value))
        pair.value = retainHermesScalarSource(prior.value, pair.value);
    }
  } else if (isSeq(previous) && isSeq(next)) {
    next.items = next.items.map((item, index) =>
      isNode(item)
        ? retainHermesScalarSource(previous.items[index], item)
        : item,
    );
  }
  return next;
};

/** Set or delete one value in a Hermes `config.yaml`, keeping the rest as written. */
export const editHermesConfigurationYaml = (
  text: string,
  path: readonly string[],
  value: unknown,
): string => {
  // A plain Document, so a bare `---` root can be replaced by a new map.
  const document: Document = parseHermesDocument(text);
  const root = document.contents;
  if (isEmptyYamlRoot(root)) {
    const map = document.createNode({});
    if (isScalar(root))
      map.commentBefore = [root.commentBefore, root.comment]
        .filter((comment) => comment !== undefined)
        .join("\n");
    document.contents = map;
  }
  if (value === undefined) document.deleteIn(path);
  else {
    // setIn's implicit JS Map parents serialize as !!omap in YAML 1.1.
    // Config settings are ordinary mappings, including absent server tables.
    for (let length = 1; length < path.length; length++) {
      const parent = path.slice(0, length);
      if (!document.hasIn(parent))
        document.setIn(parent, document.createNode({}));
    }
    const previous = document.getIn(path, true);
    // Let YAML's scalar update preserve numeric formats for a direct edit.
    // Replacing containers needs explicit retention of unchanged child nodes.
    document.setIn(
      path,
      isMap(previous) || isSeq(previous)
        ? retainHermesScalarSource(previous, document.createNode(value))
        : value,
    );
  }
  // Editing REA must not reflow unrelated user prompts or other YAML scalars.
  return document.toString({
    lineWidth: 0,
    // Hermes tries the YAML 1.1 C loader before its directive-aware pure
    // fallback. Quote new strings to avoid introducing YAML 1.1 coercions.
    ...(document.directives?.yaml.version === "1.2"
      ? {
          defaultStringType: "QUOTE_DOUBLE" as const,
          defaultKeyType: "QUOTE_DOUBLE" as const,
        }
      : {}),
  });
};
