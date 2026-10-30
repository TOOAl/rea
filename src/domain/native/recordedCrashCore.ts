import { z } from "zod";

import type { BinaryArchitecture } from "../binaryTargetTypes.js";
import { localPathStringSchema } from "../localPath.js";
import { CANONICAL_BASE64_PATTERN } from "../stringPatterns.js";
import { recordedNoteCoverageIssues } from "./recordedCrashNoteCoverage.js";

const hex = z.string().regex(/^0x(?:0|[1-9a-f][0-9a-f]{0,15})$/);
const index = z.number().int().nonnegative();
const signed32 = z.number().int().min(-2147483648).max(2147483647);
const base64 = z.string().regex(CANONICAL_BASE64_PATTERN);
const range = z.strictObject({ offset: hex, bytes: hex });
const diagnostics = z.strictObject({
  stdout: z.string(),
  stderr: z.string(),
  truncated: z.boolean(),
});
// Exact b"CORE\0"; a lossy display label cannot establish the Linux note ABI.
const LINUX_CORE_OWNER_BASE64 = "Q09SRQA=";

/** Complete register identities in the supported Linux amd64 PRSTATUS ABI order. */
const RECORDED_LINUX_AMD64_REGISTERS: readonly string[] = [
  "r15",
  "r14",
  "r13",
  "r12",
  "rbp",
  "rbx",
  "r11",
  "r10",
  "r9",
  "r8",
  "rax",
  "rcx",
  "rdx",
  "rsi",
  "rdi",
  "orig_rax",
  "rip",
  "cs",
  "eflags",
  "rsp",
  "ss",
  "fs_base",
  "gs_base",
  "ds",
  "es",
  "fs",
  "gs",
];
const RECORDED_LINUX_AARCH64_REGISTERS: readonly string[] = [
  "x0",
  "x1",
  "x2",
  "x3",
  "x4",
  "x5",
  "x6",
  "x7",
  "x8",
  "x9",
  "x10",
  "x11",
  "x12",
  "x13",
  "x14",
  "x15",
  "x16",
  "x17",
  "x18",
  "x19",
  "x20",
  "x21",
  "x22",
  "x23",
  "x24",
  "x25",
  "x26",
  "x27",
  "x28",
  "x29",
  "x30",
  "sp",
  "pc",
  "pstate",
];

/** Recorded-core architectures whose Linux note ABI is interpreted. */
export const RECORDED_LINUX_CORE_ARCHITECTURES = [
  "x86_64-little-endian",
  "aarch64-little-endian",
] as const;

export type RecordedCrashArchitecture =
  (typeof RECORDED_LINUX_CORE_ARCHITECTURES)[number];

/**
 * ABI facts for one recorded-core architecture, measured from unchanged pwntools
 * 4.15.0 `elf_prstatus_*` and `user_regs_struct_*` structures and mirrored by
 * `bridge/pwntools/recorded_crash_impl.py`. Both profiles place `pr_cursig` at
 * 12, `pr_pid` at 32 and the register window at 112; the ELF machine, the window
 * contents and the Evidence CPU family differ per profile.
 */
export const RECORDED_LINUX_CORE_PROFILES: Record<
  RecordedCrashArchitecture,
  {
    readonly machine: number;
    readonly evidenceArchitecture: BinaryArchitecture;
    readonly registers: readonly string[];
    readonly registerBytes: number;
    readonly registerOffset: number;
    readonly prstatusBytes: number;
  }
> = {
  "x86_64-little-endian": {
    machine: 62,
    evidenceArchitecture: "x86_64",
    registers: RECORDED_LINUX_AMD64_REGISTERS,
    registerBytes: 8,
    registerOffset: 112,
    prstatusBytes: 336,
  },
  "aarch64-little-endian": {
    machine: 183,
    evidenceArchitecture: "arm64",
    registers: RECORDED_LINUX_AARCH64_REGISTERS,
    registerBytes: 8,
    registerOffset: 112,
    prstatusBytes: 392,
  },
};

const recordedCoreRegisterSets: Record<
  RecordedCrashArchitecture,
  ReadonlySet<string>
> = {
  "x86_64-little-endian": new Set(RECORDED_LINUX_AMD64_REGISTERS),
  "aarch64-little-endian": new Set(RECORDED_LINUX_AARCH64_REGISTERS),
};

/** Select an explicit recording and optionally request debugger-derived mapping context. */
export const inspectRecordedCrashInputSchema = z.strictObject({
  path: localPathStringSchema.describe(
    "Absolute filesystem path to a supplied Linux ELF core",
  ),
  include_debugger_context: z
    .boolean()
    .default(false)
    .describe(
      "Add core-only mapping candidates through caller-supplied GDB/pwndbg",
    ),
});

/** Debugger map candidates preserve reported flags; zero does not establish absent permissions. */
export const recordedCrashDebuggerSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("not-requested") }),
  z.strictObject({
    status: z.literal("available"),
    gdb_version: z.string().min(1),
    pwndbg_version: z.string().min(1),
    connection: z.literal("core"),
    executable: z.null(),
    historical_pid: signed32,
    reported_limits: z.strictObject({
      address_space_bytes: index,
      cpu_seconds: index,
      file_size_bytes: index,
    }),
    maps: z.array(
      z.strictObject({
        start: hex,
        end: hex,
        offset: hex,
        reported_flags: index,
        permissions: z
          .strictObject({
            read: z.boolean(),
            write: z.boolean(),
            execute: z.boolean(),
          })
          .nullable(),
        pathname_display: z.string(),
        current_file_identity: z.literal("unknown"),
      }),
    ),
    confidence: z.literal("derived"),
    completeness: z.literal("unknown"),
    diagnostics,
  }),
]);

/** Portable recorded observations; registers and source coordinates remain lossless. */
const recordedCrashObjectSchema = z.strictObject({
  artifact: z.strictObject({
    path: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: index,
  }),
  format: z.literal("elf-core"),
  architecture: z.enum(RECORDED_LINUX_CORE_ARCHITECTURES),
  target_execution: z.literal("not-performed"),
  live_process_identity: z.literal("unknown"),
  segments: z.array(
    z.strictObject({
      index,
      type: z.union([z.string(), index]),
      header_location: range,
      offset: hex,
      file_size: hex,
      memory_size: hex,
      virtual_address: hex,
      physical_address: hex,
      alignment: hex,
      flags: hex,
      file_backing: z.enum(["file", "none"]),
    }),
  ),
  notes: z.array(
    z.strictObject({
      index,
      segment_index: index,
      type: z.union([z.string(), index]),
      location: range,
      owner_location: range,
      owner_bytes_base64: base64,
      owner_display: z.string().nullable(),
      descriptor_location: range,
      descriptor_bytes_base64: base64,
    }),
  ),
  note_padding: z.array(
    z.strictObject({
      segment_index: index,
      location: range,
      bytes_base64: base64,
    }),
  ),
  threads: z.array(
    z.strictObject({
      note_index: index,
      historical_pid: signed32,
      recorded_current_signal: z.number().int().min(-32768).max(32767),
      registers: z.array(
        z.strictObject({
          name: z.string().min(1),
          value: hex,
          location: range,
        }),
      ),
    }),
  ),
  signals: z.array(
    z.strictObject({
      note_index: index,
      number: signed32,
      code: signed32,
      errno: signed32,
      fault_address: hex.nullable(),
      fault_address_meaning: z.enum(["recorded-sigsegv-address", "unknown"]),
      thread_association: z.literal("unknown"),
    }),
  ),
  debugger: recordedCrashDebuggerSchema,
  note_interpretation_completeness: z.literal("unknown"),
  decoder_diagnostics: diagnostics,
  diagnostics,
  limitations: z.array(z.string()),
});

/** Provider payload excludes identity and diagnostics bound by the owned snapshot boundary. */
