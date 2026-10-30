import { createHash } from "node:crypto";
import {
  nativeLoadImageSchema,
  type NativeLoadImage,
  type NativeLoadImageCheck,
  type NativeLoadImageObservation,
} from "../domain/native/nativeLoadImage.js";
import { parseDosMzHeader, type DosMzHeader } from "../domain/dosMz.js";
import type { JsonValue } from "../domain/jsonValue.js";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import { validateDosComLength } from "../domain/dosCom.js";
import { err, ok, type Result } from "../domain/result.js";
import { ghidraRawBinaryLanguage } from "./GhidraRawBinaryLanguage.js";

export const attestGhidraDosComLoadImage = (
  bytes: Buffer,
  targetSha256: string,
  observations: NativeLoadImageObservation,
): Result<NativeLoadImage, string> => {
  if (sha256(bytes) !== targetSha256)
    return err("Ghidra COM snapshot digest does not match the admitted target");
  const length = validateDosComLength(bytes.length);
  if (!length.ok) return length;
  const checks: NativeLoadImageCheck[] = [];
  const check = (
    name: string,
    expected: JsonValue,
    observed: JsonValue,
    fileOffset: number | null = null,
    location: string | null = null,
  ): void => {
    checks.push({
      name,
      matched: JSON.stringify(expected) === JSON.stringify(observed),
      expected,
      observed,
      file_offset: fileOffset,
      address: location,
    });
  };
  const source = observations.source_files[0];
  check("executable_format", "Raw Binary", observations.executable_format);
  check("language_id", "x86:LE:16:Real Mode", observations.language_id);
  check("compiler_spec_id", "default", observations.compiler_spec_id);
  check("image_base", "0x0", observations.image_base);
  check("default_address_space", "ram", observations.default_address_space);
  check("source_file_count", 1, observations.source_files.length);
  check("source_file_size", bytes.length, source?.size ?? null);
  check("original_file_sha256", targetSha256, source?.original_sha256 ?? null);
  check("modified_file_sha256", targetSha256, source?.modified_sha256 ?? null);
  check("entry_points", ["0x10100"], [...observations.entry_points].sort());
  check(
    "entry_context",
    [
      {
        address: "0x10100",
        registers: ["CS", "DS", "ES", "SS"].map((name) => ({
          name,
          value_hex: "0x1000",
        })),
      },
    ],
    observations.entry_context,
  );
  check("relocation_records", [], observations.relocations);
  checkMappings(
    { headerBytes: 0, imageBytes: bytes.length },
    0x10100,
    bytes,
    bytes,
    observations,
    check,
  );
  return ok(
    nativeLoadImageSchema.parse({
      status: checks.every((item) => item.matched) ? "verified" : "mismatch",
      format: "dos-com",
      target_sha256: targetSha256,
      load_segment: 0x1000,
      header_bytes: 0,
      module_bytes: bytes.length,
      overlay_bytes: 0,
      entry: { relative_segment: 0, offset: 0x100, linear_address: "0x10100" },
      observations,
      checks,
      limitations: [
        "DOS COM is a headerless interpretation explicitly selected by the caller, not format identification from file bytes.",
        "Verification covers complete original/modified source identity, mapped file bytes, entry and measured CS/DS/ES/SS entry context. Context 0x1000 is imposed for analysis; it is not an observed running process.",
        "The PSP, initial stack contents/registers, DOS interrupts, PC-98 devices and runtime behavior are not modeled or verified. No original executable bytes are changed.",
        "Mapping ends are inclusive; a mismatching digest identifies its source range, not the first differing byte.",
      ],
    }),
  );
};

const hexAddress = (value: bigint): string => `0x${value.toString(16)}`;

/** Verify a caller-supplied raw-binary mapping against measured Ghidra import facts. */
export const attestGhidraRawBinaryLoadImage = (
  snapshot: { readonly sha256: string; readonly bytes: number },
  target: Extract<BinaryTarget, { format: "raw-binary" }>,
  observations: NativeLoadImageObservation,
): Result<NativeLoadImage, string> => {
  if (snapshot.sha256 !== target.sha256)
    return err(
      "Ghidra raw-binary snapshot digest does not match the admitted target",
    );
  const language = ghidraRawBinaryLanguage(target.architecture);
  const base = BigInt(target.entryPoint);
  const last = hexAddress(base + BigInt(snapshot.bytes) - 1n);
  const checks: NativeLoadImageCheck[] = [];
  const check = (
    name: string,
    expected: JsonValue,
    observed: JsonValue,
    fileOffset: number | null = null,
    location: string | null = null,
  ): void => {
    checks.push({
      name,
      matched: JSON.stringify(expected) === JSON.stringify(observed),
      expected,
      observed,
      file_offset: fileOffset,
      address: location,
    });
  };
  const source = observations.source_files[0];
  const fileMappings = observations.mappings.filter(
    (item) => item.source_file_index !== null,
  );
  const mapping = fileMappings[0];
  check("executable_format", "Raw Binary", observations.executable_format);
  check("language_id", language.languageId, observations.language_id);
  check(
    "compiler_spec_id",
    language.compilerSpecId,
    observations.compiler_spec_id,
  );
  // BinaryLoader's block base is independent of the Program image base.
  check("image_base", "0x0", observations.image_base);
  check(
    "default_address_space",
    language.defaultAddressSpace,
    observations.default_address_space,
  );
  check("source_file_count", 1, observations.source_files.length);
  check("source_file_size", snapshot.bytes, source?.size ?? null);
  check("original_file_sha256", target.sha256, source?.original_sha256 ?? null);
  check("modified_file_sha256", target.sha256, source?.modified_sha256 ?? null);
  // Language-defined uninitialized zero page/stack blocks are observations, not file bytes.
  check("mapping_count", 1, fileMappings.length);
  check(
    "initialized_unbacked_mappings",
    0,
    observations.mappings.filter(
      (item) => item.initialized && item.source_file_index === null,
    ).length,
  );
  check("mapping.source_file_index", 0, mapping?.source_file_index ?? null);
  // Matching bytes alone do not establish the admitted default-space load.
  check("mapping.initialized", true, mapping?.initialized ?? null);
  check("mapping.loaded", true, mapping?.loaded ?? null);
  check("mapping.overlay", false, mapping?.overlay ?? null);
  check(
    "mapping.address_space",
    observations.default_address_space,
    mapping?.address_space ?? null,
  );
  check(
    "mapping.file_offset",
    0,
    mapping?.file_offset ?? null,
    0,
    mapping?.start ?? null,
  );
  check(
    "mapping.start",
    target.entryPoint,
    mapping?.start ?? null,
    0,
    mapping?.start ?? null,
  );
  check("mapping.end", last, mapping?.end ?? null, 0, mapping?.end ?? null);
  check(
    "mapping.length",
    snapshot.bytes,
    mapping?.length ?? null,
    0,
    mapping?.start ?? null,
  );
  check(
    "mapping.sha256",
    snapshot.sha256,
    mapping?.sha256 ?? null,
    0,
    mapping?.start ?? null,
  );
  check(
    "entry_point",
    target.entryPoint,
    observations.entry_points.find((entry) => entry === target.entryPoint) ??
      null,
  );
  check("relocation_records", [], observations.relocations);
  return ok(
    nativeLoadImageSchema.parse({
      status: checks.every((item) => item.matched) ? "verified" : "mismatch",
      format: "raw-binary",
      target_sha256: target.sha256,
      architecture: target.architecture,
      language_id: language.languageId,
      compiler_spec_id: language.compilerSpecId,
      base_address: target.entryPoint,
      file_bytes: snapshot.bytes,
      entry: { address: target.entryPoint, file_offset: 0 },
      observations,
      checks,
      limitations: [
        "Raw binary is a headerless interpretation explicitly selected by the caller, not format identification from file bytes.",
        "Verification covers complete original/modified source identity, initialized and loaded non-overlay file bytes in the default address space, the caller-supplied entry, and the bound little-endian Ghidra language. File offset 0 is mapped at the entry address.",
        "Ghidra may report additional language-defined external entries outside the mapped image. They are preserved as observations; verification requires the caller-supplied entry and does not attest other entries.",
        "Language-defined uninitialized memory, such as 6502 zero page and stack, is preserved as observations but is not attested as file-backed bytes.",
        "Reset vectors, memory-mapped I/O, big-endian and Thumb-only variants, and runtime boot behavior are not modeled or verified. No original executable bytes are changed.",
        "Mapping ends are inclusive; a mismatching digest identifies its source range, not the first differing byte.",
      ],
    }),
  );
};
