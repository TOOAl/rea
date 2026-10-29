export const __stub = 1;
//         status: "found",
//         dimension: "process",
//         index: 0,
//       },
//     });
//   });
// });
//
// describe("unordered finite trace mismatch attribution", () => {
//   it("attributes only the missing member of an unordered group", () => {
//     const db = { sequence: 1, at_ms: 901, data: "DB" };
//     const alert = { ...processStarted, pid: 2, command: "other-worker" };
//     const left = capture({
//       frames: [terminal],
//       process_samples: [processStarted],
//       event_journal: [
//         { collection: "frames", index: 0 },
//         { collection: "process_samples", index: 0 },
//       ],
//     });
//     const right = capture({
//       frames: [terminal, db],
//       process_samples: [processStarted],
//       event_journal: [
//         { collection: "frames", index: 0 },
//         { collection: "process_samples", index: 0 },
//         { collection: "frames", index: 1 },
//       ],
//     });
//     const specification = finiteTraceSpecification(
//       [
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
//           cardinality: { kind: "optional" },
//         },
//         {
//           id: "db",
//           source: "terminal_raw",
//           exact: db,
//           cardinality: { kind: "optional" },
//         },
//         {
//           id: "alert",
//           source: "process",
//           exact: alert,
//           cardinality: { kind: "optional" },
//         },
//       ],
//       [
//         {
//           id: "ready_then_work",
//           trace: ["ready", { unordered: ["worker", "db"] }],
//         },
//       ],
//     );
//
//     expect(
//       compareProcessCaptures(left, right, {
//         traceSpecification: specification,
//       }),
//     ).toMatchObject({
//       trace: {
//         verdict: "different",
//         diagnostic: {
//           side: "left",
//           event_ids: ["db"],
//           locations: [],
//         },
//       },
//       terminal: "changed",
//       process: "unchanged",
//       first_divergence: { status: "found", dimension: "terminal", index: 1 },
//     });
//
//     const unexpected = capture({
//       frames: [terminal],
//       process_samples: [processStarted, alert],
//       event_journal: [
//         { collection: "frames", index: 0 },
//         { collection: "process_samples", index: 0 },
//         { collection: "process_samples", index: 1 },
//       ],
//     });
//     expect(
//       compareProcessTraces(unexpected, unexpected, specification),
//     ).toMatchObject({
//       verdict: "nonconforming",
//       diagnostic: {
//         kind: "trace",
//         event_ids: ["db", "alert"],
//         locations: [{ collection: "process_samples", index: 1 }],
//       },
//     });
//   });
// });
//
// describe("partial-order dimension attribution", () => {
//   it("attributes an ordering difference to both ordered dimensions", () => {
//     expect(
//       traced(
//         capture(values(["terminal", "process"])),
//         capture(values(["process", "terminal"])),
//       ),
//     ).toMatchObject({
//       trace: { verdict: "different" },
//       terminal: "changed",
//       process: "changed",
//     });
//   });
//
//   it("attributes every independent failed ordering edge", () => {
//     const terminals = [
//       terminal,
//       { ...terminal, sequence: 1, data: "Ready again" },
//     ];
//     const workers = [processStarted, { ...processStarted, at_ms: 2, pid: 2 }];
//     const events = ["ready1", "worker1", "ready2", "worker2"] as const;
//     const make = (order: readonly (typeof events)[number][]) =>
//       capture({
//         frames: terminals,
//         process_samples: workers,
//         event_journal: order.map((event) => ({
//           collection: event.startsWith("ready")
//             ? ("frames" as const)
//             : ("process_samples" as const),
//           index: Number(event.slice(-1)) - 1,
//         })),
//       });
//     const left = make(events);
//     const right = make(["worker1", "ready1", "worker2", "ready2"]);
//     const specification: ProcessTraceSpecification = {
//       events: [
//         ...terminals.map((frame, index) => ({
//           id: `ready${String(index + 1)}`,
//           source: "terminal_raw" as const,
//           exact: frame,
//           cardinality: { kind: "required" as const },
//         })),
//         ...workers.map((sample, index) => ({
//           id: `worker${String(index + 1)}`,
//           source: "process" as const,
//           exact: sample,
//           cardinality: { kind: "required" as const },
//         })),
//       ],
//       language: {
//         kind: "partial_order",
//         happens_before: [
//           { before: "ready1", after: "worker1" },
//           { before: "ready2", after: "worker2" },
//         ],
//         not_before: [],
//         unordered_groups: [
//           { events: ["ready1", "ready2"] },
//           { events: ["worker1", "worker2"] },
//           { events: ["ready1", "worker2"] },
//           { events: ["worker1", "ready2"] },
//         ],
//         prefix: [],
//         suffix: [],
//       },
//     };
//
//     expect(
//       compareProcessCaptures(left, right, {
//         traceSpecification: specification,
//       }),
//     ).toMatchObject({
//       trace: { verdict: "different" },
//       terminal: "changed",
//       process: "changed",
//     });
//   });
// });
export const _l = 182;
