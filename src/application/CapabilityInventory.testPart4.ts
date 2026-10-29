export const __stub = 1;
//
// describe("binary_overview capability requirements", () => {
//   it("admits a provider with current_document and other mandatory capabilities", () => {
//     const capabilities = [
//       "current_document",
//       "list_procedures",
//       "list_strings",
//     ].map((operation) => ({ operation, available: true, reason: null }));
//     expect(
//       entry(
//         "binary_overview",
//         status({ open: true, kind: "executable", capabilities }),
//       ),
//     ).toMatchObject({
//       available: true,
//       reason: "available",
//       remediation: null,
//     });
//   });
//
//   it("admits a provider with list_documents and other mandatory capabilities", () => {
//     const capabilities = [
//       "list_documents",
//       "list_procedures",
//       "list_strings",
//     ].map((operation) => ({ operation, available: true, reason: null }));
//     expect(
//       entry(
//         "binary_overview",
//         status({ open: true, kind: "executable", capabilities }),
//       ),
//     ).toMatchObject({
//       available: true,
//       reason: "available",
//       remediation: null,
//     });
//   });
//
//   it("reports document selection remediation when neither current_document nor list_documents is declared", () => {
//     const capabilities = [
//       "list_segments",
//       "list_procedures",
//       "list_strings",
//     ].map((operation) => ({ operation, available: true, reason: null }));
//     expect(
//       entry(
//         "binary_overview",
//         status({ open: true, kind: "executable", capabilities }),
//       ),
//     ).toMatchObject({
//       available: false,
//       reason: "provider_missing",
//       remediation:
//         "Configure a provider for one of: current_document, list_documents.",
//     });
//   });
//
//   it("admits a provider without optional segment enumeration", () => {
//     const capabilities = [
//       "current_document",
//       "list_procedures",
//       "list_strings",
//     ].map((operation) => ({ operation, available: true, reason: null }));
//     expect(
//       entry(
//         "binary_overview",
//         status({ open: true, kind: "executable", capabilities }),
//       ),
//     ).toMatchObject({
//       available: true,
//       reason: "available",
//       remediation: null,
//     });
//   });
//
//   it("keeps binary overview available when a declared segment facet is unavailable", () => {
//     const capabilities = [
//       {
//         operation: "list_segments",
//         available: false,
//         reason: "This upstream profile does not expose segment enumeration.",
//       },
//       { operation: "list_documents", available: true, reason: null },
//       { operation: "list_procedures", available: true, reason: null },
//       { operation: "list_strings", available: true, reason: null },
//     ];
//     expect(
//       entry(
//         "binary_overview",
//         status({ open: true, kind: "executable", capabilities }),
//       ),
//     ).toMatchObject({ available: true, reason: "available" });
//   });
//
//   it("reports provider_unavailable when declared document selection capability is unavailable", () => {
//     const capabilities = [
//       { operation: "list_segments", available: true, reason: null },
//       {
//         operation: "current_document",
//         available: false,
//         reason: "Document view is closed",
//       },
//       { operation: "list_procedures", available: true, reason: null },
//       { operation: "list_strings", available: true, reason: null },
//     ];
//     expect(
//       entry(
//         "binary_overview",
//         status({ open: true, kind: "executable", capabilities }),
//       ),
//     ).toMatchObject({
//       available: false,
//       reason: "provider_unavailable",
//       remediation: "Document view is closed",
//     });
//   });
// });
//
// describe("trace_feature requirements", () => {
//   const capabilities = (operations: readonly string[]) =>
//     operations.map((operation) => ({
//       operation,
//       available: true,
//       reason: null,
//     }));
//
//   it("needs the search operations the workflow actually calls", () => {
//     expect(
//       entry(
//         "trace_feature",
//         status({
//           open: true,
//           kind: "executable",
//           capabilities: capabilities([
//             "search_strings",
//             "search_procedures",
//             "xrefs",
//             "resolve_containing_procedure",
//           ]),
//         }),
//       ),
//     ).toMatchObject({ available: true, reason: "available" });
//   });
//
//   it.each(["search_strings", "search_procedures"])(
//     "is unavailable without %s",
//     (missing) => {
//       const operations = [
//         "search_strings",
//         "search_procedures",
//         "xrefs",
//         "resolve_containing_procedure",
//       ].filter((operation) => operation !== missing);
//
//       expect(
//         entry(
//           "trace_feature",
//           status({
//             open: true,
//             kind: "executable",
//             capabilities: capabilities(operations),
//           }),
//         ),
//       ).toMatchObject({ available: false, reason: "provider_missing" });
//     },
//   );
//
//   it("is unavailable when only the list operations exist", () => {
//     expect(
//       entry(
//         "trace_feature",
//         status({
//           open: true,
//           kind: "executable",
//           capabilities: capabilities([
//             "list_strings",
//             "list_procedures",
//             "xrefs",
//             "resolve_containing_procedure",
//           ]),
//         }),
//       ),
//     ).toMatchObject({ available: false, reason: "provider_missing" });
//   });
// });
export const _l = 185;
