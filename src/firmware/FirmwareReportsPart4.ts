export const __stub = 1;
//           diagnostics.push(
//             extractionDiagnostic(
//               path,
//               parsed.handler_name,
//               jsonValueSchema.parse(item),
//             ),
//           );
//           // The report owns its failure and dependencies. A produced subtask
//           // is a derivation, not a new owner for the parent's report.
//           const dependencies = dependencyNames(parsed.extraction_reports);
//           const rows =
//             dependencies === null
//               ? [{ dependencies: [] as readonly string[] }]
//               : dependencyRows(dependencies);
//           for (const row of rows)
//             failedExtractionStages.push({
//               input_path: path,
//               provider_id: parsed.id,
//               handler: parsed.handler_name,
//               dependencies:
//                 dependencies === null
//                   ? []
//                   : uniqueSorted([...row.dependencies]),
//               kind:
//                 dependencies === null
//                   ? "extractor-failure"
//                   : "missing-extractor-dependency",
//             });
//         }
//       }
//     }
//   }
//   const recordsByPath = new Map(
//     records.map((record) => [record.task.path, record.task]),
//   );
//   const derivations = records.flatMap((record) =>
//     record.subtasks.map((child) => {
//       const parentPath = logical(record.task.path);
//       const childPath = logical(child.path);
//       if (!seen.has(childPath))
//         throw new AnalysisOutputError(
//           "extract_firmware",
//           `Missing child task: ${childPath}`,
//         );
//       const reportedChild = recordsByPath.get(child.path);
//       if (
//         reportedChild?.depth !== child.depth ||
//         reportedChild.blob_id !== child.blob_id ||
//         reportedChild.is_multi_file !== child.is_multi_file
//       )
//         throw new AnalysisOutputError(
//           "extract_firmware",
//           `Child task identity disagrees with its analysis: ${childPath}`,
//         );
//       const origin = blobOrigins.get(
//         JSON.stringify([parentPath, child.blob_id]),
//       );
//       return {
//         parent_path: parentPath,
//         child_path: childPath,
//         provider_blob_id: child.blob_id,
//         handler: origin?.handler ?? null,
//         parent_file_range: origin?.range ?? null,
//       };
//     }),
//   );
//   const reachable = new Set(["$input"]);
//   const pending = ["$input"];
//   const childrenByParent = new Map<string, string[]>();
//   for (const edge of derivations) {
//     const children = childrenByParent.get(edge.parent_path) ?? [];
//     children.push(edge.child_path);
//     childrenByParent.set(edge.parent_path, children);
//   }
//   while (pending.length > 0) {
//     const parent = pending.pop();
//     for (const child of childrenByParent.get(parent ?? "") ?? []) {
//       if (reachable.has(child)) continue;
//       reachable.add(child);
//       pending.push(child);
//     }
//   }
//   if (reachable.size !== seen.size)
//     throw new AnalysisOutputError(
//       "extract_firmware",
//       "Report contains tasks disconnected from the selected input",
//     );
//   return {
//     files,
//     sizes,
//     chunks,
//     derivations,
//     depth_limited_paths: depths.sort(),
//     failed_extraction_stages: failedExtractionStages.sort((left, right) =>
//       `${left.input_path}\u0000${left.provider_id ?? ""}` <
//       `${right.input_path}\u0000${right.provider_id ?? ""}`
//         ? -1
//         : `${left.input_path}\u0000${left.provider_id ?? ""}` >
//             `${right.input_path}\u0000${right.provider_id ?? ""}`
//           ? 1
//           : 0,
//     ),
//     diagnostics,
//     missing_dependencies: [...missingDependencies.entries()]
//       .flatMap(([input_path, facts]) =>
//         dependencyRows(facts).map(({ dependencies }) => ({
//           input_path,
//           dependencies,
//         })),
//       )
//       .sort((left, right) =>
//         left.input_path < right.input_path
//           ? -1
//           : left.input_path > right.input_path
//             ? 1
//             : 0,
//       ),
//     chunk_missing_dependencies: [...chunkMissingDependencies.entries()]
//       .flatMap(([key, facts]) => {
//         const [input_path, provider_id] = JSON.parse(key) as [string, string];
//         return dependencyRows(facts).map(({ dependencies }) => ({
//           input_path,
//           provider_id,
//           dependencies,
//         }));
//       })
//       .sort((left, right) =>
//         `${left.input_path}\u0000${left.provider_id}` <
//         `${right.input_path}\u0000${right.provider_id}`
//           ? -1
//           : `${left.input_path}\u0000${left.provider_id}` >
//               `${right.input_path}\u0000${right.provider_id}`
//             ? 1
//             : 0,
//       ),
//     coverage:
//       depths.length > 0 ||
//       diagnostics.length > 0 ||
//       chunks.some((c) => c.handler === null || c.encrypted === true)
//         ? ("partial" as const)
//         : ("complete" as const),
//   };
// };
export const _l = 143;
