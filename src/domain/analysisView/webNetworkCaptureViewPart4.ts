export const __stub = 1;
//     report.artifact.sha256 !== null &&
//     (parent.subject == null ||
//       parent.subject.local_path !== report.artifact.path ||
//       parent.subject.digest.sha256 !== report.artifact.sha256)
//   )
//     return err(
//       analysisViewInputError([
//         {
//           path: ["source", "subject"],
//           reason: "invalid_value",
//           message:
//             "Capture parent subject must identify the report's exact path and SHA-256.",
//         },
//       ]),
//     );
//   return ok(report);
// };
//
// /** Page immutable retained facts; no capture file, provider or network is consulted. */
// export const projectWebNetworkCaptureView = (
//   parent: AnalysisViewParent,
//   view: AnalysisViewRequest,
// ): Result<UnsignedAnalysisView, AnalysisError> => {
//   if (
//     view.kind !== "summary" &&
//     view.kind !== "capture" &&
//     view.kind !== "qlog"
//   )
//     return err(
//       analysisViewInputError([
//         {
//           path: ["view"],
//           reason: "invalid_value",
//           message:
//             "Historical captures support summary, capture record pages, qlog fact pages and admitted api-surface views.",
//         },
//       ]),
//     );
//   const parsed = parseCaptureParent(parent);
//   if (!parsed.ok) return parsed;
//   const report = parsed.value;
//   const shared = {
//     parent_evidence_id: parent.evidenceId,
//     parent_operation: "inspect_web_network_capture" as const,
//     parent_digest: parent.evidenceId.slice(3),
//     artifact: { path: report.artifact.path, sha256: report.artifact.sha256 },
//     limitations: [
//       ...new Set([
//         ...parent.limitations,
//         ...report.limitations,
//         "Capture record pages cover the records selected into the parent Evidence, in that selected order; total_records counts the original decoded capture.",
//       ]),
//     ],
//     unknowns: [
//       "Historical records do not establish live runtime attribution or deployment authenticity.",
//       ...(report.artifact.sha256 === null
//         ? ["The explicitly excluded artifact digest remains unknown."]
//         : []),
//     ],
//   };
//   if (view.kind === "summary")
//     return ok({
//       kind: "summary",
//       view,
//       ...shared,
//       summary: {
//         artifact: report.artifact,
//         decoder: report.decoder,
//         format: report.format,
//         total_records: report.total_records,
//         retained_records: report.records.length,
//         runtime_attribution: report.runtime_attribution,
//         ...(report.format === "qlog"
//           ? { qlog: summarizeQlogCapture(report.qlog) }
//           : {}),
//       },
//       coverage: completeWithinViewCoverage(
//         report.records.length,
//         report.records.length,
//       ),
//     });
//   if (view.kind === "qlog") {
//     if (report.format !== "qlog")
//       return err(
//         analysisViewInputError([
//           {
//             path: ["view", "kind"],
//             reason: "invalid_value",
//             message: "Qlog fact views require retained qlog Evidence.",
//           },
//         ]),
//       );
//     const projected = projectQlogCapturePage(report.qlog, view);
//     return projected.ok
//       ? ok({
//           kind: "qlog",
//           view,
//           ...shared,
//           ...projected.value,
//           limitations: [
//             ...shared.limitations,
//             "Qlog fact pages retain all-recorded-events-before-selection scope. Exhausting a page does not establish network completeness, body recovery, retransmission or actual loss.",
//           ],
//         })
//       : projected;
//   }
//   const records = report.records.slice(view.offset, view.offset + view.limit);
//   return ok({
//     kind: "capture",
//     view,
//     ...shared,
//     items: captureViewItemsSchema.parse(
//       view.detail === "complete"
//         ? records
//         : records.map((record) => preview(record, report.format)),
//     ),
//     coverage: pageViewCoverage(
//       view.offset,
//       records.length,
//       report.records.length,
//     ),
//     limitations: [
//       ...shared.limitations,
//       ...(view.detail === "preview"
//         ? [
//             "Preview selects recorded headline fields and byte descriptors; headers, XML, bodies, message data and other fields remain in complete record pages. Missing preview fields do not establish their absence from the producer record.",
//           ]
//         : []),
//     ],
//   });
// };
export const _l = 131;
