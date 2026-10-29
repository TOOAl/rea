export const __stub = 1;
//     ),
//     namespace: z
//       .enum(["system", "secure", "global"])
//       .describe("Settings namespace to read"),
//     key: keyStringSchema
//       .regex(keyPattern, "Setting keys are restricted to identifiers")
//       .describe("Setting key to read"),
//   }),
//   collect_adb_bugreport: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     output_directory: localPathStringSchema.describe(
//       "Local directory for the bugreport archive; REA writes exactly one new zip into it",
//     ),
//   }),
//   resolve_adb_packages: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     query: z
//       .string()
//       .min(2)
//       .max(256)
//       .describe(
//         "Case-insensitive substring matched against installed package names (e.g. whatsapp)",
//       ),
//   }),
//   install_adb_package: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     apk_path: localPathStringSchema.describe(
//       "Existing local APK file to install",
//     ),
//     replace: z
//       .boolean()
//       .default(false)
//       .describe(
//         "Request replacement mode and keep existing app data if present (adb install -r); does not establish whether the app was already installed",
//       ),
//   }),
//   uninstall_adb_package: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     package: packageNameSchema.describe("Installed package to uninstall"),
//   }),
//   start_adb_app: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     package: packageNameSchema.describe(
//       "Installed package whose launcher activity is started",
//     ),
//   }),
//   start_adb_activity: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     action: z
//       .string()
//       .min(1)
//       .max(256)
//       .regex(
//         IDENTIFIER_PATTERN,
//         "Intent action must be a dotted identifier such as android.intent.action.VIEW",
//       )
//       .describe("Intent action to start"),
//     data_uri: z
//       .string()
//       .min(1)
//       .max(2048)
//       .regex(/^[^\x00\s]+$/u, "Data URI cannot contain whitespace or NUL")
//       .optional()
//       .describe("Intent data URI (-d)"),
//     component: z
//       .string()
//       .min(1)
//       .max(512)
//       .regex(
//         /^[A-Za-z0-9._\x2d]+(\/[A-Za-z0-9._\x2d]*)?$/u,
//         "Component must be package/activity form",
//       )
//       .optional()
//       .describe("Explicit component to start (-n)"),
//     extras: z
//       .array(
//         z.strictObject({
//           key: keyStringSchema
//             .regex(keyPattern, "Extra keys are identifiers")
//             .describe("Extra key"),
//           type: z
//             .enum(["string", "boolean", "int", "long", "float"])
//             .describe("Extra value type"),
//           value: z
//             .string()
//             .min(1)
//             .max(2048)
//             .regex(/^[^\x00]*$/u, "Extra values cannot contain NUL")
//             .describe("Extra value as text, parsed per type"),
//         }),
//       )
//       .max(16)
//       .default([])
//       .describe("Typed intent extras (--es/--ez/--ei/--el/--ef)"),
//   }),
//   stop_adb_app: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     package: packageNameSchema.describe(
//       "Package whose processes are force-stopped",
//     ),
//   }),
// } as const;
//
// /** Supported ADB-backed operations. */
// export type AdbOperation = keyof typeof adbInputSchemas;
// /** Validated ADB requests carry their selected operation. */
// export type AdbRequest = {
//   [Name in AdbOperation]: {
//     operation: Name;
//     input: z.infer<(typeof adbInputSchemas)[Name]>;
//   };
// }[AdbOperation];
//
// /** Validate operation and input together so their types remain correlated. */
// export const adbRequestSchema = z.discriminatedUnion("operation", [
//   z.strictObject({
//     operation: z.literal("inspect_adb_client"),
//     input: adbInputSchemas.inspect_adb_client,
//   }),
//   z.strictObject({
//     operation: z.literal("list_adb_devices"),
//     input: adbInputSchemas.list_adb_devices,
//   }),
//   z.strictObject({
//     operation: z.literal("inspect_adb_device"),
//     input: adbInputSchemas.inspect_adb_device,
//   }),
//   z.strictObject({
//     operation: z.literal("list_adb_packages"),
//     input: adbInputSchemas.list_adb_packages,
//   }),
//   z.strictObject({
//     operation: z.literal("pull_adb_package"),
//     input: adbInputSchemas.pull_adb_package,
//   }),
//   z.strictObject({
//     operation: z.literal("read_adb_logcat"),
//     input: adbInputSchemas.read_adb_logcat,
//   }),
//   z.strictObject({
//     operation: z.literal("inspect_adb_package"),
//     input: adbInputSchemas.inspect_adb_package,
//   }),
//   z.strictObject({
//     operation: z.literal("pull_adb_file"),
//     input: adbInputSchemas.pull_adb_file,
//   }),
//   z.strictObject({
//     operation: z.literal("push_adb_file"),
//     input: adbInputSchemas.push_adb_file,
//   }),
//   z.strictObject({
//     operation: z.literal("capture_adb_screen"),
//     input: adbInputSchemas.capture_adb_screen,
//   }),
//   z.strictObject({
//     operation: z.literal("list_adb_processes"),
//     input: adbInputSchemas.list_adb_processes,
//   }),
//   z.strictObject({
//     operation: z.literal("list_adb_directory"),
//     input: adbInputSchemas.list_adb_directory,
//   }),
//   z.strictObject({
//     operation: z.literal("list_adb_features"),
//     input: adbInputSchemas.list_adb_features,
//   }),
//   z.strictObject({
//     operation: z.literal("list_adb_services"),
//     input: adbInputSchemas.list_adb_services,
//   }),
//   z.strictObject({
//     operation: z.literal("inspect_adb_display"),
//     input: adbInputSchemas.inspect_adb_display,
//   }),
//   z.strictObject({
//     operation: z.literal("inspect_adb_window"),
//     input: adbInputSchemas.inspect_adb_window,
//   }),
//   z.strictObject({
//     operation: z.literal("read_adb_setting"),
//     input: adbInputSchemas.read_adb_setting,
//   }),
export const _l = 197;
