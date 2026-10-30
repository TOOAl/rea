/**
 * Parsers for fixed observation commands REA runs through `adb shell`.
 *
 * Formats follow toybox output on Android 8+ (verified against an Android 14
 * emulator). Unparseable lines are retained rather than dropped so callers
 * can see the format drift instead of silently losing rows.
 */

export interface AdbProcessEntry {
  readonly user: string;
  readonly pid: number;
  readonly ppid: number | null;
  readonly rss: number | null;
  readonly state: string | null;
  readonly name: string;
}

const PROCESS_LINE =
  /^(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/u;

/** Parse `ps -A` output; the header line is preserved verbatim as `columns`. */
export const parseProcessListOutput = (
  stdout: string,
): {
  columns: string | null;
  processes: readonly AdbProcessEntry[];
  unparsedLines: readonly string[];
} => {
  const processes: AdbProcessEntry[] = [];
  const unparsedLines: string[] = [];
  let columns: string | null = null;
  for (const rawLine of stdout.split(/\r?\n/u)) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    if (/^USER\s+PID\s+PPID\b/u.test(line)) {
      columns = line.trim();
      continue;
    }
    const match = PROCESS_LINE.exec(line);
    if (match === null) {
      unparsedLines.push(line);
      continue;
    }
    processes.push({
      user: match[1]!,
      pid: Number(match[2]!),
      ppid: Number.isSafeInteger(Number(match[3]!)) ? Number(match[3]!) : null,
      rss: Number.isSafeInteger(Number(match[5]!)) ? Number(match[5]!) : null,
      state: match[8]!,
      name: match[9]!.trim(),
    });
  }
  return { columns, processes, unparsedLines };
};

export interface AdbFeatureEntry {
  readonly name: string;
  readonly version: number | null;
}

const FEATURE_LINE = /^feature:([^=\s]+)(?:=(0x[0-9a-fA-F]+|\d+))?$/u;

const parseFeatureVersion = (text: string): number =>
  text.startsWith("0x") ? Number.parseInt(text.slice(2), 16) : Number(text);

/** Parse `pm list features` output, including hex GL versions. */
export const parseFeatureListOutput = (
  stdout: string,
): {
  features: readonly AdbFeatureEntry[];
  unparsedLines: readonly string[];
} => {
  const features: AdbFeatureEntry[] = [];
  const unparsedLines: string[] = [];
  for (const rawLine of stdout.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "") continue;
    const match = FEATURE_LINE.exec(line);
    if (match === null) {
      unparsedLines.push(line);
      continue;
    }
    features.push({
      name: match[1]!,
      version: match[2] === undefined ? null : parseFeatureVersion(match[2]!),
    });
  }
  return { features, unparsedLines };
};

export interface AdbServiceEntry {
  readonly name: string;
  readonly interface: string | null;
}

const SERVICE_LINE = /^\s*(?:\d+\s+)?([A-Za-z0-9._$/-]+):\s*\[([^\]]*)\]\s*$/u;

/** Parse `service list` output, tolerating numbered and plain formats. */
export const parseServiceListOutput = (
  stdout: string,
): {
  services: readonly AdbServiceEntry[];
  unparsedLines: readonly string[];
} => {
  const services: AdbServiceEntry[] = [];
  const unparsedLines: string[] = [];
  for (const rawLine of stdout.split(/\r?\n/u)) {
    const line = rawLine.trimEnd();
    if (line.trim() === "" || /^Found \d+ services:/u.test(line.trim()))
      continue;
    const match = SERVICE_LINE.exec(line);
    if (match === null) {
      if (line.trim() !== "") unparsedLines.push(line.trim());
      continue;
    }
    services.push({
      name: match[1]!,
      interface: match[2] === "" ? null : match[2]!,
    });
  }
  return { services, unparsedLines };
};

const SIZE_PAIR = /^Physical size:\s+(\d+)x(\d+)$/u;
const SIZE_OVERRIDE = /^Override size:\s+(\d+)x(\d+)$/u;
const DENSITY_PHYSICAL = /^Physical density:\s+(\d+)$/u;
const DENSITY_OVERRIDE = /^Override density:\s+(\d+)$/u;

/** Parse `wm size` output into physical and optional override sizes. */
export const parseWmSizeOutput = (
  stdout: string,
): {
  physical: { readonly width: number; readonly height: number } | null;
  override: { readonly width: number; readonly height: number } | null;
} => {
  let physical = null;
  let override = null;
  for (const line of stdout.split(/\r?\n/u)) {
    const trimmed = line.trim();
    const physicalMatch = SIZE_PAIR.exec(trimmed);
    if (physicalMatch !== null)
      physical = {
        width: Number(physicalMatch[1]!),
        height: Number(physicalMatch[2]!),
      };
    const overrideMatch = SIZE_OVERRIDE.exec(trimmed);
    if (overrideMatch !== null)
      override = {
        width: Number(overrideMatch[1]!),
        height: Number(overrideMatch[2]!),
      };
  }
  return { physical, override };
};

/** Parse `wm density` output. Older builds print a bare number. */
export const parseWmDensityOutput = (
  stdout: string,
): {
  physical: number | null;
  override: number | null;
} => {
  let physical = null;
  let override = null;
  for (const line of stdout.split(/\r?\n/u)) {
    const trimmed = line.trim();
    const physicalMatch = DENSITY_PHYSICAL.exec(trimmed);
    if (physicalMatch !== null) physical = Number(physicalMatch[1]!);
    const overrideMatch = DENSITY_OVERRIDE.exec(trimmed);
    if (overrideMatch !== null) override = Number(overrideMatch[1]!);
  }
  return { physical, override };
};

/** Parse focus declarations from `dumpsys window windows` or `displays`. */
export const parseWindowFocusOutput = (
  stdout: string,
): {
  focusedWindow: string | null;
  focusedApp: string | null;
} => {
  let focusedWindow = null;
  let focusedApp = null;
  for (const line of stdout.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (focusedWindow === null && trimmed.startsWith("mCurrentFocus="))
      focusedWindow = trimmed.slice("mCurrentFocus=".length).trim();
    if (focusedApp === null && trimmed.startsWith("mFocusedApp="))
      focusedApp = trimmed.slice("mFocusedApp=".length).trim();
  }
  return { focusedWindow, focusedApp };
};

export interface AdbPackageDetails {
  readonly versionName: string | null;
  /** Signed 64-bit long version code exactly as Package Manager prints it. */
  readonly versionCode: string | null;
  readonly firstInstallTime: string | null;
  readonly lastUpdateTime: string | null;
  readonly installerPackageName: string | null;
  readonly userId: number | null;
  readonly pkgFlags: string | null;
  readonly requestedPermissions: number | null;
}
