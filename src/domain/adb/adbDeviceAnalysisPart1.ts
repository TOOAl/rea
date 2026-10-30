export const __stub = 1;
// import { z } from "zod";
// import { localPathStringSchema } from "../localPath.js";
// import { IDENTIFIER_PATTERN } from "../stringPatterns.js";
//
// /**
//  * Device serials as adb prints them: emulator-5554, USB identifiers, and
//  * host:port transports. The pattern keeps arguments free of whitespace and
//  * quotes; argv is positional in the provider, so this is admission hygiene
//  * rather than injection defense.
//  */
// const deviceSerialSchema = z
//   .string()
//   .min(1)
//   .max(256)
//   .regex(
//     /^[^\x00\s"']+$/u,
//     "Device serial cannot contain whitespace or quotes",
//   );
//
// /**
//  * Android package names as Package Manager reports them. System entries can
//  * be a single segment (`android`), so at least one identifier is required.
//  */
// const packageNameSchema = z
//   .string()
//   .min(1)
//   .max(256)
//   .regex(
//     /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/u,
//     "Package name must be dot-separated Java identifiers",
//   );
//
// /** Text states emitted by adb's ConnectionState formatter. */
// export const ADB_DEVICE_STATES = [
//   "no permissions",
//   "unauthorized",
//   "authorizing",
//   "offline",
//   "recovery",
//   "sideload",
//   "connecting",
//   "bootloader",
//   "device",
//   "unknown",
//   "host",
//   "rescue",
//   "detached",
// ] as const;
// export const adbDeviceStateSchema = z.enum(ADB_DEVICE_STATES);
// export type AdbDeviceState = (typeof ADB_DEVICE_STATES)[number];
//
// const keyStringSchema = z.string().min(1).max(256);
// const keyPattern = /^[A-Za-z0-9._\x2d]+$/u;
//
// /**
//  * Caller intent for ADB-backed device inspection and acquisition.
//  *
//  * REA never installs platform tools, starts an emulator, or manages devices;
//  * every operation addresses devices the caller already connected, through the
//  * adb binary the caller selected.
//  */
// export const adbInputSchemas = {
//   inspect_adb_client: z.strictObject({}),
//   list_adb_devices: z.strictObject({}),
//   inspect_adb_device: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//   }),
//   list_adb_packages: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     scope: z
//       .enum(["all", "third_party", "system"])
//       .default("all")
//       .describe(
//         "Package scope: all packages, third-party only (-3), or system only (-s)",
//       ),
//   }),
//   pull_adb_package: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     package: packageNameSchema.describe(
//       "Installed package name whose APK set is pulled",
//     ),
//     output_directory: localPathStringSchema.describe(
//       "Local directory for the pulled APK set; REA creates a package-named subdirectory inside it",
//     ),
//   }),
//   read_adb_logcat: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     count: z
//       .number()
//       .int()
//       .min(1)
//       .max(10_000)
//       .default(500)
//       .describe("Number of most recent lines to read (logcat -d -t)"),
//     buffer: z
//       .enum(["main", "system", "radio", "events", "crash"])
//       .default("main")
//       .describe("Log buffer to read (logcat -b)"),
//     pid: z
//       .number()
//       .int()
//       .positive()
//       .optional()
//       .describe("Restrict to one process id (logcat --pid)"),
//   }),
//   inspect_adb_package: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     package: packageNameSchema.describe("Installed package to inspect"),
//   }),
//   pull_adb_file: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     device_path: z
//       .string()
//       .min(1)
//       .regex(/^\/[^\x00]*$/u, "Device path must be absolute")
//       .describe("Absolute device filesystem path to pull"),
//     output_directory: localPathStringSchema.describe(
//       "Local directory for the pulled file; must not already contain the file",
//     ),
//   }),
//   push_adb_file: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     local_path: localPathStringSchema.describe(
//       "Existing local regular file to push",
//     ),
//     device_path: z
//       .string()
//       .min(1)
//       .regex(/^\/[^\x00]*$/u, "Device path must be absolute")
//       .describe("Absolute destination path on the device"),
//     overwrite: z
//       .boolean()
//       .default(false)
//       .describe("Allow replacing an existing device file; refused by default"),
//   }),
//   capture_adb_screen: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     output_directory: localPathStringSchema.describe(
//       "Local directory for the captured PNG; must not already contain it",
//     ),
//   }),
//   list_adb_processes: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//   }),
//   list_adb_directory: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//     device_path: z
//       .string()
//       .min(1)
//       .regex(/^\/[^\x00]*$/u, "Device path must be absolute")
//       .describe(
//         "Absolute device directory path to list, including hidden children",
//       ),
//   }),
//   list_adb_features: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//   }),
//   list_adb_services: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//   }),
//   inspect_adb_display: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//   }),
//   inspect_adb_window: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
//     ),
//   }),
//   read_adb_setting: z.strictObject({
//     serial: deviceSerialSchema.describe(
//       "Device serial exactly as `adb devices` reports it",
export const _l = 197;
