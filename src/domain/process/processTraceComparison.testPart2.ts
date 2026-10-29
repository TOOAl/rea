export const __stub = 1;
//           cardinality: { kind: "optional" },
//         },
//       ],
//       [
//         { id: "ready_worker", trace: ["ready", "worker"] },
//         { id: "ready_worker_alt", trace: ["ready", "worker_alt"] },
//       ],
//     );
//
//     expect(
//       compareProcessTraces(observed, observed, specification),
//     ).toMatchObject({
//       verdict: "nonconforming",
//       diagnostic: {
//         kind: "trace",
//         event_ids: ["worker", "worker_alt"],
//         locations: [],
//       },
//     });
//   });
// });
//
// describe("process trace constraints and evidence sufficiency", () => {
//   it("enforces exact and range cardinality for a repeated terminal observation", () => {
//     const repeated = (count: number) =>
//       capture({
//         frames: Array.from({ length: count }, (_, sequence) => ({
//           sequence,
//           at_ms: sequence,
//           data: "tick",
//         })),
//         process_samples: [],
//         event_journal: Array.from({ length: count }, (_, index) => ({
//           collection: "frames" as const,
//           index,
//         })),
//       });
//     const event: Omit<
//       ProcessTraceSpecification["events"][number],
//       "cardinality"
//     > = {
//       id: "tick",
//       source: "terminal_raw",
//       exact: { data: "tick" },
//       ignore_fields: ["sequence", "at_ms"],
//     };
//     const rangeSpecification: ProcessTraceSpecification = {
//       events: [{ ...event, cardinality: { kind: "range", min: 2, max: 3 } }],
//       language: {
//         kind: "partial_order",
//         happens_before: [],
//         not_before: [],
//         unordered_groups: [],
//         prefix: [],
//         suffix: [],
//       },
//     };
//     expect(
//       compareProcessTraces(repeated(2), repeated(3), rangeSpecification),
//     ).toMatchObject({ verdict: "equivalent" });
//     expect(
//       compareProcessTraces(repeated(1), repeated(2), rangeSpecification),
//     ).toMatchObject({
//       verdict: "different",
//       diagnostic: { kind: "cardinality", side: "left" },
//     });
//     expect(
//       compareProcessTraces(repeated(2), repeated(4), rangeSpecification),
//     ).toMatchObject({
//       verdict: "different",
//       diagnostic: { kind: "cardinality", side: "right" },
//     });
//
//     const exactSpecification: ProcessTraceSpecification = {
//       events: [{ ...event, cardinality: { kind: "exact", count: 2 } }],
//       language: {
//         kind: "finite_traces",
//         variants: [{ id: "two", trace: ["tick", "tick"] }],
//       },
//     };
//     expect(
//       compareProcessTraces(repeated(2), repeated(2), exactSpecification),
//     ).toMatchObject({ verdict: "equivalent" });
//     expect(
//       compareProcessTraces(repeated(3), repeated(2), exactSpecification),
//     ).toMatchObject({
//       verdict: "different",
//       diagnostic: { kind: "cardinality", side: "left" },
//     });
//   });
//
//   it("enforces an explicit not-before relation between terminal and process events", () => {
//     const specification: ProcessTraceSpecification = {
//       events: [
//         {
//           id: "ready",
//           source: "terminal_raw",
//           exact: terminal,
//           cardinality: { kind: "required" },
//         },
//         {
//           id: "worker",
//           source: "process",
//           exact: processStarted,
//           cardinality: { kind: "required" },
//         },
//       ],
//       language: {
//         kind: "partial_order",
//         happens_before: [],
//         not_before: [{ event: "ready", anchor: "worker" }],
//         unordered_groups: [],
//         prefix: [],
//         suffix: [],
//       },
//     };
//     const readyFirst = capture(values(["terminal", "process"]));
//     const workerFirst = capture(values(["process", "terminal"]));
//
//     expect(
//       compareProcessTraces(workerFirst, readyFirst, specification),
//     ).toMatchObject({
//       verdict: "different",
//       diagnostic: {
//         kind: "edge",
//         side: "right",
//         event_ids: ["ready", "worker"],
//       },
//     });
//     expect(
//       compareProcessTraces(workerFirst, workerFirst, specification),
//     ).toMatchObject({ verdict: "equivalent" });
//   });
// });
//
// describe("unknown process trace evidence", () => {
//   it("never proves equivalence from truncated, unknown, or journal-free evidence", () => {
//     const complete = capture(values(["terminal", "process"]));
//     const truncated = capture(values(["terminal", "process"]), {
//       omittedTerminalFrame: true,
//     });
//     expect(
//       compareProcessTraces(complete, truncated, partialSpecification()).verdict,
//     ).toBe("unknown");
//     const unknown = capture(values(["terminal", "process"]), {
//       residualUnknowns: [{ scope: "process", reason: "sampled" }],
//     });
//     expect(
//       compareProcessTraces(complete, unknown, partialSpecification()).verdict,
//     ).toBe("unknown");
//     expect(
//       compareProcessTraces(complete, unknown, partialSpecification()),
//     ).toMatchObject({
//       verdict: "unknown",
//       right: {
//         status: "unknown",
//         matched_variant: null,
//         satisfied_constraints: [],
//         raw_trace: [{ event_id: "ready" }, { event_id: "worker" }],
//       },
//     });
//     const noJournal = parseProcessCapture({ ...complete, event_journal: [] });
//     expect(
//       compareProcessTraces(complete, noJournal, partialSpecification()),
//     ).toMatchObject({
//       verdict: "unknown",
//       diagnostic: { kind: "journal", side: "right" },
//     });
//
//     expect(() =>
//       parseProcessCapture({
//         ...complete,
//         event_journal: complete.event_journal.slice(1),
//       }),
//     ).toThrow("event_journal");
//   });
// });
//
// describe("process trace dimension attribution", () => {
//   it.each([false, true])(
//     "preserves an independently observed terminal addition/removal (reversed: %s)",
//     (reversed) => {
//       const absent = capture({
export const _l = 183;
