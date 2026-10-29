export const __stub = 1;
//       roots.push(root);
//       const producer = new RecordingIdaMcp(target, "headless");
//       const failure =
//         "Database analysis interrupted while reading observations";
//       producer.overrideCall = (name) => {
//         if (name !== tool) return undefined;
//         const withError = (value: JsonValue): JsonValue => {
//           if (
//             value === null ||
//             typeof value !== "object" ||
//             Array.isArray(value)
//           )
//             throw new TypeError("Invalid operation fixture");
//           return { ...value, error: failure };
//         };
//         return Array.isArray(response)
//           ? response.map(withError)
//           : withError(response);
//       };
//       const client = new IdaSessionClient(
//         {
//           command: "fixture",
//           args: [],
//           env: {},
//           mode: "headless",
//           timeoutMs: 1000,
//           workspaceRoot: root,
//         },
//         target,
//         producer,
//       );
//       try {
//         const result = await client.execute(operation, parameters);
//         expect(result.ok).toBe(false);
//         if (!result.ok) {
//           expect(result.error.message).toContain(failure);
//           expect(result.error.partialObservation).toMatchObject({
//             provider: { id: "ida" },
//             operation,
//             parameters,
//             normalized_result: {
//               status: "partial",
//               failed_operation: operation,
//               observations: expect.arrayContaining([
//                 expect.objectContaining({ tool }),
//               ]),
//               metadata_before: expect.any(Object),
//             },
//             locations: expect.arrayContaining([
//               { kind: "artifact-path", path: target.path },
//             ]),
//           });
//           expect(
//             projectAnalysisError(result.error).details?.partial_observation,
//           ).toMatchObject({ normalized_result: { status: "partial" } });
//         }
//       } finally {
//         expect((await client.close()).ok).toBe(true);
//       }
//     },
//   );
// });
//
// const lookup = (query: string, fn: JsonValue, error: string | null) => [
//   { query, fn, error },
// ];
// const knownFunction = { addr: "0x1000", name: "main", size: "0x20" };
//
// const missingProcedureFixture = async (
//   answer: (query: string) => JsonValue | undefined,
// ) => {
//   const { root, target } = await createIdaTarget();
//   roots.push(root);
//   const producer = new RecordingIdaMcp(target, "headless");
//   producer.overrideCall = (name, args) => {
//     if (name !== "lookup_funcs") return undefined;
//     const queries = args.queries;
//     const query = Array.isArray(queries) ? String(queries[0]) : "";
//     return answer(query);
//   };
//   const client = new IdaSessionClient(
//     {
//       command: "fixture",
//       args: [],
//       env: {},
//       mode: "headless",
//       timeoutMs: 1000,
//       workspaceRoot: root,
//     },
//     target,
//     producer,
//   );
//   return client;
// };
//
// describe("headless IDA procedure lookup failures", () => {
//   it.each([
//     ["Not found", "procedure_pseudo_code", "main"],
//     ["Not found", "procedure_address", "main"],
//     ["Not found", "analyze_function", "main"],
//     ["Not a function", "procedure_pseudo_code", "main"],
//     ["Not a function", "read_function_instructions", "main"],
//     ["Not a function", "procedure_pseudo_code", "0x1000"],
//     ["Not found", "procedure_assembly", "_missing"],
//     ["Not found", "procedure_pseudo_code", "main\nsecond line"],
//   ] as const)(
//     "reports the upstream %s answer for %s of %s as an invalid request naming the procedure",
//     async (upstream, operation, procedure) => {
//       const client = await missingProcedureFixture((query) =>
//         lookup(query, null, upstream),
//       );
//       try {
//         const result = await client.execute(operation, { procedure });
//
//         if (result.ok) throw new Error("expected invalid input");
//         expect(result.error._tag, "the caller's procedure is the fault").toBe(
//           "AnalysisInputError",
//         );
//         const projected = projectAnalysisError(result.error);
//         expect(projected.code, "the public code is invalid_request").toBe(
//           "invalid_request",
//         );
//         expect(projected.category, "the category is invalid_input").toBe(
//           "invalid_input",
//         );
//         expect(projected.retryable, "the caller can correct and retry").toBe(
//           true,
//         );
//         expect(
//           projected.details,
//           "the operation and exactly one issue that names the procedure in its message",
//         ).toMatchObject({
//           operation,
//           issues: [
//             {
//               path: [],
//               reason: "invalid_value",
//               message: `IDA could not resolve procedure ${JSON.stringify(procedure)}: ${upstream}.`,
//             },
//           ],
//         });
//         if (!(result.error instanceof AnalysisInputError))
//           throw new Error("expected an AnalysisInputError");
//         expect(
//           result.error.issues.map(({ message }) => message ?? "").join(""),
//           "a control character in the query is carried JSON-escaped, never raw",
//         ).not.toContain("\n");
//         expect(
//           (result.error.cause as Error | undefined)?.message,
//           "the upstream text stays on the retained cause",
//         ).toContain(upstream);
//         expect(
//           JSON.stringify(projected).toLowerCase(),
//           "no retry or doctor advice for a caller mistake",
//         ).not.toMatch(/doctor|retry once/u);
//       } finally {
//         expect((await client.close()).ok).toBe(true);
//       }
//     },
//   );
//
//   it.each([
//     ["an upstream exception text", lookup("main", null, "Database is closed")],
//     ["a function with an error", lookup("main", knownFunction, "Not found")],
//     ["neither a function nor an error", lookup("main", null, null)],
//     [
//       "a near-miss spelling of the not-found text",
//       lookup("main", null, "not found"),
//     ],
//     [
//       "an exception text that merely contains the not-found text",
//       lookup("main", null, "Database lookup failed: Not found"),
//     ],
//     ["a padded not-found text", lookup("main", null, " Not found ")],
//     ["an empty error", lookup("main", null, "")],
//     ["a whitespace-only error", lookup("main", null, "  ")],
//     ["an answer for a different query", lookup("helper", null, "Not found")],
//     [
export const _l = 178;
