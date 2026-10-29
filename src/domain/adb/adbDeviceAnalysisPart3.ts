export const __stub = 1;
//   z.strictObject({
//     operation: z.literal("collect_adb_bugreport"),
//     input: adbInputSchemas.collect_adb_bugreport,
//   }),
//   z.strictObject({
//     operation: z.literal("resolve_adb_packages"),
//     input: adbInputSchemas.resolve_adb_packages,
//   }),
//   z.strictObject({
//     operation: z.literal("install_adb_package"),
//     input: adbInputSchemas.install_adb_package,
//   }),
//   z.strictObject({
//     operation: z.literal("uninstall_adb_package"),
//     input: adbInputSchemas.uninstall_adb_package,
//   }),
//   z.strictObject({
//     operation: z.literal("start_adb_app"),
//     input: adbInputSchemas.start_adb_app,
//   }),
//   z.strictObject({
//     operation: z.literal("start_adb_activity"),
//     input: adbInputSchemas.start_adb_activity,
//   }),
//   z.strictObject({
//     operation: z.literal("stop_adb_app"),
//     input: adbInputSchemas.stop_adb_app,
//   }),
// ]);
//
// const client = z.strictObject({
//   binary_path: z.string().min(1),
//   path_source: z.enum(["environment", "path"]),
//   version: z.string().min(1).nullable(),
//   installed_path: z.string().min(1).nullable(),
// });
//
// const device = z.strictObject({
//   serial: z.string().min(1),
//   state: adbDeviceStateSchema,
//   transport: z.enum(["usb", "tcp", "unknown"]),
//   product: z.string().nullable(),
//   model: z.string().nullable(),
//   device: z.string().nullable(),
//   transport_id: z.number().int().positive().nullable(),
//   /**
//    * Inferred device kind with its evidence basis. The serial prefix and the
//    * `device:` metadata line are observations; the kind itself is derived.
//    */
//   kind: z.enum(["emulator", "physical", "unknown"]),
//   kind_basis: z.enum(["emulator_serial_prefix", "usb_transport", "none"]),
// });
//
// const pulledArtifact = z.strictObject({
//   device_path: z.string().min(1),
//   file_name: z.string().min(1),
//   local_path: z.string().min(1),
//   bytes: z.number().int().nonnegative(),
//   sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//   role: z.enum(["base", "split", "unknown"]),
//   role_basis: z.literal("file_name"),
// });
//
// const pullFailure = z.strictObject({
//   device_path: z.string().min(1).nullable(),
//   stage: z.enum(["resolve_paths", "pull", "digest"]),
//   message: z.string().min(1),
// });
//
// /** Portable ADB observations with explicit identity and coverage limitations. */
// export const adbResultSchemas = {
//   inspect_adb_client: z.strictObject({
//     client,
//     /**
//      * `adb version` never contacts the adb server; this tool starts nothing.
//      * Recorded explicitly so the session keeps the distinction observable.
//      */
//     contacted_adb_server: z.literal(false),
//   }),
//   list_adb_devices: z.strictObject({
//     client,
//     devices: z.array(device),
//     /**
//      * Starting the local adb server is an adb client behavior on first use;
//      * REA observes whichever server state the caller's environment has.
//      */
//     may_have_started_adb_server: z.boolean(),
//   }),
//   inspect_adb_device: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     properties: z.array(
//       z.strictObject({ name: z.string().min(1), value: z.string().min(1) }),
//     ),
//     property_count: z.number().int().nonnegative(),
//     emulator_observed: z.boolean().nullable(),
//   }),
//   list_adb_packages: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     scope: z.enum(["all", "third_party", "system"]),
//     packages: z.array(
//       z.strictObject({
//         package_name: packageNameSchema,
//         /** Device filesystem path; not a host-local path. */
//         base_apk_device_path: z.string().min(1),
//       }),
//     ),
//     unparsed_lines: z.array(z.string().min(1)),
//     coverage: z.enum(["complete", "partial"]),
//   }),
//   pull_adb_package: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     package_name: packageNameSchema,
//     output_directory: z.string().min(1),
//     artifacts: z.array(pulledArtifact),
//     failures: z.array(pullFailure),
//     coverage: z.enum(["complete", "partial"]),
//   }),
//   read_adb_logcat: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     count: z.number().int().positive(),
//     buffer: z.enum(["main", "system", "radio", "events", "crash"]),
//     pid: z.number().int().positive().nullable(),
//     lines: z.array(z.string()),
//     total_bytes: z.number().int().nonnegative(),
//     coverage: z.enum(["complete", "partial"]),
//   }),
//   inspect_adb_package: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     package_name: packageNameSchema,
//     version_name: z.string().nullable(),
//     version_code: z
//       .string()
//       .regex(/^-?\d+$/u)
//       .nullable()
//       .describe(
//         "Long version code exactly as dumpsys package prints it; may exceed the JSON safe-integer range",
//       ),
//     first_install_time: z.string().nullable(),
//     last_update_time: z.string().nullable(),
//     installer_package_name: z.string().nullable(),
//     user_id: z.number().int().nullable(),
//     pkg_flags: z.string().nullable(),
//     requested_permissions_count: z.number().int().nonnegative().nullable(),
//     coverage: z.enum(["complete", "partial"]),
//   }),
//   pull_adb_file: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     device_path: z.string().min(1),
//     local_path: z.string().min(1),
//     bytes: z.number().int().nonnegative(),
//     sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//   }),
//   push_adb_file: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     local_path: z.string().min(1),
//     device_path: z.string().min(1),
//     bytes: z.number().int().nonnegative(),
//     sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//     device_sha256: z
//       .string()
//       .regex(/^[a-f0-9]{64}$/u)
//       .nullable(),
//     overwritten: z.boolean(),
//     device_digest_source: z.enum(["device_sha256sum", "unavailable"]),
//   }),
//   capture_adb_screen: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     local_path: z.string().min(1),
//     bytes: z.number().int().nonnegative(),
//     sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//     width: z.number().int().positive().nullable(),
//     height: z.number().int().positive().nullable(),
//   }),
//   list_adb_processes: z.strictObject({
//     client,
//     serial: z.string().min(1),
//     columns: z.string().nullable(),
//     processes: z.array(
//       z.strictObject({
//         user: z.string(),
//         pid: z.number().int().nonnegative(),
//         ppid: z.number().int().nullable(),
//         rss: z.number().int().nullable(),
//         state: z.string().nullable(),
//         name: z.string(),
//       }),
//     ),
//     unparsed_lines: z.array(z.string().min(1)),
//     coverage: z.enum(["complete", "partial"]),
export const _l = 197;
