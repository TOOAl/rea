const REDACTION_PREFIX = "[REDACTED:";

const encodedSecretValues = (secret: string): ReadonlySet<string> =>
  new Set([
    encodeURIComponent(secret),
    new URLSearchParams([["value", secret]]).toString().slice("value=".length),
  ]);

type SecretSpellings = "url" | "text";
interface SecretPattern {
  readonly text: string;
  readonly searchText: string;
  readonly percentInsensitive: boolean;
}
interface SecretReplacement extends SecretPattern {
  readonly id: string;
}
interface SecretNeedle {
  readonly id: string;
  readonly needle: Buffer;
  readonly percentInsensitive: boolean;
  readonly marker: Buffer;
}

const normalizePercentEscapes = (value: string): string => {
  if (!value.includes("%")) return value;
  return value.replace(/%[0-9a-f]{2}/giu, (escape) => escape.toLowerCase());
};

const secretPatterns = (
  secret: string,
  spellings: SecretSpellings,
): readonly SecretPattern[] => {
  if (secret === "") return [];
  const patterns: SecretPattern[] = [
    { text: secret, searchText: secret, percentInsensitive: false },
    ...[...encodedSecretValues(secret)].map((text) => ({
      text,
      searchText: normalizePercentEscapes(text),
      percentInsensitive: true,
    })),
  ];
  if (spellings === "text")
    patterns.push({
      text: JSON.stringify(secret).slice(1, -1),
      searchText: JSON.stringify(secret).slice(1, -1),
      percentInsensitive: false,
    });
  const seen = new Set<string>();
  return patterns.filter(({ text, percentInsensitive }) => {
    if (text === "") return false;
    const key = `${percentInsensitive ? "percent" : "literal"}:${text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const declaredPatterns = (
  values: ReadonlyMap<string, string>,
  spellings: SecretSpellings,
): readonly SecretPattern[] => {
  const seen = new Set<string>();
  return [...values.values()]
    .flatMap((secret) => secretPatterns(secret, spellings))
    .filter(({ text, percentInsensitive }) => {
      const key = `${percentInsensitive ? "percent" : "literal"}:${text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const secretReplacements = (
  values: ReadonlyMap<string, string>,
  spellings: SecretSpellings,
): readonly SecretReplacement[] =>
  [...values]
    .flatMap(([id, secret]) =>
      secretPatterns(secret, spellings).map((pattern) => ({ id, ...pattern })),
    )
    .sort(
      (left, right) =>
        right.text.length - left.text.length ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    );

const normalizePercentEscapesBytes = (value: Buffer): Buffer => {
  if (value.indexOf(37) < 0) return value;
  const normalized = Buffer.from(value);
  for (let index = 0; index + 2 < normalized.length; index += 1)
    if (
      normalized[index] === 37 &&
      isHexByte(normalized[index + 1]) &&
      isHexByte(normalized[index + 2])
    ) {
      normalized[index + 1] = lowercaseHexByte(normalized[index + 1]!);
      normalized[index + 2] = lowercaseHexByte(normalized[index + 2]!);
      index += 2;
    }
  return normalized;
};

const isHexByte = (value: number | undefined): boolean =>
  value !== undefined &&
  ((value >= 48 && value <= 57) ||
    (value >= 65 && value <= 70) ||
    (value >= 97 && value <= 102));

const lowercaseHexByte = (value: number): number =>
  value >= 65 && value <= 70 ? value + 32 : value;

const patternMatches = (
  value: string,
  normalizedValue: string,
  pattern: SecretPattern,
): boolean =>
  (pattern.percentInsensitive ? normalizedValue : value).includes(
    pattern.searchText,
  );

const containsSecretPattern = (
  value: string,
  normalizedValue: string,
  patterns: readonly SecretPattern[],
): boolean => {
  if (patterns.length === 0) return false;
  return patterns.some((pattern) =>
    patternMatches(value, normalizedValue, pattern),
  );
};

const containsSecretBytePattern = (
  value: Buffer,
  normalizedValue: Buffer,
  needles: readonly SecretNeedle[],
): boolean =>
  needles.some((needle) =>
    (needle.percentInsensitive ? normalizedValue : value).includes(
      needle.needle,
    ),
  );

/** Pick a marker that does not itself contain a declared secret spelling. */
const redactionMarker = (
  id: string,
  patterns: readonly SecretPattern[],
): string => {
  const candidates = [`${REDACTION_PREFIX}${id}]`, "[REDACTED]", "…", ""];
  return (
    candidates.find((candidate) =>
      patterns.every(
        (pattern) =>
          !patternMatches(
            candidate,
            normalizePercentEscapes(candidate),
            pattern,
          ),
      ),
    ) ?? ""
  );
};

const replaceSecretLiterals = (
  value: string,
  replacements: readonly SecretReplacement[],
  patterns: readonly SecretPattern[],
): string => {
  const normalizedValue = replacements.some(
    ({ percentInsensitive }) => percentInsensitive,
  )
    ? normalizePercentEscapes(value)
    : value;
  const parts: string[] = [];
  let offset = 0;
  while (offset < value.length) {
    let next:
      | ((typeof replacements)[number] & { readonly index: number })
      | undefined;
    for (const replacement of replacements) {
      const search = replacement.searchText;
      const view = replacement.percentInsensitive ? normalizedValue : value;
      const index = view.indexOf(search, offset);
      if (
        index >= 0 &&
        (next === undefined ||
          index < next.index ||
          (index === next.index && replacement.text.length > next.text.length))
      )
        next = { ...replacement, index };
    }
    if (next === undefined) break;
    const marker = redactionMarker(next.id, patterns);
    parts.push(value.slice(offset, next.index), marker);
    offset = next.index + next.text.length;
  }
  if (parts.length === 0) return value;
  parts.push(value.slice(offset));
  return parts.join("");
};
