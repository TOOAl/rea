import { realpath, stat } from "node:fs/promises";
import { homeDirectoryFromEnvironment } from "../config/homeDirectory.js";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import spawn from "cross-spawn";
import { lt, valid } from "semver";

import { PRODUCT_IDENTITY } from "../identity.js";
import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { err, ok, type Result } from "../domain/result.js";
import { safeParseJson } from "../domain/safeJson.js";
import {
  updateInstallCommand,
  type BunInstallation,
  type NpmInstallation,
  type ReleaseLookupFailure,
  type UpdateHost,
  type UpdateInstallation,
  type UpdateOutput,
} from "./Update.js";
import { planIntegrationMaintenance } from "./UpdateMaintenance.js";
import { withoutPackageRunnerIdentity } from "./ClientRegistrationIdentity.js";

/** npm filesystem queries used to identify the installation being updated. */
export interface NpmInstallationHost {
  canonicalPath(path: string): Promise<string>;
  globalRoot(): Promise<string>;
  globalPrefix(): Promise<string>;
}

/** Filesystem queries used to identify a Bun global installation. */
export interface BunInstallationHost {
  canonicalPath(path: string): Promise<string>;
  isFile(path: string): Promise<boolean>;
}

/** Run an updater subprocess with complete diagnostics and isolated machine output. */
export const runUpdateCommand = (
  command: readonly string[],
  selectedEnvironment: Readonly<NodeJS.ProcessEnv>,
  output: UpdateOutput = "structured",
  workingDirectory: string | undefined = undefined,
): Promise<Result<string, string>> =>
  new Promise((resolveResult) => {
    const [executable, ...args] = command;
    if (executable === undefined) {
      resolveResult(err("No executable supplied."));
      return;
    }
    // A fresh installed entry point must not inherit a package runner's invocation identity.
    const environment = withoutPackageRunnerIdentity(selectedEnvironment);
    const child = spawn(executable, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: environment,
      windowsHide: true,
      ...(workingDirectory === undefined ? {} : { cwd: workingDirectory }),
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
      if (output === "human") process.stderr.write(chunk);
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
      if (output === "human") process.stderr.write(chunk);
    });
    child.once("error", (cause) => resolveResult(err(cause.message)));
    child.once("close", (code, signal) =>
      resolveResult(
        code === 0
          ? ok(stdout.trim())
          : err(
              stderr.trim() ||
                stdout.trim() ||
                (signal === null
                  ? `Process exited with code ${String(code)}.`
                  : `Process terminated by ${signal}.`),
            ),
      ),
    );
  });

const requireCommandOutput = async (
  command: readonly string[],
  environment: Readonly<NodeJS.ProcessEnv>,
): Promise<string> => {
  const result = await runUpdateCommand(command, environment);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

/** Resolve the global prefix only when it owns the running package. */
export const detectNpmInstallation = async (
  packageRoot: string,
  host: NpmInstallationHost,
): Promise<NpmInstallation | undefined> => {
  let canonicalPackageRoot: string;
  try {
    canonicalPackageRoot = await host.canonicalPath(packageRoot);
  } catch (cause: unknown) {
    // best-effort cleanup: optional install-location probing; unknown means not npm-managed.
    void cause;
    return undefined;
  }
  try {
    const npmRoot = await host.globalRoot();
    const globalPackageRoot = await host.canonicalPath(
      resolve(npmRoot, PRODUCT_IDENTITY.packageName),
    );
    if (canonicalPackageRoot === globalPackageRoot) {
      const prefix = await host.globalPrefix();
      return prefix.length === 0
        ? undefined
        : { manager: "npm", prefix, packageRoot: canonicalPackageRoot };
    }
  } catch (cause: unknown) {
    // The curl installer uses a Unix prefix that may differ from npm's current default.
    void cause;
  }
  const nodeModules = dirname(canonicalPackageRoot);
  const library = dirname(nodeModules);
  if (
    basename(canonicalPackageRoot) !== PRODUCT_IDENTITY.packageName ||
    basename(nodeModules) !== "node_modules" ||
    basename(library) !== "lib"
  )
    return undefined;
  return {
    manager: "npm",
    prefix: dirname(library),
    packageRoot: canonicalPackageRoot,
  };
};

const nonemptyEnvironment = (value: string | undefined): string | undefined =>
  value === undefined || value.length === 0 ? undefined : value;

/**
 * Bun's global project directory for the selected environment, in Bun's precedence:
 * BUN_INSTALL_GLOBAL_DIR, then $BUN_INSTALL/install/global, then
 * $XDG_CACHE_HOME/.bun/install/global, then ~/.bun/install/global.
 * Resolve against the caller's cwd before reusing the path as a subprocess cwd.
 */
export const bunGlobalDirectory = (
  environment: Readonly<NodeJS.ProcessEnv>,
  platform: NodeJS.Platform,
): string => {
  const explicit = nonemptyEnvironment(environment.BUN_INSTALL_GLOBAL_DIR);
  if (explicit !== undefined) return resolve(explicit);
  const installRoot = nonemptyEnvironment(environment.BUN_INSTALL);
  if (installRoot !== undefined)
    return resolve(installRoot, "install", "global");
  const cacheRoot =
    nonemptyEnvironment(environment.XDG_CACHE_HOME) ??
    homeDirectoryFromEnvironment(environment, platform);
  return resolve(cacheRoot, ".bun", "install", "global");
};

/**
 * Identify the running package as Bun's global installation.
 * Bun walks up to an ancestor project when its global directory has no
 * package.json, so the global manifest must exist before `bun add --global`
 * can be trusted to update this package root.
 */
export const detectBunInstallation = async (
  packageRoot: string,
  globalDirectory: string,
  host: BunInstallationHost,
): Promise<BunInstallation | undefined> => {
  try {
    const canonicalPackageRoot = await host.canonicalPath(packageRoot);
    const globalPackageRoot = await host.canonicalPath(
      join(globalDirectory, "node_modules", PRODUCT_IDENTITY.packageName),
    );
    if (
      canonicalPackageRoot !== globalPackageRoot ||
      !(await host.isFile(join(globalDirectory, "package.json")))
    )
      return undefined;
    return {
      manager: "bun",
      globalDirectory,
      packageRoot: canonicalPackageRoot,
    };
  } catch (cause: unknown) {
    // best-effort cleanup: optional install-location probing; unknown means not Bun-managed.
    void cause;
    return undefined;
  }
};
