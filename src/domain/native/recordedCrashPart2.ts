import { z } from "zod";
import { recordedNoteCoverageIssues } from "./recordedCrashNoteCoverage.js";

export const recordedCrashPayloadSchema = recordedCrashObjectSchema.omit({
  artifact: true,
  diagnostics: true,
  debugger: true,
  decoder_diagnostics: true,
});

/** Validate the next consumer's file ranges, note links and register representations. */
export const recordedCrashSchema = recordedCrashObjectSchema.superRefine(
  (value, context) => {
    const fail = (message: string) =>
      context.addIssue({ code: "custom", message });
    const within = (
      item: z.output<typeof range>,
      start = 0n,
      end = BigInt(value.artifact.bytes),
    ) => {
      const offset = BigInt(item.offset);
      const bytes = BigInt(item.bytes);
      return offset >= start && offset <= end && bytes <= end - offset;
    };
    for (const issue of recordedNoteCoverageIssues(
      value.segments,
      value.notes,
      value.note_padding,
    ))
      fail(issue);
    for (const [position, segment] of value.segments.entries()) {
      if (position !== segment.index || !within(segment.header_location))
        fail("Invalid original segment identity or header range.");
      if (
        segment.file_backing === "file" &&
        !within({ offset: segment.offset, bytes: segment.file_size })
      )
        fail("Recorded segment exceeds artifact bytes.");
      if (
        segment.type === "PT_LOAD" &&
        BigInt(segment.file_size) > BigInt(segment.memory_size)
      )
        fail("Recorded PT_LOAD file size exceeds memory size.");
    }
    for (const [position, note] of value.notes.entries()) {
      const segment = value.segments[note.segment_index];
      if (position !== note.index || segment?.type !== "PT_NOTE") {
        fail("Invalid original note identity or segment reference.");
        continue;
      }
      const decodedLength = (raw: string) =>
        BigInt(
          (raw.length / 4) * 3 -
            (raw.endsWith("==") ? 2 : raw.endsWith("=") ? 1 : 0),
        );
      if (
        decodedLength(note.owner_bytes_base64) !==
          BigInt(note.owner_location.bytes) ||
        decodedLength(note.descriptor_bytes_base64) !==
          BigInt(note.descriptor_location.bytes)
      )
        fail("Raw note lengths differ from their source ranges.");
      const start = BigInt(segment.offset);
      const end = start + BigInt(segment.file_size);
      if (
        !within(note.location, start, end) ||
        !within(
          note.owner_location,
          BigInt(note.location.offset),
          BigInt(note.location.offset) + BigInt(note.location.bytes),
        ) ||
        !within(
          note.descriptor_location,
          BigInt(note.location.offset),
          BigInt(note.location.offset) + BigInt(note.location.bytes),
        )
      )
        fail("Note source ranges exceed their recorded segment.");
    }
    for (const padding of value.note_padding) {
      const segment = value.segments[padding.segment_index];
      if (
        segment?.type !== "PT_NOTE" ||
        !within(
          padding.location,
          BigInt(segment.offset),
          BigInt(segment.offset) + BigInt(segment.file_size),
        )
      )
        fail("Invalid recorded note padding range.");
    }
    for (const [kind, rows] of [
      ["NT_PRSTATUS", value.threads],
      ["NT_SIGINFO", value.signals],
    ] as const) {
      const matchingNotes = value.notes.filter(
        (note) =>
          note.type === kind &&
          note.owner_bytes_base64 === LINUX_CORE_OWNER_BASE64,
      );
      if (
        rows.length !== matchingNotes.length ||
        new Set(rows.map(({ note_index }) => note_index)).size !== rows.length
      )
        fail(
          "Each supported raw note requires exactly one corresponding interpretation.",
        );
    }
    const profile = RECORDED_LINUX_CORE_PROFILES[value.architecture];
    const profileRegisters = recordedCoreRegisterSets[value.architecture];
    for (const thread of value.threads) {
      const note = value.notes[thread.note_index];
      if (
        note?.type !== "NT_PRSTATUS" ||
        note.owner_display !== "CORE" ||
        note.owner_bytes_base64 !== LINUX_CORE_OWNER_BASE64
      ) {
        fail("Thread references a different note kind.");
        continue;
      }
      if (
        thread.registers.length !== profile.registers.length ||
        !thread.registers.every(({ name }) => profileRegisters.has(name)) ||
        new Set(thread.registers.map(({ name }) => name)).size !==
          thread.registers.length
      )
        fail(
          "Each recorded thread requires every supported register exactly once.",
        );
      for (const register of thread.registers)
        if (
          BigInt(register.location.bytes) !== BigInt(profile.registerBytes) ||
          !within(
            register.location,
            BigInt(note.descriptor_location.offset),
            BigInt(note.descriptor_location.offset) +
              BigInt(note.descriptor_location.bytes),
          )
        )
          fail("Register source exceeds its descriptor.");
    }
    for (const signal of value.signals) {
      if (
        value.notes[signal.note_index]?.type !== "NT_SIGINFO" ||
        value.notes[signal.note_index]?.owner_display !== "CORE" ||
        value.notes[signal.note_index]?.owner_bytes_base64 !==
          LINUX_CORE_OWNER_BASE64
      )
        fail("Signal references a different note kind.");
      const known =
        signal.number === 11 && (signal.code === 1 || signal.code === 2);
      if (
        known !== (signal.fault_address !== null) ||
        (signal.fault_address !== null) !==
          (signal.fault_address_meaning === "recorded-sigsegv-address")
      )
        fail("Signal union meaning does not match recorded SIGSEGV code.");
    }
    if (value.debugger.status === "available")
      for (const map of value.debugger.maps) {
        if (BigInt(map.end) < BigInt(map.start))
          fail("Debugger mapping end precedes its start.");
        if (
          map.permissions !== null &&
          (map.permissions.read !== Boolean(map.reported_flags & 4) ||
            map.permissions.write !== Boolean(map.reported_flags & 2) ||
            map.permissions.execute !== Boolean(map.reported_flags & 1))
        )
          fail("Mapping permissions differ from reported flags.");
        if (
          (map.reported_flags === 0 || map.reported_flags > 7) !==
          (map.permissions === null)
        )
          fail(
            "Unreported or unfamiliar map flags require unknown permissions.",
          );
      }
  },
);

export type InspectRecordedCrashInput = z.output<
  typeof inspectRecordedCrashInputSchema
>;
export type RecordedCrash = z.output<typeof recordedCrashSchema>;

/** Validated basic core evidence retained when requested debugger enrichment fails. */
export type RecordedCrashPartialObservation = Omit<
  RecordedCrash,
  "debugger"
> & {
  readonly debugger: {
    readonly status: "unavailable";
    readonly requested: true;
  };
};
