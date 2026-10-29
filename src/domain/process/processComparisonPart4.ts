export const __stub = 1;
//     processSourceTruncated(right, source)
//       ? "unknown"
//       : classifyCollection(leftValues, rightValues);
//   return {
//     terminal: classify(
//       "terminal",
//       terminalObservations(left),
//       terminalObservations(right),
//       "terminal_rendered",
//     ),
//     interaction: classify(
//       "interaction",
//       left.interaction_events,
//       right.interaction_events,
//       "interaction",
//     ),
//     exit:
//       hasUnknown(left, "exit") || hasUnknown(right, "exit")
//         ? "unknown"
//         : sameJsonValue(
//               { exit: left.exit, settlement: left.settlement },
//               { exit: right.exit, settlement: right.settlement },
//             )
//           ? "unchanged"
//           : "changed",
//     filesystem: classify(
//       "filesystem",
//       filesystemObservations(left),
//       filesystemObservations(right),
//       "filesystem",
//     ),
//     process: classify(
//       "process",
//       left.process_samples,
//       right.process_samples,
//       "process",
//     ),
//   };
// };
//
// /**
//  * Compare two process capture observations without treating absence as proof.
//  *
//  * Observed differences outrank residual unknowns. A capture may therefore be
//  * definitively changed in one dimension while completeness remains unknown.
//  */
// export const compareProcessCaptures = (
//   left: ProcessCapture,
//   right: ProcessCapture,
//   options: {
//     readonly maxCaptureAgeMs?: number;
//     readonly now?: () => number;
//     readonly traceSpecification?: ProcessTraceSpecification;
//   } = {},
// ): ProcessCaptureComparison => {
//   assertComparable(left, right, options);
//   const sameNormalization = sameJsonValue(
//     left.normalization,
//     right.normalization,
//   );
//   const exactDimensions = compareDimensions(left, right, sameNormalization);
//   const trace =
//     options.traceSpecification === undefined
//       ? undefined
//       : compareProcessTraces(left, right, options.traceSpecification);
//   const dimensions =
//     trace === undefined || options.traceSpecification === undefined
//       ? exactDimensions
//       : applyTraceVerdict(exactDimensions, options.traceSpecification, trace, [
//           left,
//           right,
//         ]);
//   const divergenceCandidates = PROCESS_COMPARISON_DIMENSIONS.map((dimension) =>
//     dimensions[dimension] === "unknown"
//       ? null
//       : firstCollectionDivergence(
//           dimension,
//           processDimensionObservations(left, dimension),
//           processDimensionObservations(right, dimension),
//         ),
//   );
//   const observedFirstDivergence = chooseFirstDivergence(
//     divergenceCandidates.map((candidate) =>
//       candidate !== null &&
//       trace?.verdict === "equivalent" &&
//       dimensions[candidate.dimension] === "unchanged"
//         ? null
//         : candidate,
//     ),
//   );
//   const firstDivergence =
//     left.truncated || right.truncated
//       ? ({
//           status: "unknown",
//           reason:
//             "Incomplete observations prevent locating the first divergence; unaffected dimensions retain their comparisons.",
//         } as const)
//       : trace?.verdict === "equivalent" &&
//           deriveProcessComparisonStatus(
//             PROCESS_COMPARISON_DIMENSIONS.map(
//               (dimension) => dimensions[dimension],
//             ),
//           ) === "unchanged"
//         ? ({ status: "none" } as const)
//         : observedFirstDivergence.status === "found"
//           ? observedFirstDivergence
//           : !sameNormalization ||
//               left.residual_unknowns.length > 0 ||
//               right.residual_unknowns.length > 0
//             ? ({
//                 status: "unknown",
//                 reason:
//                   "Residual unknowns prevent proving that no divergence occurred.",
//               } as const)
//             : observedFirstDivergence;
//   const observedStatus = deriveProcessComparisonStatus(
//     PROCESS_COMPARISON_DIMENSIONS.map((dimension) => dimensions[dimension]),
//   );
//   return {
//     status: observedStatus,
//     ...dimensions,
//     first_divergence: firstDivergence,
//     ...(trace === undefined ? {} : { trace }),
//     limitations: [
//       ...left.limitations,
//       ...right.limitations,
//       ...left.residual_unknowns.map(({ reason }) => reason),
//       ...right.residual_unknowns.map(({ reason }) => reason),
//       ...(sameNormalization ? [] : ["Capture normalization rules differ."]),
//     ],
//   };
// };
export const _l = 132;
