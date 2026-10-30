import { createHash } from "node:crypto";
import { basename } from "node:path";

import canonicalize from "canonicalize";

import { parseEvidence } from "../evidence.js";
import { functionDossierSchema } from "../hopperValues.js";
import { inspectMachoSchema } from "../native/nativeInspection.js";
import type { ManagedNativeBoundaryInspection } from "./managedArtifact.js";
import type { JsonValue } from "../jsonValue.js";
import {
  pinvokeVerificationSchema,
  type ManagedNativeVerificationInput,
  type ManagedNativeVerificationResult,
  type NativeSymbol,
  type PinvokeVerification,
} from "./managedNativeVerificationSchemas.js";

const digest = (value: JsonValue): string => {
  const serialized = canonicalize(value);
  if (serialized === undefined)
    throw new TypeError("Managed/native verification canonicalization failed");
  return createHash("sha256").update(serialized).digest("hex");
};

type PinvokeImport = ManagedNativeBoundaryInspection["pinvoke_imports"][number];
type VerifiedPinvoke = {
  readonly verification: PinvokeVerification;
};

const moduleName = (
  evidence: ReturnType<typeof parseEvidence>,
): string | null => evidence.subject?.name ?? null;

const modulePath = (
  evidence: ReturnType<typeof parseEvidence>,
): string | null => evidence.subject?.local_path ?? null;

const symbolsForEvidence = (
  evidence: ReturnType<typeof parseEvidence>,
): {
  readonly supported: boolean;
  readonly symbols: readonly NativeSymbol[];
} => {
  if (evidence.operation === "inspect_macho") {
    const result = inspectMachoSchema.parse(evidence.normalized_result);
    return {
      supported: true,
      symbols: result.exports.items.map((symbol) => ({
        evidence_id: evidence.evidence_id,
        operation: evidence.operation,
        name: symbol.name,
        address: symbol.address,
        module_name: moduleName(evidence),
        module_path: modulePath(evidence),
        source: "macho-export" as const,
      })),
    };
  }
  if (evidence.operation === "analyze_function") {
    const dossier = functionDossierSchema.parse(evidence.normalized_result);
    return {
      supported: true,
      symbols: [
        {
          evidence_id: evidence.evidence_id,
          operation: evidence.operation,
          name: dossier.procedure.name,
          address: dossier.procedure.address,
          module_name: moduleName(evidence),
          module_path: modulePath(evidence),
          source: "function-dossier" as const,
        },
      ],
    };
  }
  return { supported: false, symbols: [] };
};

export const collectNativeSymbols = (
  observations: readonly ManagedNativeVerificationInput["native_observations"][number][],
): {
  readonly symbols: readonly NativeSymbol[];
  readonly accepted: number;
  readonly unsupported: number;
} => {
  const symbols: NativeSymbol[] = [];
  let accepted = 0;
  let unsupported = 0;
  for (const raw of observations) {
    const evidence = parseEvidence(raw);
    const extracted = symbolsForEvidence(evidence);
    if (!extracted.supported) {
      unsupported += 1;
    } else {
      accepted += 1;
      symbols.push(...extracted.symbols);
    }
  }
  return { symbols, accepted, unsupported };
};

const sameSymbolName = (expected: string, native: NativeSymbol): boolean =>
  expected ===
  (native.source === "macho-export" && native.name.startsWith("_")
    ? native.name.slice(1)
    : native.name);

const normalizeModule = (value: string): string =>
  basename(value)
    .toLowerCase()
    .replace(/\.(dll|dylib|so|node|exe)$/u, "");

const nativeModuleIdentities = (value: string): ReadonlySet<string> => {
  const filename = basename(value).toLowerCase();
  const stem = normalizeModule(filename);
  const identities = new Set([stem]);
  if (/\.(dylib|so)$/u.test(filename) && stem.startsWith("lib"))
    identities.add(stem.slice("lib".length));
  return identities;
};

const moduleCompatible = (
  scope: string | null,
  symbol: NativeSymbol,
): boolean => {
  if (scope === null || scope.trim().length === 0) return false;
  const expected = normalizeModule(scope);
  return [symbol.module_name, symbol.module_path]
    .filter(
      (value): value is string =>
        value !== null && normalizeModule(value).length > 0,
    )
    .some((value) => nativeModuleIdentities(value).has(expected));
};

const hasModuleIdentity = (symbol: NativeSymbol): boolean =>
  [symbol.module_name, symbol.module_path].some(
    (value) => value !== null && normalizeModule(value).length > 0,
  );

const candidateNames = (
  managed: Pick<
    PinvokeImport,
    "import_name" | "char_set" | "call_convention" | "no_mangle"
  >,
): readonly string[] => {
  const names = new Set<string>([managed.import_name]);
  if (!managed.no_mangle) {
    if (managed.char_set === "unicode") names.add(`${managed.import_name}W`);
    if (managed.char_set === "ansi") names.add(`${managed.import_name}A`);
    if (managed.call_convention === "stdcall") {
      names.add(`_${managed.import_name}`);
      names.add(`_${managed.import_name}@0`);
    }
  }
  return [...names];
};

type PinvokeMatchField =
  | "status"
  | "basis"
  | "confidence"
  | "matched_native"
  | "candidates";
type PinvokeMatch<
  Verification extends PinvokeVerification = PinvokeVerification,
> = Verification extends PinvokeVerification
  ? Pick<Verification, PinvokeMatchField>
  : never;

interface PinvokeCandidateMatch {
  readonly match: PinvokeMatch;
}
