import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type {
  Browser,
  BrowserContext,
  CDPSession,
  Page,
  chromium,
} from "playwright-core";

import type { BrowserScenario } from "../domain/browserScenario.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import { isLiteralLoopbackHostname } from "../domain/browserObservation.js";
import { BrowserObservationError } from "../domain/browserObservationError.js";
import { withPlaywrightExecutionBoundary } from "./PlaywrightExecutionBoundary.js";

const OPERATION = "capture_browser_scenario" as const;
// Closing a real Chrome persistent context can take several seconds even when

// src/browser/PlaywrightScenarioBrowserPart2.ts
/** Owns the target state changed while one scenario uses an attached page. */
class AttachedScenarioEnvironmentOwner {
  #mediaOverride = false;
  #deviceMetricsOverride = false;
  #localeOverride = false;
  #timezoneOverride = false;
  #detached = false;
  #application: Promise<void> | undefined;

  private constructor(
    private readonly page: Page,
    private readonly session: CDPSession,
  ) {}

  static async create(
    context: BrowserContext,
    page: Page,
  ): Promise<AttachedScenarioEnvironmentOwner> {
    return new AttachedScenarioEnvironmentOwner(
      page,
      await context.newCDPSession(page),
    );
  }

  get restored(): boolean {
    return (
      !this.#mediaOverride &&
      !this.#deviceMetricsOverride &&
      !this.#localeOverride &&
      !this.#timezoneOverride
    );
  }

  get targetClosed(): boolean {
    return this.page.isClosed();
  }

  apply(
    environment: BrowserScenario["environment"],
    signal: AbortSignal | undefined,
  ): Promise<void> {
    const application =
      this.#application ?? this.#applyEnvironment(environment, signal);
    this.#application = application;
    return application;
  }

  async #applyEnvironment(
    environment: BrowserScenario["environment"],
    signal: AbortSignal | undefined,
  ): Promise<void> {
    await this.page.emulateMedia({
      colorScheme: environment.color_scheme,
      reducedMotion: environment.reduced_motion,
    });
    this.#mediaOverride = true;
    throwIfScenarioCancelled(signal);

    // setViewportSize also resizes the external browser window. CDP metrics
    // provide the scenario viewport without changing that caller-owned window.
    await this.session.send("Emulation.setDeviceMetricsOverride", {
      width: environment.viewport.width,
      height: environment.viewport.height,
      deviceScaleFactor: environment.viewport.device_scale_factor,
      mobile: false,
      dontSetVisibleSize: true,
    });
    this.#deviceMetricsOverride = true;
    throwIfScenarioCancelled(signal);

    await this.session.send("Emulation.setLocaleOverride", {
      locale: environment.locale,
    });
    this.#localeOverride = true;
    throwIfScenarioCancelled(signal);

    await this.session.send("Emulation.setTimezoneOverride", {
      timezoneId: environment.timezone,
    });
    this.#timezoneOverride = true;
    throwIfScenarioCancelled(signal);
  }

  async close(): Promise<void> {
    if (this.#detached) return;
    // The execution boundary can report cancellation before a pending CDP
    // command settles. Wait for that producer so every successful mutation is
    // recorded before deciding which state this owner must restore.
    try {
      await this.#application;
    } catch {
      // The operation path reports application failures. Cleanup still owns
      // and restores every mutation that completed before the failure.
    }
    const failures: unknown[] = [];
    if (this.#timezoneOverride) {
      try {
        await this.session.send("Emulation.setTimezoneOverride", {
          timezoneId: "",
        });
        this.#timezoneOverride = false;
      } catch (cause: unknown) {
        failures.push(cause);
      }
    }
    if (this.#localeOverride) {
      try {
        await this.session.send("Emulation.setLocaleOverride", { locale: "" });
        this.#localeOverride = false;
      } catch (cause: unknown) {
        failures.push(cause);
      }
    }
    if (this.#deviceMetricsOverride) {
      try {
        await this.session.send("Emulation.clearDeviceMetricsOverride");
        this.#deviceMetricsOverride = false;
      } catch (cause: unknown) {
        failures.push(cause);
      }
    }
    if (this.#mediaOverride) {
      try {
        await this.page.emulateMedia({
          colorScheme: null,
          reducedMotion: null,
        });
        this.#mediaOverride = false;
      } catch (cause: unknown) {
        failures.push(cause);
      }
    }
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1)
      throw new AggregateError(
        failures,
        "Attached browser environment restoration failed",
      );
    await this.session.detach();
    this.#detached = true;
  }
}

/** Preserve an operation failure while reporting any incomplete cleanup. */
export const failBrowserScenarioOperation = async (
  cleanup: () => Promise<void>,
  primaryFailure: unknown,
  fallbackCleanupResources: readonly string[] = ["browser_transport"],
): Promise<never> => {
  try {
    await cleanup();
  } catch (cleanupFailure: unknown) {
    const cleanupDetails =
      cleanupFailure instanceof AnalysisError &&
      cleanupFailure.cleanup !== undefined
        ? cleanupFailure.cleanup
        : {
            reason:
              cleanupFailure instanceof Error
                ? cleanupFailure.message
                : String(cleanupFailure),
            resources:
              cleanupFailure instanceof AnalysisError
                ? cleanupFailure.cleanupResources
                : fallbackCleanupResources,
          };
    throw new BrowserObservationError(OPERATION, "cleanup_failed", {
      cause: new AggregateError(
        [primaryFailure, cleanupFailure],
        "Browser scenario operation and cleanup both failed",
        { cause: primaryFailure },
      ),
      cleanup: cleanupDetails,
    });
  }
  throw primaryFailure;
};

type ScenarioBrowserLauncher = Pick<
  typeof chromium,
  "launchPersistentContext"
> & {
  readonly connectOverCDP: (
    endpoint: string,
  ) => Promise<Pick<Browser, "contexts" | "close" | "isConnected" | "version">>;
};

type AttachedBrowserRequest = Extract<
  BrowserScenario["browser"],
  { readonly mode: "connect" }
>;

const openAttachedScenarioBrowser = async (
  browserRequest: AttachedBrowserRequest,
  environment: BrowserScenario["environment"],
  launcher: ScenarioBrowserLauncher,
  signal: AbortSignal | undefined,
  retainCleanup: ((close: () => Promise<unknown>) => void) | undefined,
): Promise<OpenedScenarioBrowser> => {
  const lease = await acquireAttachedScenario(browserRequest, signal);
  let cleanupOwner: PlaywrightScenarioBrowserCleanupOwner | undefined;
  let environmentOwner: AttachedScenarioEnvironmentOwner | undefined;
  try {
    const priorOwner = lease.admission.cleanupOwner;
    if (priorOwner !== undefined) await priorOwner.close();
    throwIfScenarioCancelled(signal);

    const browser = await launcher.connectOverCDP(browserRequest.cdp_endpoint);
    const cleanup: PlaywrightScenarioBrowserCleanupOwner =
      new PlaywrightScenarioBrowserCleanupOwner({
        closeBrowser: async () => {
          let environmentFailure: unknown;
          const ownedEnvironment = environmentOwner;
          if (ownedEnvironment !== undefined) {
            try {
              await ownedEnvironment.close();
              environmentOwner = undefined;
            } catch (cause: unknown) {
              environmentFailure = cause;
              const browserConnected = browser.isConnected();
              if (ownedEnvironment.targetClosed || !browserConnected) {
                // A destroyed target has no remaining emulation state. A lost
                // transport cannot be retained or retried; release its local
                // owner so later discovery can establish current target state.
                environmentOwner = undefined;
                if (!browserConnected) return;
              } else if (!ownedEnvironment.restored) {
                // Keep the live transport and target session for a cleanup
                // retry while any target override remains.
                throw cause;
              }
            }
          }
          try {
            await browser.close();
            // Once target state is restored, disconnecting the transport is a
            // definitive fallback for an explicit session detach failure.
            environmentOwner = undefined;
          } catch (browserFailure: unknown) {
            if (environmentFailure !== undefined)
              throw new AggregateError(
                [environmentFailure, browserFailure],
                "Attached browser environment cleanup failed",
              );
            throw browserFailure;
          }
        },
        onSettled: (browserClosed) => {
          if (browserClosed && lease.admission.cleanupOwner === cleanup)
            lease.admission.cleanupOwner = undefined;
          lease.release();
        },
        removeProfile: undefined,
      });
    cleanupOwner = cleanup;
    lease.admission.cleanupOwner = cleanup;
    throwIfScenarioCancelled(signal);
    const target = await withPlaywrightExecutionBoundary(
      () => findConnectedPage(browser, browserRequest.target_id, signal),
      undefined,
      signal,
    );
    throwIfScenarioCancelled(signal);
    const configuredEnvironment = await withPlaywrightExecutionBoundary(
      () =>
        AttachedScenarioEnvironmentOwner.create(target.context, target.page),
      undefined,
      signal,
    );
    environmentOwner = configuredEnvironment;
    await withPlaywrightExecutionBoundary(
      () => configuredEnvironment.apply(environment, signal),
      undefined,
      signal,
    );
    return {
      ...target,
      browser,
      profilePath: undefined,
      cleanup,
    };
  } catch (cause: unknown) {
    if (cleanupOwner === undefined) {
      lease.release();
      throw cause;
    }
    const cleanup = cleanupOwner;
    const close = () => cleanup.close();
    try {
      return await failBrowserScenarioOperation(close, cause);
    } catch (failure: unknown) {
      if (failure !== cause) retainCleanup?.(close);
      throw failure;
    }
  }
};

/** Launch or attach using the caller-selected environment and browser engine. */
export const openPlaywrightScenarioBrowser = async (
  scenario: BrowserScenario,
  environment: Readonly<Record<string, string | undefined>>,
  options: {
    readonly launcher?: ScenarioBrowserLauncher;
    readonly signal?: AbortSignal | undefined;
    readonly retainCleanup?: (close: () => Promise<unknown>) => void;
  } = {},
): Promise<OpenedScenarioBrowser> => {
  // Load Playwright only when a scenario opens; MCP startup stays off its module graph.
  const launcher =
    options.launcher ?? (await import("playwright-core")).chromium;
  if (scenario.browser.mode === "connect")
    return openAttachedScenarioBrowser(
      scenario.browser,
      scenario.environment,
      launcher,
      options.signal,
      options.retainCleanup,
    );

  const profilePath = await mkdtemp(join(tmpdir(), "rea-browser-scenario-"));
  let context: BrowserContext;
  try {
    await chmod(profilePath, 0o700);
    context = await launcher.launchPersistentContext(profilePath, {
      executablePath: resolve(scenario.browser.executable_path),
      headless: scenario.browser.headless,
      acceptDownloads: false,
      viewport: {
        width: scenario.environment.viewport.width,
        height: scenario.environment.viewport.height,
      },
      deviceScaleFactor: scenario.environment.viewport.device_scale_factor,
      locale: scenario.environment.locale,
      timezoneId: scenario.environment.timezone,
      colorScheme: scenario.environment.color_scheme,
      reducedMotion: scenario.environment.reduced_motion,
      serviceWorkers: scenario.environment.service_workers,
      env: allowedBrowserEnvironment(environment),
      handleSIGHUP: false,
      handleSIGINT: false,
      handleSIGTERM: false,
      timeout: 0,
      // Termux's Chromium cannot create its renderer process through Android's
      // executable boundary. Single-process mode keeps the browser and page in
      // the Termux-launched process so scenario navigation remains available.
      args:
        process.platform === "android"
          ? ["--no-sandbox", "--single-process"]
          : [],
    });
  } catch (cause: unknown) {
    const cleanup = () =>
      rm(profilePath, { recursive: true, force: true, maxRetries: 3 });
    try {
      return await failBrowserScenarioOperation(cleanup, cause, [
        "browser_profile",
      ]);
    } catch (failure: unknown) {
      if (failure !== cause) options.retainCleanup?.(cleanup);
      throw failure;
    }
  }
  const cleanup = new PlaywrightScenarioBrowserCleanupOwner({
    closeBrowser: () => context.close(),
    removeProfile: () =>
      rm(profilePath, { recursive: true, force: true, maxRetries: 3 }),
  });
  try {
    const browser = context.browser();
    if (browser === null)
      throw new BrowserObservationError(OPERATION, "protocol_error");
    const page = context.pages()[0] ?? (await context.newPage());
    return {
      context,
      page,
      browser,
      profilePath,
      cleanup,
    };
  } catch (cause: unknown) {
    const close = () => cleanup.close();
    try {
      return await failBrowserScenarioOperation(close, cause);
    } catch (failure: unknown) {
      if (failure !== cause) options.retainCleanup?.(close);
      throw failure;
    }
  }
};
