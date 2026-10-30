import { isIP } from "node:net";

import type { ProcessScenario } from "../../domain/process/processScenario.js";

import type { ProcessSample } from "../../domain/process/processCapture.js";

export type BoundedProcessTextNormalization =
  | {
      readonly state: "normalized";
      readonly value: string;
      readonly utf8Bytes: number;
    }
  | { readonly state: "over_budget" };

type RegexReplacement = (match: string, ...groups: string[]) => string;

type BoundedStageResult =
  | {
      readonly state: "bounded";
      readonly value: string;
      readonly utf8Bytes: number;
    }
  | { readonly state: "unchanged"; readonly value: string }
  | { readonly state: "over_budget" };

const createUtf8ByteCounter = (maxBytes: number) => {
  let bytes = 0;
  let pendingHighSurrogate = false;
  const addBytes = (added: number): void => {
    if (bytes > maxBytes || added > maxBytes - bytes) {
      bytes = Number.POSITIVE_INFINITY;
      return;
    }
    bytes += added;
  };
  return {
    add: (value: string): void => {
      if (bytes > maxBytes || value.length === 0) return;
      let index = 0;
      if (pendingHighSurrogate) {
        if (value.length > 0 && isLowSurrogate(value.charCodeAt(0))) {
          addBytes(4);
          index = 1;
        } else {
          addBytes(3);
        }
        pendingHighSurrogate = false;
      }
      for (; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code <= 0x7f) addBytes(1);
        else if (code <= 0x7ff) addBytes(2);
        else if (isHighSurrogate(code)) {
          if (index + 1 === value.length) {
            pendingHighSurrogate = true;
          } else if (isLowSurrogate(value.charCodeAt(index + 1))) {
            addBytes(4);
            index += 1;
          } else addBytes(3);
        } else addBytes(3);
        if (bytes > maxBytes) return;
      }
    },
    finish: (): number => {
      if (pendingHighSurrogate) addBytes(3);
      return bytes;
    },
  };
};

const isHighSurrogate = (code: number): boolean =>
  code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean =>
  code >= 0xdc00 && code <= 0xdfff;

const boundedRegexReplace = (
  value: string,
  matcher: RegExp,
  replacement: RegexReplacement,
  maxBytes: number,
): BoundedStageResult => {
  const byteCounter = createUtf8ByteCounter(maxBytes);
  let cursor = 0;
  let changed = false;
  matcher.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(value)) !== null) {
    const index = match.index;
    const matched = match[0] ?? "";
    const nextCursor = index + matched.length;
    const replacementValue = replacement(matched, ...match.slice(1));
    changed ||= replacementValue !== matched;
    byteCounter.add(value.slice(cursor, index));
    byteCounter.add(replacementValue);
    cursor = nextCursor;
  }
  byteCounter.add(value.slice(cursor));
  const bytes = byteCounter.finish();
  if (bytes > maxBytes) {
    return changed ? { state: "over_budget" } : { state: "unchanged", value };
  }
  if (!changed) return { state: "unchanged", value };
  matcher.lastIndex = 0;
  const normalized = value.replace(matcher, replacement);
  return {
    state: "bounded",
    value: normalized,
    utf8Bytes: bytes,
  };
};

const boundedLiteralReplace = (
  value: string,
  pattern: string,
  replacement: string,
  maxBytes: number,
): BoundedStageResult => {
  const byteCounter = createUtf8ByteCounter(maxBytes);
  let cursor = 0;
  if (pattern === "") {
    if (replacement === "") return { state: "unchanged", value };
    for (let index = 0; index < value.length; index += 1) {
      byteCounter.add(replacement);
      byteCounter.add(value.slice(index, index + 1));
    }
    byteCounter.add(replacement);
    const bytes = byteCounter.finish();
    if (bytes > maxBytes) return { state: "over_budget" };
    return {
      state: "bounded",
      value: value.replaceAll(pattern, () => replacement),
      utf8Bytes: bytes,
    };
  }
  if (pattern === replacement) return { state: "unchanged", value };

  let index = value.indexOf(pattern, cursor);
  if (index === -1) return { state: "unchanged", value };
  while (index !== -1) {
    byteCounter.add(value.slice(cursor, index));
    byteCounter.add(replacement);
    cursor = index + pattern.length;
    index = value.indexOf(pattern, cursor);
  }
  byteCounter.add(value.slice(cursor));
  const bytes = byteCounter.finish();
  if (bytes > maxBytes) return { state: "over_budget" };
  return {
    state: "bounded",
    value: value.replaceAll(pattern, () => replacement),
    utf8Bytes: bytes,
  };
};
