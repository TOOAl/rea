import type { GhidraLanguageOverride } from "../config/ghidraLanguageOverride.js";
import type {
  BinaryTarget,
  MipsElfMetadata,
} from "../domain/binaryTargetTypes.js";
import type { JsonValue } from "../domain/jsonValue.js";

export const isLegacyMipsAdmission = (target: BinaryTarget): boolean =>
  hasLegacyMipsHeaderShape(target) &&
  ghidraMipsUnsupportedReason(target) === null;

/** Soft-float prototype policy applied by ReaGhidraMipsSoftFloat.java after analysis. */
export const GHIDRA_MIPS_SOFT_FLOAT_STORAGE = "o32-soft-float-prototype-v1";

/** Whether the admitted target declares the soft-float o32 ABI. */
export const isGhidraMipsSoftFloatTarget = (target: BinaryTarget): boolean =>
  target.kind === "executable" &&
  target.architecture === "mips" &&
  target.mips?.abiFlags?.cpr1Size === 0 &&
  target.mips.abiFlags.fpAbi === MIPS_FP_ABI_SOFT;

/** Prototype outcome the post-analysis script records for the bridge handshake. */
export interface GhidraMipsSoftFloatReport {
  readonly policy: typeof GHIDRA_MIPS_SOFT_FLOAT_STORAGE;
  readonly functions: number;
  readonly definitions: number;
}

/** Fail closed unless soft-float storage ran exactly for soft-float targets. */
export const ghidraMipsSoftFloatFailure = (
  expected: boolean,
  report: GhidraMipsSoftFloatReport | undefined,
): string | undefined =>
  expected === (report !== undefined)
    ? undefined
    : expected
      ? "The Ghidra session did not report the committed MIPS soft-float prototype."
      : "The Ghidra session reported MIPS soft-float storage that the profile did not commit.";

/** Keep REA's soft-float prototype distinct from Ghidra's hard-float o32 model. */
export const ghidraMipsSoftFloatLimitations = (
  expected: boolean,
  report?: GhidraMipsSoftFloatReport,
): readonly string[] =>
  expected
    ? [
        "Soft-float o32: Ghidra's MIPS32 compiler specifications model hard-float o32 only. After analysis REA installs a program-specific `__rea_soft_float` prototype, derived from the default o32 model without its floating-point registers and rules, and assigns it to every function, external function and function-pointer definition whose declared types use float or double, so those values keep their types and use integer registers and stack slots.",
        ...(report === undefined
          ? []
          : [
              `Soft-float prototype outcome: ${report.functions} functions and ${report.definitions} function-pointer definitions use __rea_soft_float.`,
            ]),
      ]
    : [];

/** Ghidra-placed relocatable objects need coordinates and relocation caveats. */
export const ghidraMipsRelocatableLimitations = (
  target: BinaryTarget,
): readonly string[] =>
  target.kind === "executable" &&
  target.architecture === "mips" &&
  target.mips?.type === MIPS_ET_REL
    ? [
        "Relocatable MIPS ELF: Ghidra assigns each allocated section an analysis address and applies the object's relocations there. Returned addresses are analysis coordinates, not the addresses a kernel or linker would choose at load time.",
        "Undefined symbols (for example kernel exports used by a module) are placed in Ghidra's EXTERNAL block; their definitions are outside this artifact. inspect_native_load_image reports each relocation with Ghidra's status; HI16 entries report PARTIAL because Ghidra applies them together with their paired LO16.",
      ]
    : [];

/** Shared-image results are analysis observations, not dynamic-loader execution. */
export const ghidraMipsSharedLimitations = (
  target: BinaryTarget,
): readonly string[] =>
  isGhidraMips16SharedTarget(target) && target.architecture === "mips"
    ? [
        "MIPS16 shared ELF: the endian-matched generic MIPS32 language uses the provider's per-address ISA_MODE context. The program language variant is not the instruction's encoding mode.",
        "Shared-image addresses are Ghidra analysis coordinates, not runtime addresses. The source bytes remain unchanged; inspect_native_load_image retains original relocation bytes, loaded memory bytes and provider relocation status. External GOT bindings remain unverified without their defining images.",
        ...(target.mips.abiFlags === null
          ? [
              "No MIPS ABI flags record was found in the completely examined declaration tables. The header declares o32 but does not establish the floating-point ABI; the default compiler specification does not verify floating-point argument or return storage.",
            ]
          : []),
      ]
    : [];

/** Commit source ELF interpretation without confusing target ISA with host CPU. */
export const ghidraMipsProfileParameters = (
  target: BinaryTarget,
  languageOverride?: GhidraLanguageOverride,
): Readonly<Record<string, JsonValue>> => {
  if (
    target.kind !== "executable" ||
    target.architecture !== "mips" ||
    target.mips === undefined
  )
    return {};
  const abi = target.mips.abiFlags;
  // A deliberate caller-selected language wins over the legacy pin; the pin
  // exists because header auto-selection misselects a 64-bit language.
  const legacy = isLegacyMipsAdmission(target);
  const language = ghidraMipsLanguageOverride(target);
  const pinnedLanguage =
    legacy && languageOverride === undefined && language !== undefined
      ? {
          language_id: language.languageId,
          compiler_spec_id: language.compilerSpecId ?? "default",
          language_selection: "provider-pinned-v1",
        }
      : {};
  return {
    mips_elf: {
      elf_class: target.mips.elfClass,
      byte_order: target.mips.byteOrder,
      type: target.mips.type,
      flags: target.mips.flags,
      ...(target.mips.limitations === undefined
        ? {}
        : { abi_flags_limitations: [...target.mips.limitations] }),
      abi_flags:
        abi === undefined || abi === null
          ? null
          : {
              version: abi.version,
              isa_level: abi.isaLevel,
              isa_revision: abi.isaRevision,
              gpr_size: abi.gprSize,
              cpr1_size: abi.cpr1Size,
              cpr2_size: abi.cpr2Size,
              fp_abi: abi.fpAbi,
              isa_extension: abi.isaExtension,
              ases: abi.ases,
              flags1: abi.flags1,
              flags2: abi.flags2,
            },
      ...(target.mips.gnuAttributes === undefined
        ? {}
        : {
            gnu_attributes:
              target.mips.gnuAttributes === null
                ? null
                : {
                    fp_abi: target.mips.gnuAttributes.fpAbi,
                    msa: target.mips.gnuAttributes.msa,
                  },
          }),
      ...(target.mips.sharedLoad === undefined
        ? {}
        : {
            shared_load:
              target.mips.sharedLoad.status === "complete"
                ? {
                    status: "complete",
                    relocation_count: target.mips.sharedLoad.relocationCount,
                    relocation_types: [
                      ...target.mips.sharedLoad.relocationTypes,
                    ],
                    symbol_relative_count:
                      target.mips.sharedLoad.symbolRelativeCount,
                  }
                : {
                    status: "unavailable",
                    reason: target.mips.sharedLoad.reason,
                  },
          }),
    },
    ...(isGhidraMipsSoftFloatTarget(target)
      ? { mips_soft_float_storage: GHIDRA_MIPS_SOFT_FLOAT_STORAGE }
      : {}),
    instruction_context_evidence: "per-address-isa-mode-v1",
    mips_support_lane: legacy
      ? "elf32-exec-arch32-legacy-pinned-v1"
      : isGhidraMips16SharedTarget(target)
        ? "elf32-dyn-o32-arch32r2-mips16-local-rel32-v1"
        : target.mips.type === MIPS_ET_REL
          ? "elf32-rel-o32-arch32r2-standard-v1"
          : "elf32-exec-o32-arch32r2-standard-v3",
    ...(legacy ? { mips_abi_basis: "inferred-o32-assumption-v1" } : {}),
    ...pinnedLanguage,
  };
};

/** Read the provider-pinned import language back from a resolved legacy profile. */
export const ghidraPinnedMipsLanguage = (
  parameters: Readonly<Record<string, unknown>>,
): GhidraLanguageOverride | undefined => {
  if (parameters.language_selection !== "provider-pinned-v1") return undefined;
  const languageId = parameters.language_id;
  const compilerSpecId = parameters.compiler_spec_id;
  if (typeof languageId !== "string" || typeof compilerSpecId !== "string")
    return undefined;
  return compilerSpecId === "language-default"
    ? { languageId }
    : { languageId, compilerSpecId };
};
