import {
  admitManagedProjection,
  managedDecodeBudget,
} from "./ManagedDecodeBudget.js";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import {
  managedNativeBoundaryInspectionSchema,
  type ManagedNativeBoundaryInspection,
  type ManagedParseIssue,
} from "../domain/managed/managedArtifact.js";
import type { ManagedMetadataLayout } from "./ManagedMetadataLayout.js";
import {
  metadataRowCursor,
  metadataCodedToken,
  metadataCodedTokenInvalidReason,
  metadataToken,
  readMetadataString,
} from "./ManagedMetadataHeaps.js";
import { managedTableRowCounts } from "./ManagedMetadataInventory.js";
import type { ManagedMetadataInventory } from "./ManagedMetadataInventory.js";
import {
  managedCli32BitRequirement,
  managedCliIsMixedClrNative,
  type ManagedCliHeader,
  type ManagedPeLayout,
} from "./ManagedPeReader.js";
import { readManagedValue } from "./ManagedReaderFailure.js";

type ModuleRef = ManagedNativeBoundaryInspection["module_refs"][number];
type NativeImport = ManagedNativeBoundaryInspection["pinvoke_imports"][number];
type NativeImplementation =
  ManagedNativeBoundaryInspection["native_implementations"][number];

interface MemberCore {
  readonly token: string;
  readonly rowOffset: number;
  readonly kind: NativeImport["member_kind"];
  readonly name: string;
  readonly flags: number;
  readonly implFlags: number | null;
  readonly rva: number | null;
}

const flagsHex = (value: number): string =>
  `0x${value.toString(16).padStart(4, "0")}`;

const charSet = (flags: number): NativeImport["char_set"] => {
  switch (flags & 0x0006) {
    case 0x0000:
      return "not-specified";
    case 0x0002:
      return "ansi";
    case 0x0004:
      return "unicode";
    case 0x0006:
      return "auto";
    default:
      return "unknown";
  }
};

const callConvention = (flags: number): NativeImport["call_convention"] => {
  switch (flags & 0x0700) {
    case 0x0000:
      return "not-specified";
    case 0x0100:
      return "winapi";
    case 0x0200:
      return "cdecl";
    case 0x0300:
      return "stdcall";
    case 0x0400:
      return "thiscall";
    case 0x0500:
      return "fastcall";
    default:
      return "unknown";
  }
};

const bestFit = (flags: number): NativeImport["best_fit"] => {
  switch (flags & 0x0030) {
    case 0x0000:
      return "assembly-default";
    case 0x0010:
      return "enabled";
    case 0x0020:
      return "disabled";
    default:
      return "unknown";
  }
};

const throwOnUnmappable = (
  flags: number,
): NativeImport["throw_on_unmappable_char"] => {
  switch (flags & 0x3000) {
    case 0x0000:
      return "assembly-default";
    case 0x1000:
      return "enabled";
    case 0x2000:
      return "disabled";
    default:
      return "unknown";
  }
};

export const nativeImplementations = (
  methods: Iterable<MemberCore>,
  pinvokeTokens: ReadonlySet<string>,
): readonly NativeImplementation[] => {
  const implementations: NativeImplementation[] = [];
  for (const method of methods) {
    if (method.kind !== "method") continue;
    const implFlags = method.implFlags ?? 0;
    const codeType = codeTypeFor(implFlags);
    const managedKind = managedKindFor(implFlags);
    const pinvokeDeclared =
      pinvokeTokens.has(method.token) || (method.flags & 0x2000) !== 0;
    if (!pinvokeDeclared && codeType === "il" && managedKind === "managed")
      continue;
    implementations.push({
      token: method.token,
      row_offset: method.rowOffset,
      name: method.name,
      rva: method.rva ?? 0,
      flags: method.flags,
      impl_flags: implFlags,
      code_type: codeType,
      managed_kind: managedKind,
      pinvoke_declared: pinvokeDeclared,
      boundary_kind: boundaryKind(pinvokeDeclared, codeType, managedKind),
      body_interpretation:
        codeType === "il" && managedKind === "managed" && !pinvokeDeclared
          ? "managed-cil"
          : method.rva === 0
            ? "not-file-backed"
            : "native-or-runtime",
    });
  }
  return implementations;
};

const codeTypeFor = (implFlags: number): NativeImplementation["code_type"] => {
  switch (implFlags & 0x0003) {
    case 0x0000:
      return "il";
    case 0x0001:
      return "native";
    case 0x0002:
      return "optil";
    case 0x0003:
      return "runtime";
    default:
      return "unknown";
  }
};

const managedKindFor = (
  implFlags: number,
): NativeImplementation["managed_kind"] => {
  switch (implFlags & 0x0004) {
    case 0x0000:
      return "managed";
    case 0x0004:
      return "unmanaged";
    default:
      return "unknown";
  }
};

const boundaryKind = (
  pinvokeDeclared: boolean,
  codeType: NativeImplementation["code_type"],
  managedKind: NativeImplementation["managed_kind"],
): NativeImplementation["boundary_kind"] => {
  if (pinvokeDeclared) return "pinvoke";
  if (codeType === "native") return "native-body";
  if (codeType === "runtime") return "runtime-provided";
  if (managedKind === "unmanaged") return "unmanaged-method";
  return "mixed-or-unknown";
};

export const cliNative = (
  cli: ManagedCliHeader | null,
): ManagedNativeBoundaryInspection["cli_native"] => {
  if (cli === null) return null;
  return {
    il_only: (cli.flags & 0x0000_0001) !== 0,
    requires_32bit: managedCli32BitRequirement(cli.flags) === "required",
    strong_name_signed: (cli.flags & 0x0000_0008) !== 0,
    native_entry_point: (cli.flags & 0x0000_0010) !== 0,
    ready_to_run_signature: cli.readyToRunSignature,
    managed_native_header_rva: cli.managedNativeHeader.rva,
    managed_native_header_size: cli.managedNativeHeader.size,
  };
};

/** Summarize declaration counts with the native facets of the CLI header. */
export const nativeBoundarySummary = (
  cli: ManagedCliHeader | null,
  counts: Pick<
    ManagedNativeBoundaryInspection["summary"],
    "module_ref_count" | "pinvoke_import_count" | "native_implementation_count"
  >,
): ManagedNativeBoundaryInspection["summary"] => ({
  ...counts,
  ready_to_run: cli?.readyToRunSignature ?? null,
  mixed_mode_or_native_header:
    cli === null
      ? null
      : managedCliIsMixedClrNative(cli) ||
        cli.managedNativeHeader.rva !== 0 ||
        cli.managedNativeHeader.size !== 0 ||
        (cli.flags & 0x0000_0010) !== 0,
});

interface BoundaryInspectionContext {
  readonly target: BinaryTarget;
  readonly bytes: Buffer;
  readonly pe: ManagedPeLayout;
  readonly layout: ManagedMetadataLayout;
  readonly inventory: ManagedMetadataInventory;
  readonly moduleRefs: readonly ModuleRef[];
  readonly imports: readonly NativeImport[];
  readonly implementations: readonly NativeImplementation[];
  readonly issues: readonly ManagedParseIssue[];
}

export const buildNativeBoundaryInspection = ({
  target,
  bytes,
  pe,
  layout,
  inventory,
  moduleRefs,
  imports,
  implementations,
  issues,
}: BoundaryInspectionContext): ManagedNativeBoundaryInspection =>
  managedNativeBoundaryInspectionSchema.parse(
    admitManagedProjection(
      {
        artifact: {
          path: target.path,
          sha256: target.sha256,
          byte_length: bytes.length,
          format: "pe",
        },
        module: inventory.module,
        metadata: {
          status: issues.length === 0 ? "complete" : "partial",
          version: layout.version,
          table_row_counts: managedTableRowCounts(layout),
        },
        identity_scope: {
          token_identity: "build-local",
          requires_artifact_sha256: target.sha256,
          requires_mvid: inventory.module?.mvid ?? null,
        },
        cli_native: cliNative(pe.cli),
        module_refs: moduleRefs,
        pinvoke_imports: imports,
        native_implementations: implementations,
        summary: nativeBoundarySummary(pe.cli, {
          module_ref_count: moduleRefs.length,
          pinvoke_import_count: imports.length,
          native_implementation_count: implementations.length,
        }),
        coverage: {
          state: issues.length === 0 ? "complete" : "partial",
          issues,
        },
        limitations: [
          "P/Invoke rows prove managed import declarations only; this inspection does not verify that a native library, export, thunk, or provider-qualified function exists.",
          "Managed metadata tokens are build-local coordinates and are only meaningful with the reported artifact SHA-256 and MVID.",
          "ReadyToRun, NativeAOT, C++/CLI, and IL2CPP native semantics require separately selected native-provider evidence; this tool does not translate managed tokens into native addresses.",
        ],
      },
      managedDecodeBudget(layout),
    ),
  );
