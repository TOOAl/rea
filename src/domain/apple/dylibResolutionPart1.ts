export const __stub = 1;
// import { z } from "zod";
//
// import {
//   compatibleSlice,
//   directoryOf,
//   expandPrefix,
//   resolveTreePath,
//   type Expansion,
// } from "./dyldPaths.js";
// import { digestSchema } from "../digests.js";
// import {
//   hasApplicableDyldOverrides,
//   embeddedDyldOverrides,
//   type DyldSearchOverride,
// } from "./dyldEnvironment.js";
// import {
//   DYLIB_RESOLUTION_LIMITATIONS,
//   deriveFindings,
//   type TracedRootSlice,
// } from "./dylibResolutionFindings.js";
//
// /**
//  * Normalized path below the analyzed root: nonempty segments joined by single
//  * `/`, none of them `.` or `..`, without backslash or NUL. Advertised schema
//  * patterns avoid look-around, which RE2 and Rust validators reject.
//  */
// const ROOT_RELATIVE_PATH =
//   /^(?:[^\x2f\\\x00.][^\x2f\\\x00]*|\.[^\x2f\\\x00.][^\x2f\\\x00]*|\.\.[^\x2f\\\x00]+)(?:\x2f(?:[^\x2f\\\x00.][^\x2f\\\x00]*|\.[^\x2f\\\x00.][^\x2f\\\x00]*|\.\.[^\x2f\\\x00]+))*$/u;
// const rootRelativePathSchema = z
//   .string()
//   .min(1)
//   .regex(
//     ROOT_RELATIVE_PATH,
//     "Use a normalized path relative to the analyzed root, without a leading or trailing '/', '//', or '.' and '..' segments",
//   );
//
// /** Caller selection of process roots and one CPU slice. */
// export const dylibResolutionInputSchema = z.strictObject({
//   roots: z.array(rootRelativePathSchema).min(1).optional(),
//   architecture: z.enum(["arm64", "arm64e", "x86_64"]).optional(),
// });
//
// const dependencyCommandSchema = z.enum([
//   "LC_LOAD_DYLIB",
//   "LC_LOAD_WEAK_DYLIB",
//   "LC_REEXPORT_DYLIB",
//   "LC_LAZY_LOAD_DYLIB",
//   "LC_LOAD_UPWARD_DYLIB",
// ]);
//
// const dependencySchema = z.strictObject({
//   command: dependencyCommandSchema,
//   encoding: z.enum(["dylib_command", "dylib_use_command"]),
//   install_name: z.string(),
//   weak: z.boolean(),
//   upward: z.boolean(),
//   reexport: z.boolean(),
//   delayed_init: z.boolean(),
//   current_version: z.string(),
//   compatibility_version: z.string(),
// });
//
// /** Observed dylib-loading facts of one Mach-O slice. */
// export const machoSliceSchema = z.strictObject({
//   architecture: z.string().min(1),
//   /** Physical identity observed in the thin header and, for FAT, its table. */
//   slice_offset: z.number().int().nonnegative(),
//   slice_size: z.number().int().positive(),
//   cpu_type: z.number().int().nonnegative(),
//   cpu_subtype: z.number().int().nonnegative(),
//   fat_cpu_type: z.number().int().nonnegative().nullable(),
//   fat_cpu_subtype: z.number().int().nonnegative().nullable(),
//   fat_alignment_exponent: z.number().int().nonnegative().nullable(),
//   file_type: z.enum(["execute", "dylib", "bundle", "other"]),
//   file_type_code: z.number().int().nonnegative(),
//   /** Raw LC_BUILD_VERSION platform number; null means no such command was observed. */
//   platform: z.number().int().nonnegative().nullable(),
//   /** Every distinct build platform declared by LC_BUILD_VERSION/version-min commands. */
//   platforms: z.array(z.number().int().nonnegative()),
//   install_name: z.string().nullable(),
//   dependencies: z.array(dependencySchema),
//   rpaths: z.array(z.string()),
//   dyld_environment: z.array(z.string()),
//   code_signature_present: z.boolean(),
// });
//
// export type MachoDependency = z.infer<typeof dependencySchema>;
// export type MachoSlice = z.infer<typeof machoSliceSchema>;
//
// /** Header parse of one file; malformed and unsupported images keep their reason. */
// export type MachoImageFacts =
//   | { readonly status: "parsed"; readonly slices: readonly MachoSlice[] }
//   | {
//       readonly status: "malformed" | "unsupported";
//       readonly reason: string;
//     }
//   | { readonly status: "not-mach-o" };
//
// /** One observed path below the analyzed root. Symlink targets are not followed by the view. */
// export type DylibTreeEntry =
//   | { readonly kind: "file" | "directory" }
//   | { readonly kind: "symlink"; readonly target: string };
//
// /** Read-only, lazily probed view of the analyzed root. Paths are root-relative. */
// export interface DylibTreeView {
//   entry(path: string): Promise<DylibTreeEntry | undefined>;
//   image(path: string): Promise<MachoImageFacts>;
// }
//
// const candidateSchema = z.strictObject({
//   path: z.string(),
//   source: z.enum([
//     "literal",
//     "executable_path",
//     "loader_path",
//     "rpath",
//     "already-loaded",
//   ]),
//   rpath: z.string().nullable(),
//   rpath_owner: z.string().nullable(),
//   outcome: z.enum([
//     "resolved",
//     "absent",
//     "not-mach-o",
//     "malformed",
//     "unsupported",
//     "architecture-missing",
//     "not-loadable",
//     "platform-mismatch",
//     "outside-target",
//     "escapes-target",
//     "undetermined",
//   ]),
//   resolved_path: z.string().nullable(),
// });
//
// const edgeSchema = z.strictObject({
//   root: z.string(),
//   architecture: z.string(),
//   loader: z.string(),
//   via: z.array(z.string()),
//   ...dependencySchema.shape,
//   candidates: z.array(candidateSchema),
//   resolution: z.strictObject({
//     status: z.enum(["resolved", "conditional", "unresolved", "undetermined"]),
//     image: z.string().nullable(),
//   }),
//   install_name_matches: z.boolean().nullable(),
//   /**
//    * The loader was reached through a conditional edge, so it might not load;
//    * this edge describes what happens only if it does.
//    */
//   loader_conditional: z.boolean(),
// });
//
// const findingSchema = z.strictObject({
//   kind: z.enum([
//     "required-load-unresolved",
//     "weak-load-unresolved",
//     "lazy-load-unresolved",
//     "earlier-rpath-candidate-absent",
//     "dyld-environment-present",
//   ]),
//   edge_index: z.number().int().nonnegative().nullable(),
//   image: z.string().nullable(),
//   basis: z.literal("derived"),
//   explanation: z.string().min(1),
// });
//
// const imageSchema = z.strictObject({
//   path: z.string(),
//   sha256: digestSchema,
//   parse_status: z.enum(["parsed", "malformed", "unsupported"]),
export const _l = 173;
