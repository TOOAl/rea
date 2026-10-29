export const __stub = 1;
// import { describe, expect, it } from "vitest";
// import { jsonValueSchema } from "../jsonValue.js";
// import { parseProcessCapture } from "./processCaptureParsing.js";
// import type { ProcessTraceSpecification } from "./processTraceSpecification.js";
// import { processTraceSpecificationSchema as specificationSchema } from "./processTraceSpecification.js";
// import { processTraceComparisonResultSchema } from "./processTraceEvaluation.js";
// import {
//   capture,
//   emptyCapture,
//   partialSpecification,
//   processStarted,
//   terminal,
//   values,
// } from "./processTraceComparison.fixture.js";
//
// import { compareProcessCaptures } from "./processComparison.js";
// import { compareProcessTraces } from "./processTraceComparison.js";
//
// const traced = (
//   left: ReturnType<typeof capture>,
//   right: ReturnType<typeof capture>,
// ) =>
//   compareProcessCaptures(left, right, {
//     traceSpecification: partialSpecification(),
//   });
//
// const withPayloads = (data: string, command: string) =>
//   capture({
//     ...values(["terminal", "process"]),
//     frames: [{ ...terminal, data }],
//     process_samples: [{ ...processStarted, command }],
//   });
//
// type FiniteTraceLanguage = Extract<
//   ProcessTraceSpecification["language"],
//   { kind: "finite_traces" }
// >;
//
// const finiteTraceSpecification = (
//   events: ProcessTraceSpecification["events"],
//   variants: FiniteTraceLanguage["variants"],
// ): ProcessTraceSpecification => ({
//   events,
//   language: { kind: "finite_traces", variants },
// });
//
// describe("generic capture trace comparison", () => {
//   it("requires explicit partial ordering and never infers causality from timestamps", () => {
//     const specification = partialSpecification();
//     const left = capture(values(["terminal", "process"]));
//     const right = capture(values(["process", "terminal"]));
//     expect(compareProcessTraces(left, right, specification)).toMatchObject({
//       verdict: "different",
//       diagnostic: { kind: "edge", side: "right" },
//     });
//
//     const concurrent: ProcessTraceSpecification = {
//       ...specification,
//       language: {
//         kind: "partial_order",
//         happens_before: [],
//         not_before: [],
//         unordered_groups: [{ events: ["ready", "worker"] }],
//         prefix: [],
//         suffix: [],
//       },
//     };
//     expect(compareProcessTraces(left, right, concurrent)).toMatchObject({
//       verdict: "equivalent",
//     });
//   });
//
//   it("rejects malformed result contracts", () => {
//     const result = compareProcessTraces(
//       capture(values(["terminal", "process"])),
//       capture(values(["terminal", "process"])),
//       partialSpecification(),
//     );
//     expect(
//       processTraceComparisonResultSchema.safeParse({
//         ...result,
//         right: {
//           ...result.right,
//           status: "fail",
//           matched_variant: "invented",
//         },
//       }).success,
//     ).toBe(false);
//   });
//
//   it("supports declared optional events and bounded duplicates", () => {
//     const first = { sequence: 0, at_ms: 1, data: "tick" };
//     const second = { sequence: 1, at_ms: 2, data: "tick" };
//     const one = capture({
//       frames: [first],
//       process_samples: [],
//       event_journal: [{ collection: "frames", index: 0 }],
//     });
//     const two = capture({
//       frames: [first, second],
//       process_samples: [],
//       event_journal: [
//         { collection: "frames", index: 0 },
//         { collection: "frames", index: 1 },
//       ],
//     });
//     const specification = finiteTraceSpecification(
//       [
//         {
//           id: "tick1",
//           source: "terminal_raw",
//           exact: first,
//           cardinality: { kind: "required" },
//         },
//         {
//           id: "tick2",
//           source: "terminal_raw",
//           exact: second,
//           cardinality: { kind: "optional" },
//         },
//       ],
//       [
//         { id: "one", trace: ["tick1"] },
//         { id: "two", trace: ["tick1", "tick2"] },
//       ],
//     );
//     expect(compareProcessTraces(one, two, specification)).toMatchObject({
//       verdict: "equivalent",
//       left: { matched_variant: "one" },
//       right: { matched_variant: "two" },
//     });
//   });
//
//   it("compares a declared identifier the comparison result can represent", () => {
//     // The specification owns the trace identifier vocabulary and the result
//     // echoes those identifiers verbatim, so both must accept the same values
//     // rather than handing the caller a raw schema error for its own input.
//     const eventId = `e${"0".repeat(64)}`;
//     const specification = finiteTraceSpecification(
//       [
//         {
//           id: eventId,
//           source: "terminal_raw",
//           exact: terminal,
//           cardinality: { kind: "required" },
//         },
//       ],
//       [{ id: "only", trace: [eventId] }],
//     );
//     expect(specificationSchema.safeParse(specification).success).toBe(true);
//     const left = capture(values(["terminal", "process"]));
//     expect(compareProcessTraces(left, left, specification)).toMatchObject({
//       verdict: "equivalent",
//       left: { matched_variant: "only", raw_trace: [{ event_id: eventId }] },
//     });
//   });
// });
//
// describe("finite trace variant mismatch attribution", () => {
//   it("reports tied best-prefix omissions across variants", () => {
//     const observed = capture({
//       frames: [terminal],
//       process_samples: [],
//       event_journal: [{ collection: "frames", index: 0 }],
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
//           id: "worker_alt",
//           source: "process",
//           exact: { ...processStarted, command: "alternate-worker" },
export const _l = 183;
