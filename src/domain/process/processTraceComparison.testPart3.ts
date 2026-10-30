export const __stub = 1;
//         frames: [],
//         process_samples: [],
//         event_journal: [],
//       });
//       const present = capture(values(["terminal", "process"]));
//       const specification = partialSpecification();
//       const result = compareProcessCaptures(
//         reversed ? present : absent,
//         reversed ? absent : present,
//         {
//           traceSpecification: {
//             ...specification,
//             events: specification.events.map((event) =>
//               event.id === "ready"
//                 ? { ...event, cardinality: { kind: "optional" } }
//                 : event,
//             ),
//             language: {
//               kind: "partial_order",
//               happens_before: [],
//               not_before: [],
//               unordered_groups: [{ events: ["ready", "worker"] }],
//               prefix: [],
//               suffix: [],
//             },
//           },
//         },
//       );
//       expect(result).toMatchObject({
//         terminal: reversed ? "removed" : "added",
//         process: "changed",
//         status: "changed",
//         trace: {
//           verdict: "different",
//           diagnostic: { event_ids: ["worker"], locations: [] },
//         },
//       });
//     },
//   );
//
//   it("applies passing filesystem trace timestamp omissions to exact comparison", () => {
//     const base = capture(values(["terminal", "process"]));
//     const left = base;
//     const right = parseProcessCapture({
//       ...base,
//       filesystem_checkpoints: base.filesystem_checkpoints.map((checkpoint) =>
//         checkpoint.name === "after_settlement"
//           ? { ...checkpoint, at_ms: checkpoint.at_ms + 10 }
//           : checkpoint,
//       ),
//     });
//     const specification = finiteTraceSpecification(
//       emptyCapture.filesystem_checkpoints.map(
//         ({ at_ms: _atMs, ...checkpoint }) => ({
//           id: checkpoint.name,
//           source: "filesystem" as const,
//           exact: jsonValueSchema.parse(checkpoint),
//           ignore_fields: ["at_ms"],
//           cardinality: { kind: "required" as const },
//         }),
//       ),
//       [{ id: "checkpoints", trace: ["before", "after_settlement"] }],
//     );
//
//     expect(compareProcessCaptures(left, right)).toMatchObject({
//       filesystem: "changed",
//       first_divergence: { status: "found", dimension: "filesystem" },
//     });
//     expect(
//       compareProcessCaptures(left, right, {
//         traceSpecification: specification,
//       }),
//     ).toMatchObject({
//       trace: { verdict: "equivalent" },
//       filesystem: "unchanged",
//       first_divergence: { status: "none" },
//     });
//
//     const finalFile = {
//       path: "root_0:created.txt",
//       type: "file" as const,
//       mode: 0o644,
//       size: 4,
//       sha256: "a".repeat(64),
//       symlink_target: null,
//     };
//     const created = {
//       path: finalFile.path,
//       status: "created" as const,
//       before: null,
//       after: finalFile,
//     };
//     const changedRight = parseProcessCapture({
//       ...right,
//       filesystem_checkpoints: right.filesystem_checkpoints.map((checkpoint) =>
//         checkpoint.name === "after_settlement"
//           ? { ...checkpoint, files: [finalFile], effects: [created] }
//           : checkpoint,
//       ),
//       files_after: [finalFile],
//       filesystem_effects: [created],
//       truncation_details: {
//         ...right.truncation_details,
//         filesystem_after: {
//           ...right.truncation_details.filesystem_after,
//           hashed_bytes: finalFile.size,
//         },
//       },
//     });
//     expect(
//       compareProcessCaptures(left, changedRight, {
//         traceSpecification: specification,
//       }),
//     ).toMatchObject({
//       trace: { verdict: "different" },
//       filesystem: "changed",
//       first_divergence: { status: "found", dimension: "filesystem" },
//     });
//   });
//
//   it("keeps equal dimensions unchanged when one side fails a predicate", () => {
//     expect(
//       traced(
//         withPayloads("Ready", "worker"),
//         withPayloads("Different", "worker"),
//       ),
//     ).toMatchObject({
//       trace: { verdict: "different" },
//       terminal: "changed",
//       process: "unchanged",
//     });
//     expect(
//       traced(
//         withPayloads("Ready", "worker"),
//         withPayloads("Ready", "other-worker"),
//       ),
//     ).toMatchObject({
//       trace: { verdict: "different" },
//       terminal: "unchanged",
//       process: "changed",
//     });
//   });
// });
//
// describe("finite trace dimension attribution", () => {
//   it("attributes a finite-trace omission to the omitted event dimension", () => {
//     const left = capture({
//       frames: [terminal],
//       process_samples: [],
//       event_journal: [{ collection: "frames", index: 0 }],
//     });
//     const right = capture(values(["terminal", "process"]));
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
//       ],
//       [{ id: "ready_worker", trace: ["ready", "worker"] }],
//     );
//
//     expect(
//       compareProcessCaptures(left, right, {
//         traceSpecification: specification,
//       }),
//     ).toMatchObject({
//       status: "changed",
//       process: "changed",
//       terminal: "unchanged",
//       trace: {
//         verdict: "different",
//         diagnostic: { kind: "trace", event_ids: ["worker"], locations: [] },
//       },
//       first_divergence: {
export const _l = 183;
