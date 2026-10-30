import { tmpdir } from "node:os";

import type { Browser, BrowserContext, Page } from "playwright-core";

import type { BrowserScenario } from "../domain/browserScenario.js";
import { isLiteralLoopbackHostname } from "../domain/browserObservation.js";
import { BrowserObservationError } from "../domain/browserObservationError.js";
import { withPlaywrightExecutionBoundary } from "./PlaywrightExecutionBoundary.js";

const OPERATION = "capture_browser_scenario" as const;
// Closing a real Chrome persistent context can take several seconds even when
// it succeeds. The shorter operation deadline must not misreport cleanup.
const CLEANUP_CONFIRMATION_TIMEOUT_MS = 30_000;

const throwIfScenarioCancelled = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted === true)
    throw new BrowserObservationError(OPERATION, "cancelled");
};

export interface OpenedScenarioBrowser {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly browser: Pick<Browser, "contexts" | "close" | "version">;
  readonly profilePath: string | undefined;
  readonly cleanup: PlaywrightScenarioBrowserCleanupOwner;
}

/** Provider actions retained until the owned browser and profile are released. */
interface PlaywrightScenarioCleanupResources {
  readonly closeBrowser: () => Promise<void>;
  readonly removeProfile: (() => Promise<void>) | undefined;
  readonly onSettled?: (browserClosed: boolean) => void;
}

/** Owns one browser connection and optional private profile through cleanup retries. */
export class PlaywrightScenarioBrowserCleanupOwner {
  #browserClosed = false;
  #profileRemoved: boolean;
  #closePromise: Promise<void> | undefined;
  #eventFinalizationPromise: Promise<void> | undefined;

  /** Keep the narrow provider actions needed to release one opened browser. */
  constructor(private readonly resources: PlaywrightScenarioCleanupResources) {
    this.#profileRemoved = resources.removeProfile === undefined;
  }

  get browserClosed(): boolean {
    return this.#browserClosed;
  }

  close(finishEvents?: () => Promise<void>): Promise<void> {
    const cleanup = this.#closePromise ?? this.#closeResources(finishEvents);
    if (this.#closePromise === undefined) {
      this.#closePromise = cleanup;
      void cleanup.then(
        () => this.resources.onSettled?.(this.#browserClosed),
        () => {
          if (this.#closePromise === cleanup) this.#closePromise = undefined;
          this.resources.onSettled?.(this.#browserClosed);
        },
      );
    }
    return this.#awaitCleanup(cleanup);
  }

  async #awaitCleanup(cleanup: Promise<void>): Promise<void> {
    try {
      await withPlaywrightExecutionBoundary(
        () => cleanup,
        CLEANUP_CONFIRMATION_TIMEOUT_MS,
      );
    } catch (cause: unknown) {
      throw new BrowserObservationError(OPERATION, "cleanup_failed", {
        cause,
        cleanup: {
          reason: cause instanceof Error ? cause.message : String(cause),
          resources: [
            "browser_transport",
            ...(this.resources.removeProfile === undefined
              ? []
              : ["browser_profile"]),
          ],
        },
      });
    }
  }

  async #closeResources(finishEvents?: () => Promise<void>): Promise<void> {
    const failures: unknown[] = [];
    const eventFinalization = (this.#eventFinalizationPromise ??=
      Promise.resolve().then(async () => {
        await finishEvents?.();
      }));
    try {
      await eventFinalization;
    } catch (cause: unknown) {
      // A failed finalization stays failed: the memoized attempt rejects on
      // every retry so cleanup can never report success for unfinalized
      // events.
      failures.push(cause);
    }
    if (!this.#browserClosed) {
      try {
        await this.resources.closeBrowser();
        this.#browserClosed = true;
      } catch (cause: unknown) {
        failures.push(cause);
      }
    }
    if (
      this.#browserClosed &&
      !this.#profileRemoved &&
      this.resources.removeProfile !== undefined
    ) {
      try {
        await this.resources.removeProfile();
        this.#profileRemoved = true;
      } catch (cause: unknown) {
        failures.push(cause);
      }
    }
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1)
      throw new AggregateError(failures, "Browser session cleanup failed");
  }
}

interface AttachedScenarioWaiter {
  readonly signal: AbortSignal | undefined;
  readonly resolve: (release: () => void) => void;
  readonly reject: (error: BrowserObservationError) => void;
  onAbort: (() => void) | undefined;
}

interface AttachedScenarioAdmission {
  active: boolean;
  readonly waiters: AttachedScenarioWaiter[];
  cleanupOwner: PlaywrightScenarioBrowserCleanupOwner | undefined;
}

interface AttachedScenarioLease {
  readonly admission: AttachedScenarioAdmission;
  readonly release: () => void;
}

const attachedScenarioAdmissions = new Map<string, AttachedScenarioAdmission>();

const releaseAttachedScenario = (
  key: string,
  admission: AttachedScenarioAdmission,
): void => {
  const waiter = admission.waiters.shift();
  if (waiter === undefined) {
    admission.active = false;
    if (
      admission.cleanupOwner === undefined &&
      attachedScenarioAdmissions.get(key) === admission
    )
      attachedScenarioAdmissions.delete(key);
    return;
  }

  if (waiter.onAbort !== undefined)
    waiter.signal?.removeEventListener("abort", waiter.onAbort);
  if (waiter.signal?.aborted === true) {
    waiter.reject(new BrowserObservationError(OPERATION, "cancelled"));
    releaseAttachedScenario(key, admission);
    return;
  }
  waiter.resolve(createAttachedScenarioRelease(key, admission));
};

const createAttachedScenarioRelease = (
  key: string,
  admission: AttachedScenarioAdmission,
): (() => void) => {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseAttachedScenario(key, admission);
  };
};

/** One browser admission. The key is the discovery URL this endpoint already parses. */
export const attachedScenarioLeaseKey = (
  endpoint: string,
  targetId: string,
): string => {
  const discovery = new URL("/json/version", endpoint);
  // One CDP browser serves every loopback stack on one port, so spellings that
  // reach it through 127.0.0.1 or ::1 must share a single admission.
  if (isLiteralLoopbackHostname(discovery.hostname))
    discovery.hostname = "127.0.0.1";
  return JSON.stringify([discovery.href, targetId]);
};

const acquireAttachedScenario = (
  scenario: Extract<BrowserScenario["browser"], { readonly mode: "connect" }>,
  signal: AbortSignal | undefined,
): Promise<AttachedScenarioLease> => {
  if (signal?.aborted === true)
    return Promise.reject(new BrowserObservationError(OPERATION, "cancelled"));

  const key = attachedScenarioLeaseKey(
    scenario.cdp_endpoint,
    scenario.target_id,
  );
  const admission =
    attachedScenarioAdmissions.get(key) ??
    ({
      active: false,
      waiters: [],
      cleanupOwner: undefined,
    } satisfies AttachedScenarioAdmission);
  attachedScenarioAdmissions.set(key, admission);

  return new Promise((resolve, reject) => {
    const grant = (release: () => void): void =>
      resolve({ admission, release });
    if (!admission.active) {
      admission.active = true;
      grant(createAttachedScenarioRelease(key, admission));
      return;
    }

    const waiter: AttachedScenarioWaiter = {
      signal,
      resolve: (release) => grant(release),
      reject,
      onAbort: undefined,
    };
    admission.waiters.push(waiter);
    if (signal !== undefined) {
      const onAbort = (): void => {
        const index = admission.waiters.indexOf(waiter);
        if (index < 0) return;
        admission.waiters.splice(index, 1);
        signal.removeEventListener("abort", onAbort);
        reject(new BrowserObservationError(OPERATION, "cancelled"));
        if (!admission.active && admission.waiters.length === 0)
          releaseAttachedScenario(key, admission);
      };
      waiter.onAbort = onAbort;
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
        return;
      }
    }
  });
};

const allowedBrowserEnvironment = (
  environment: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> => {
  const allowed = [
    "DBUS_SESSION_BUS_ADDRESS",
    "DISPLAY",
    "HOME",
    "LANG",
    "LD_LIBRARY_PATH",
    "PATH",
    "SystemRoot",
    "TEMP",
    "TMP",
    "TMPDIR",
    "WAYLAND_DISPLAY",
    "XAUTHORITY",
    "XDG_RUNTIME_DIR",
  ];
  const selected = Object.fromEntries(
    allowed
      .map((name) => [name, environment[name]] as const)
      .filter(
        (entry): entry is readonly [string, string] => entry[1] !== undefined,
      ),
  );
  if (process.platform !== "android") return selected;

  // Android rejects execve() for binaries below Termux's application data
  // directory. Termux supplies an exec interceptor that rewrites those calls
  // through the system linker and removes itself for the launched program.
  // Playwright must retain it for its Chromium child process.
  const prefix = environment.PREFIX;
  if (prefix === undefined) return selected;
  return {
    ...selected,
    LD_PRELOAD: `${prefix}/lib/libtermux-exec.so`,
    TERMUX_EXEC__PROC_SELF_EXE: process.execPath,
  };
};
const findConnectedPage = async (
  browser: Pick<Browser, "contexts">,
  targetId: string,
  signal: AbortSignal | undefined,
): Promise<{ readonly context: BrowserContext; readonly page: Page }> => {
  for (const context of browser.contexts())
    for (const page of context.pages()) {
      const session = await context.newCDPSession(page);
      try {
        throwIfScenarioCancelled(signal);
        const { targetInfo } = await session.send("Target.getTargetInfo");
        throwIfScenarioCancelled(signal);
        if (targetInfo.targetId !== targetId) continue;
        return { context, page };
      } finally {
        await session.detach();
      }
    }
  throw new BrowserObservationError(OPERATION, "target_not_found");
};
