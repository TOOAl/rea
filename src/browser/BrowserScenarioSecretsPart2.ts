import { createHash } from "node:crypto";

import type { BrowserScenario } from "../domain/browserScenario.js";
import type {
  BrowserScenarioUrl,
  BrowserScenarioValue,
} from "../domain/browserScenarioValues.js";
import {
  sanitizeBrowserUrl,
  type SanitizedBrowserUrl,
} from "../domain/browserObservation.js";
import type { BrowserStorageValueFingerprint } from "../domain/browserScenarioCaptureValues.js";

const secretNeedles = (
  replacements: readonly SecretReplacement[],
  patterns: readonly SecretPattern[],
): SecretNeedle[] =>
  replacements.map((pattern) => ({
    id: pattern.id,
    needle: Buffer.from(pattern.searchText),
    percentInsensitive: pattern.percentInsensitive,
    marker: Buffer.from(redactionMarker(pattern.id, patterns)),
  }));

/** Resolved secret values kept only for one in-memory scenario session. */
export class BrowserScenarioSecrets {
  private readonly urlPatterns: readonly SecretPattern[];
  private readonly textPatterns: readonly SecretPattern[];
  private readonly urlReplacements: readonly SecretReplacement[];
  private readonly textReplacements: readonly SecretReplacement[];
  private readonly textNeedles: readonly SecretNeedle[];
  private readonly redactionCostPerCharacter: number;

  private constructor(private readonly values: ReadonlyMap<string, string>) {
    this.urlPatterns = declaredPatterns(values, "url");
    this.textPatterns = declaredPatterns(values, "text");
    this.urlReplacements = secretReplacements(values, "url");
    this.textReplacements = secretReplacements(values, "text");
    this.textNeedles = secretNeedles(this.textReplacements, this.textPatterns);
    this.redactionCostPerCharacter = 8;
    for (const [replacements, patterns] of [
      [this.textReplacements, this.textPatterns],
      [this.urlReplacements, this.urlPatterns],
    ] as const)
      for (const replacement of replacements)
        this.redactionCostPerCharacter = Math.max(
          this.redactionCostPerCharacter,
          8 +
            (Buffer.byteLength(redactionMarker(replacement.id, patterns)) * 8 +
              128) /
              replacement.text.length,
        );
  }

  static resolve(
    scenario: BrowserScenario,
    environment: Readonly<Record<string, string | undefined>>,
  ): BrowserScenarioSecrets | undefined {
    const values = new Map<string, string>();
    for (const declaration of scenario.secrets) {
      const value = environment[declaration.environment_variable];
      if (
        !Object.hasOwn(environment, declaration.environment_variable) ||
        typeof value !== "string"
      )
        return undefined;
      values.set(declaration.secret_id, value);
    }
    return new BrowserScenarioSecrets(values);
  }

  value(source: BrowserScenarioValue): string {
    if (source.source === "literal") return source.value;
    const value = this.values.get(source.secret_id);
    if (value === undefined)
      throw new Error("Validated browser secret was not resolved");
    return value;
  }

  url(destination: BrowserScenarioUrl): string {
    const url = new URL(destination.url);
    for (const { name, value } of destination.query)
      url.searchParams.append(name, this.value(value));
    return url.href;
  }

  /** Conservative preflight for output expansion and per-match part arrays.
   * Callers measuring untrusted observations must reserve this cost before
   * invoking redaction. A one-byte secret can otherwise expand every byte.
   */
  redactionAllocationCost(length: number): number {
    return Math.ceil(length * this.redactionCostPerCharacter);
  }

  redact(value: string): string {
    const patterns = this.textPatterns;
    if (patterns.length === 0) return value;
    const output = replaceSecretLiterals(
      value,
      this.textReplacements,
      patterns,
    );
    return containsSecretPattern(
      output,
      normalizePercentEscapes(output),
      patterns,
    )
      ? ""
      : output;
  }

  /** Replace declared UTF-8, URI/form, and JSON-escaped secret spellings. */
  redactBytes(value: Buffer): Buffer {
    const patterns = this.textPatterns;
    if (patterns.length === 0) return value;
    const candidates = this.textNeedles;
    const hasPercentPatterns = candidates.some(
      ({ percentInsensitive }) => percentInsensitive,
    );
    const normalizedValue =
      hasPercentPatterns && value.indexOf(37) >= 0
        ? normalizePercentEscapesBytes(value)
        : value;
    const sortedCandidates = candidates
      .map((candidate) => ({
        ...candidate,
        index: (candidate.percentInsensitive ? normalizedValue : value).indexOf(
          candidate.needle,
        ),
      }))
      .sort(
        (left, right) =>
          right.needle.length - left.needle.length ||
          (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
      );
    const parts: Buffer[] = [];
    let offset = 0;
    while (true) {
      let next: (typeof sortedCandidates)[number] | undefined;
      for (const candidate of sortedCandidates) {
        if (candidate.index >= 0 && candidate.index < offset)
          candidate.index = (
            candidate.percentInsensitive ? normalizedValue : value
          ).indexOf(candidate.needle, offset);
        if (
          candidate.index >= 0 &&
          (next === undefined ||
            candidate.index < next.index ||
            (candidate.index === next.index &&
              candidate.needle.length > next.needle.length))
        )
          next = candidate;
      }
      if (next === undefined) break;
      parts.push(value.subarray(offset, next.index), next.marker);
      offset = next.index + next.needle.length;
    }
    if (parts.length === 0) return value;
    parts.push(value.subarray(offset));
    const redacted = Buffer.concat(parts);
    const normalizedRedacted =
      hasPercentPatterns && redacted.indexOf(37) >= 0
        ? normalizePercentEscapesBytes(redacted)
        : redacted;
    return containsSecretBytePattern(redacted, normalizedRedacted, candidates)
      ? Buffer.alloc(0)
      : redacted;
  }

  /** Remove only declared secret values from one URL and report that action. */
  sanitizeUrl(value: string): SanitizedBrowserUrl {
    const patterns = this.urlPatterns;
    if (patterns.length === 0) return sanitizeBrowserUrl(value);
    const output = replaceSecretLiterals(value, this.urlReplacements, patterns);
    if (
      containsSecretPattern(output, normalizePercentEscapes(output), patterns)
    )
      return {
        url: "",
        origin: null,
        query_parameter_names: [],
        redacted: true,
      };
    const sanitized = sanitizeBrowserUrl(output);
    return {
      ...sanitized,
      redacted: sanitized.redacted || output !== value,
    };
  }

  fingerprint(value: string): BrowserStorageValueFingerprint {
    const patterns = this.textPatterns;
    if (
      patterns.length > 0 &&
      containsSecretPattern(value, normalizePercentEscapes(value), patterns)
    )
      return { value_state: "redacted-secret", value_sha256: null };
    return {
      value_state: "hashed",
      value_sha256: createHash("sha256").update(value).digest("hex"),
    };
  }
}
