export const __stub = 1;
//         file: metadata,
//       });
//       const frame = `${JSON.stringify(request)}\n`;
//       if (Buffer.byteLength(frame) > DEFAULTS.protocolBytes)
//         throw new AnalysisResourceConstraintError(
//           OPERATION,
//           "transport",
//           `Source identity for ${file.path} exceeds the worker request byte budget`,
//           { worker_request_bytes: DEFAULTS.protocolBytes },
//         );
//       const stdin = supervisor.launch.process.stdin;
//       if (stdin === undefined || stdin === null)
//         throw new TypeError("JavaScript worker has no writable request stream");
//       await new Promise<void>((resolve, reject) =>
//         stdin.write(frame, (error) =>
//           error === null || error === undefined ? resolve() : reject(error),
//         ),
//       );
//       for (;;) {
//         const response = await this.#next(deadline, file.path);
//         if (response.kind === "ready" || response.id !== id)
//           throw new AnalysisOutputError(
//             OPERATION,
//             "JavaScript worker response names a different source job",
//           );
//         if (response.kind === "phase") {
//           this.#phase = response.phase;
//           continue;
//         }
//         if (response.kind === "static") {
//           if (javascript !== null)
//             throw new AnalysisOutputError(
//               OPERATION,
//               "JavaScript worker emitted a duplicate static checkpoint",
//             );
//           javascript = await this.#readCheckpoint(id, file.path, response);
//           if (this.#parentCapacityExhausted)
//             throw new AnalysisResourceConstraintError(
//               OPERATION,
//               "memory",
//               `The parent's result capacity was exhausted after retaining static facts for ${file.path}; remaining sources were not analyzed`,
//               {
//                 ...this.#limits(),
//                 parent_result_budget_bytes: this.#resultBudgetBytes,
//                 parent_result_budget_exhausted: true,
//               },
//             );
//           offeredResultBudget =
//             this.#applicationProjectionFailure !== undefined &&
//             this.#sourcesRemaining !== undefined &&
//             this.#sourcesRemaining > 0
//               ? 0
//               : this.#remainingResultBudget();
//           const admission = javaScriptWorkerAdmissionSchema.parse({
//             id,
//             semantic_result_budget_bytes: offeredResultBudget,
//           });
//           await new Promise<void>((resolve, reject) =>
//             stdin.write(`${JSON.stringify(admission)}\n`, (error) =>
//               error === null || error === undefined ? resolve() : reject(error),
//             ),
//           );
//           continue;
//         }
//         if (response.kind === "failure") {
//           if (response.reason === "resource") {
//             result = err({
//               javascript,
//               module,
//               projection,
//               error: new AnalysisResourceConstraintError(
//                 OPERATION,
//                 response.resource ?? "memory",
//                 response.message,
//                 { ...this.#limits(), ...response.limits },
//               ),
//             });
//             break;
//           }
//           throw new AnalysisOutputError(
//             OPERATION,
//             `${file.path} during ${this.#phase}: ${response.message}`,
//           );
//         }
//         if (javascript === null)
//           throw new AnalysisOutputError(
//             OPERATION,
//             "JavaScript worker completed before a static checkpoint",
//           );
//         if (response.descriptor === null) {
//           result = ok({ javascript, module: null, projection: null });
//           break;
//         }
//         const descriptor = response.descriptor;
//         // JSON bytes alone omit object/array overhead and the later graph/Evidence
//         // sealing/serialization copies. Reserve a conservative expansion budget.
//         const moduleEstimate = javaScriptTransferRetentionBytes(
//           descriptor.module_bytes,
//           descriptor.module_records,
//         );
//         const graphEstimate = javaScriptTransferRetentionBytes(
//           descriptor.graph_bytes,
//           descriptor.graph_records,
//         );
//         const remaining = Math.min(
//           offeredResultBudget,
//           this.#remainingResultBudget(),
//         );
//         if (moduleEstimate > remaining) {
//           result = err({
//             javascript,
//             module: null,
//             projection: null,
//             error: new AnalysisResourceConstraintError(
//               OPERATION,
//               "memory",
//               `Completed module facts for ${file.path} exceed the parent's remaining result budget; static facts were retained`,
//               {
//                 ...this.#limits(),
//                 parent_result_budget_bytes: this.#resultBudgetBytes,
//                 parent_available_result_budget_bytes: remaining,
//                 module_transfer_bytes: descriptor.module_bytes,
//                 module_retention_estimate_bytes: moduleEstimate,
//               },
//               {
//                 remediationAction:
//                   "Use the retained static facts or analyze fewer source files. This limit belongs to the parent result budget; increasing the worker heap alone does not increase it.",
//               },
//             ),
//           });
//           break;
//         }
//         const retainGraph = moduleEstimate + graphEstimate <= remaining;
//         this.#phase = "result-admission";
//         const decoded = await readJavaScriptAnalysisTransfer(
//           join(root.path, `${id}.records`),
//           descriptor,
//           file,
//           deadline.signal,
//           retainGraph,
//         );
//         module = decoded.module;
//         projection = decoded.projection;
//         this.#estimatedRetainedBytes +=
//           moduleEstimate + (retainGraph ? graphEstimate : 0);
//         result = retainGraph
//           ? ok({ javascript, module, projection: decoded.projection })
//           : err({
//               javascript,
//               module,
//               projection,
//               error: new AnalysisResourceConstraintError(
//                 OPERATION,
//                 "memory",
//                 `Semantic graph for ${file.path} exceeds the parent's remaining result budget; static and module facts were retained`,
//                 {
//                   ...this.#limits(),
//                   parent_result_budget_bytes: this.#resultBudgetBytes,
//                   parent_available_result_budget_bytes: remaining,
//                   module_retention_estimate_bytes: moduleEstimate,
//                   graph_retention_estimate_bytes: graphEstimate,
//                   graph_transfer_bytes: descriptor.graph_bytes,
//                   graph_records: descriptor.graph_records,
//                 },
//                 {
//                   remediationAction:
//                     "Use the retained static and module facts or analyze fewer source files. This limit belongs to the parent result budget; increasing the worker heap alone does not increase it.",
//                 },
//               ),
//             });
//         break;
//       }
//       // An allocation failure may surface as a protocol failure or be caught
//       // inside the worker; any reached limit makes this file's result partial.
//       if (this.#memoryLimitReached()) throw this.#memoryFailure(file.path);
//     } catch (cause: unknown) {
//       const error = this.#failure(cause, file.path, deadline, signal);
//       this.#lastFailure = error;
//       // Complete checkpoints remain readable after a child crash or cancellation.
//       const cleanup = await this.#stop(error);
//       if (
//         cleanup === undefined &&
//         javascript === null &&
//         this.#root !== undefined
//       ) {
//         try {
//           javascript = await this.#readCheckpoint(id, file.path);
//         } catch (checkpointCause: unknown) {
//           void checkpointCause;
//         }
//       }
//       result = err({ error: cleanup ?? error, javascript, module, projection });
//     } finally {
//       deadline?.dispose();
//     }
//     if (result.ok) this.#lastFailure = undefined;
//     else if (!(result.error.error instanceof ProviderCleanupError))
//       this.#lastFailure = result.error.error;
//     // Child stop must be verified before temporary files are released. On
//     // cleanup uncertainty, close retains this owner for a later retry.
//     if (this.#root !== undefined && !pendingCleanup.has(this)) {
//       try {
//         for (const suffix of ["source", "static.json", "records"])
//           await rm(join(this.#root.path, `${id}.${suffix}`), { force: true });
//       } catch (cause: unknown) {
//         pendingCleanup.add(this);
//         return err({
export const _l = 207;
