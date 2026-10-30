import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import type { EvidenceLocation } from "../domain/evidence.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import { AnalysisOutputError } from "../domain/analysisErrorCore.js";
import {
  inspectMachoSchema,
  type NativeCommandInvocation,
} from "../domain/native/nativeInspection.js";
import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
import { err, ok, type Result } from "../domain/result.js";
import type { NativeCommandCapture } from "./CommandRunner.js";
import { parseDyldSymbols } from "./parsers/dyldInfo.js";
import { parseLipoOutput } from "./parsers/lipo.js";
import { parseOtoolLoadCommands } from "./parsers/otool.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

interface NativeMachoObservation {
  readonly result: JsonValue;
  readonly limitations: readonly string[];
  readonly locations: readonly EvidenceLocation[];
}

interface NativeMachoInspectionContext {
  readonly target: BinaryTarget;
  readonly signal?: AbortSignal;
  readonly run: (
    tool: string,
    arguments_: readonly string[],
    signal?: AbortSignal,
  ) => Promise<Result<NativeCommandCapture, AnalysisError>>;
  readonly invocation: (
    capture: NativeCommandCapture,
  ) => NativeCommandInvocation;
}

const DISCOVERY_COMMANDS = [["lipo", ["-detailed_info"]]] as const;

// llvm-nm's default dyld-info pass fakes up symbols the symbol table lacks
// from dyld metadata. It takes seconds on large apps (Keynote arm64: 5.8 s
// versus 0.01 s without it), and under -gU it can only add export-trie names.
const SYMBOL_TABLE_EXPORTS = ["nm", ["-gjU", "--no-dyldinfo"]] as const;
const DYLD_INFO_EXPORTS = ["nm", ["-gjU"]] as const;

const REQUIRED_SLICE_COMMANDS = [
  ["otool", ["-h", "-l"]],
  SYMBOL_TABLE_EXPORTS,
  ["dyld_info", ["-imports"]],
  ["dyld_info", ["-exports"]],
  ["dwarfdump", ["--uuid"]],
] as const;

const OPTIONAL_VTOOL_COMMAND = ["vtool", ["-show-build"]] as const;
const VTOOL_UNAVAILABLE_LIMITATION =
  "vtool is unavailable; build metadata is normalized from otool only.";
/** Inspect one Mach-O with the required native commands and normalized output. */
export const inspectNativeMacho = async (
  context: NativeMachoInspectionContext,
): Promise<Result<NativeMachoObservation, AnalysisError>> => {
  const captures: NativeCommandCapture[] = [];
  for (const [tool, prefix] of DISCOVERY_COMMANDS) {
    const captured = await context.run(
      tool,
      [...prefix, context.target.path],
      context.signal,
    );
    if (!captured.ok) return err(captured.error);
    captures.push(captured.value);
  }
  const lipo = captures.find(({ tool }) => tool === "lipo");
  if (lipo === undefined) throw new TypeError("Missing lipo capture");
  const { format, architectures } = parseLipoOutput(
    lipo.stdout,
    context.target.path,
  );
  const selection = selectArchitecture(context.target, architectures);
  if (selection.status === "absent")
    return err(
      new AnalysisOutputError(
        "inspect_macho",
        `lipo did not list ${selection.architecture}; refusing to read another slice`,
      ),
    );
  const selectedArchitecture =
    selection.status === "selected" ? selection.architecture : null;
  const runSliceCommand = ([tool, prefix]: readonly [
    string,
    readonly string[],
  ]) =>
    context.run(
      tool,
      [
        ...prefix,
        ...selectedArchitectureArguments(tool, selectedArchitecture),
        context.target.path,
      ],
      context.signal,
    );
  // vtool knows no variant subtypes, so no spelling selects an arm64e.x1 slice.
  const vtoolSelectsSlice =
    selectedArchitecture === null ||
    !toolArchitectureName("vtool", selectedArchitecture).includes(".");
  // Slice commands only read the selected artifact, so launch them together.
  // Every launch settles before return; declared order fixes provenance and
  // which failure is reported.
  const [required, optional] = await Promise.all([
    Promise.all(REQUIRED_SLICE_COMMANDS.map(runSliceCommand)),
    vtoolSelectsSlice ? runSliceCommand(OPTIONAL_VTOOL_COMMAND) : null,
  ]);
  for (const captured of required) {
    if (!captured.ok) return err(captured.error);
    captures.push(captured.value);
  }
  const limitations: string[] = [];
  if (optional === null)
    limitations.push(
      `vtool cannot select the ${selectedArchitecture} slice; build metadata is normalized from otool only.`,
    );
  else if (optional.ok) captures.push(optional.value);
  else if (optional.error._tag === "AnalysisCapabilityUnavailableError")
    limitations.push(VTOOL_UNAVAILABLE_LIMITATION);
  else return err(optional.error);
  const nmIndex = captures.findIndex(({ tool }) => tool === "nm");
  const dyldExports = captures.filter(({ tool }) => tool === "dyld_info")[1];
  if (nmIndex < 0 || dyldExports === undefined)
    throw new TypeError("Missing nm or dyld_info export capture");
  // A stripped symbol table (strip -T) can omit names the export trie keeps.
  // Only then does llvm-nm's dyld-info pass add names, and its exact names
  // disambiguate dyld_info rows, so rerun it rather than lose them.
  if (!namesEveryExport(captures[nmIndex]!.stdout, dyldExports)) {
    const withDyldInfo = await runSliceCommand(DYLD_INFO_EXPORTS);
    if (!withDyldInfo.ok) return err(withDyldInfo.error);
    captures[nmIndex] = withDyldInfo.value;
  }
  const otool = captures.find(({ tool }) => tool === "otool");
  if (otool === undefined) throw new TypeError("Missing otool capture");
  let load: ReturnType<typeof parseOtoolLoadCommands>;
  try {
    load = parseOtoolLoadCommands(sliceOutput(otool));
  } catch (cause: unknown) {
    return err(
      new AnalysisOutputError(
        "inspect_macho",
        "Malformed otool load-command output",
        {
          cause,
          capturedOutput: {
            stdout: otool.stdout,
            stderr: otool.stderr,
            truncated: false,
            stdout_bytes: otool.stdoutBytes,
            stderr_bytes: otool.stderrBytes,
            exit_code: otool.exitCode,
            signal: otool.signal,
          },
        },
      ),
    );
  }
  const selectedArchitectureName =
    selectedArchitecture ??
    (architectures.length === 1 ? (architectures[0]?.name ?? null) : null);
  const containerOffset =
    selectedArchitectureName === null
      ? undefined
      : format === "thin"
        ? 0
        : (architectures.find(({ name }) => name === selectedArchitectureName)
            ?.file_offset ?? undefined);
  const normalized = normalizeMacho(
    captures,
    context.invocation,
    limitations,
    load,
    architectures,
    context.target.path,
    {
      name: selectedArchitectureName,
      container_file_offset: containerOffset ?? null,
    },
  );
  const result =
    containerOffset === undefined
      ? inspectMachoSchema.parse({
          ...normalized,
          limitations: [
            ...normalized.limitations,
            selectedArchitectureName === null
              ? "The selected Mach-O slice is unknown; slice-based evidence locations are unavailable."
              : "The selected Mach-O slice's container file offset was not observed; slice-based evidence locations are unavailable.",
          ],
        })
      : normalized;
  return ok({
    result: jsonValueSchema.parse(result),
    limitations: result.limitations,
    locations: fileOffsetLocations(result, containerOffset),
  });
};
