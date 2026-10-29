export const __stub = 1;
//   }),
//   list_adb_directory: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     device_path: z.string().min(1),
//     entries: z.array(
//       z.strictObject({
//         name: z.string().min(1),
//         kind: z.enum(["directory", "file", "symlink", "other"]),
//         permissions: z.string().nullable(),
//         owner: z.string().nullable(),
//         group: z.string().nullable(),
//         bytes: z.number().int().nullable(),
//         date: z.string().nullable(),
//         link_target: z.string().nullable(),
//       }),
//     ),
//     unparsed_lines: z.array(z.string().min(1)),
//     coverage: z.enum(["complete", "partial"]),
//   }),
//   list_adb_features: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     features: z.array(
//       z.strictObject({
//         name: z.string().min(1),
//         version: z.number().int().nullable(),
//       }),
//     ),
//     unparsed_lines: z.array(z.string().min(1)),
//     coverage: z.enum(["complete", "partial"]),
//   }),
//   list_adb_services: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     services: z.array(
//       z.strictObject({
//         name: z.string().min(1),
//         interface: z.string().nullable(),
//       }),
//     ),
//     unparsed_lines: z.array(z.string().min(1)),
//     coverage: z.enum(["complete", "partial"]),
//   }),
//   inspect_adb_display: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     physical_size: z.strictObject({
//       width: z.number().int().positive(),
//       height: z.number().int().positive(),
//     }),
//     override_size: z
//       .strictObject({
//         width: z.number().int().positive(),
//         height: z.number().int().positive(),
//       })
//       .nullable(),
//     physical_density: z.number().int().positive().nullable(),
//     override_density: z.number().int().positive().nullable(),
//   }),
//   inspect_adb_window: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     focused_window: z.string().nullable(),
//     focused_app: z.string().nullable(),
//     observed_lines: z.array(z.string().min(1)),
//   }),
//   read_adb_setting: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     namespace: z.enum(["system", "secure", "global"]),
//     key: z.string().min(1),
//     value: z.string().nullable(),
//     device_reported_null: z.boolean(),
//   }),
//   collect_adb_bugreport: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     local_path: z.string().min(1),
//     bytes: z.number().int().nonnegative(),
//     sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//     adb_reported_path: z.string().nullable(),
//   }),
//   resolve_adb_packages: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     query: z.string().min(1),
//     matches: z.array(
//       z.strictObject({
//         package_name: packageNameSchema,
//         base_apk_device_path: z.string().min(1),
//       }),
//     ),
//     exact_match: z.boolean(),
//     coverage: z.enum(["complete", "partial"]),
//   }),
//   install_adb_package: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     apk_path: z.string().min(1),
//     bytes: z.number().int().nonnegative(),
//     sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//     replace_requested: z.boolean(),
//     replaced: z.boolean().nullable(),
//   }),
//   uninstall_adb_package: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     package_name: packageNameSchema,
//   }),
//   start_adb_app: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     package_name: packageNameSchema,
//     component: z.string().min(1),
//     started_activity: z.string().nullable(),
//     reported_activity: z.string().nullable().optional(),
//     reported_status: z.string().nullable().optional(),
//   }),
//   start_adb_activity: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     action: z.string().min(1),
//     data_uri: z.string().nullable(),
//     component: z.string().nullable(),
//     extras: z.array(
//       z.strictObject({
//         key: z.string().min(1),
//         type: z.enum(["string", "boolean", "int", "long", "float"]),
//         value: z.string(),
//       }),
//     ),
//     started_activity: z.string().nullable(),
//     reported_activity: z.string().nullable().optional(),
//     reported_status: z.string().nullable().optional(),
//   }),
//   stop_adb_app: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     package_name: packageNameSchema,
//   }),
// } as const;
//
// /** Launch-attempt facts retained when Activity Manager does not report success. */
// export type AdbActivityStartPartialObservation =
//   | {
//       readonly provider_id: "adb";
//       readonly operation: "start_adb_app";
//       readonly result: z.infer<typeof adbResultSchemas.start_adb_app>;
//     }
//   | {
//       readonly provider_id: "adb";
//       readonly operation: "start_adb_activity";
//       readonly result: z.infer<typeof adbResultSchemas.start_adb_activity>;
//     };
//
// /** Acquired package facts retained when cancellation leaves caller-owned output. */
// export type AdbPackagePullPartialObservation = {
//   readonly provider_id: "adb";
//   readonly operation: "pull_adb_package";
//   readonly result: z.infer<typeof adbResultSchemas.pull_adb_package>;
// };
//
// /** Acquired file facts retained when publication, digest verification or cleanup fails. */
// export type AdbAcquiredFilePartialObservation =
//   | {
//       readonly provider_id: "adb";
//       readonly operation: "pull_adb_file";
//       readonly result: {
//         readonly client: z.infer<
//           typeof adbResultSchemas.pull_adb_file
//         >["client"];
//         readonly serial: string;
//         readonly local_path: string;
//         readonly device_path: string;
//         readonly digest_status: "unknown";
//       };
//     }
//   | {
//       readonly provider_id: "adb";
//       readonly operation: "collect_adb_bugreport";
//       readonly result:
//         | z.infer<typeof adbResultSchemas.collect_adb_bugreport>
//         | {
//             readonly client: z.infer<
//               typeof adbResultSchemas.collect_adb_bugreport
//             >["client"];
//             readonly serial: string;
//             readonly local_path: string;
//             readonly adb_reported_path: string;
//             readonly digest_status: "unknown";
//           };
//     };
export const _l = 193;
