import { z } from "incur";
import type { Logger } from "pino";

import { createReverseEngineeringService } from "../composition/reverseEngineering.js";
import { AnalysisInputError } from "../domain/analysisErrorCore.js";
import type { Result } from "../domain/result.js";
import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
import { logCliCommand } from "../cliLogging.js";
import type { CliInstance } from "./types.js";
import { withCommandCancellation } from "./commandCancellation.js";
import { CLI_COMMANDS } from "../cliCommandNames.js";
import {
  GdbSessionManager,
  gdbOneShotCommandMayInvalidateDetachProof,
} from "../gdb/GdbSessionManager.js";
import { RizinDebugSessionManager } from "../rizin/RizinDebugSessionManager.js";

export const registerReverseEngineeringCommands = (
  cli: CliInstance,
  logger: Logger,
  environment: Readonly<NodeJS.ProcessEnv>,
  createGdbManager: (
    environment: Readonly<NodeJS.ProcessEnv>,
  ) => GdbSessionManager = (providerEnvironment) =>
    new GdbSessionManager({ environment: providerEnvironment }),
  createService: typeof createReverseEngineeringService = createReverseEngineeringService,
): void => {
  const service = createService(environment);
  cli.command(CLI_COMMANDS.inspectWithObjdump, {
    description:
      "Inspect a local artifact with GNU objdump and retain its raw output as Evidence",
    args: z.object({
      path: z
        .string()
        .min(1)
        .describe("Path to the local artifact to inspect."),
      operation: z
        .enum([
          "file_headers",
          "section_headers",
          "symbols",
          "relocations",
          "dwarf",
          "disassemble",
          "disassemble_all",
        ])
        .describe("GNU objdump inspection operation to run."),
    }),
    options: z.object({
      followDebugLinks: z
        .boolean()
        .default(false)
        .describe(
          "Follow local DWARF debug links. External debug-file identity is not bound to Evidence.",
        ),
    }),
    run: ({ args, options }) =>
      withCommandCancellation((signal) =>
        logCliCommand(logger, CLI_COMMANDS.inspectWithObjdump, async () => {
          const result = await executeWithCleanup(service, () =>
            service.inspectWithObjdump(
              {
                ...args,
                follow_debug_links: options.followDebugLinks,
              },
              { signal },
            ),
          );
          return result.ok ? result.value : projectAnalysisError(result.error);
        }),
      ),
  });
  cli.command(CLI_COMMANDS.listObjdumpArchitectures, {
    description: "List BFD targets advertised by the installed GNU objdump",
    args: z.object({}),
    run: () =>
      withCommandCancellation((signal) =>
        logCliCommand(
          logger,
          CLI_COMMANDS.listObjdumpArchitectures,
          async () => {
            const result = await executeWithCleanup(service, () =>
              service.inspectWithObjdump(
                { operation: "architectures" },
                { signal },
              ),
            );
            return result.ok
              ? result.value
              : projectAnalysisError(result.error);
          },
        ),
      ),
  });
  cli.command(CLI_COMMANDS.executeRizinCommand, {
    description: "Execute one Rizin command against a local artifact",
    args: z.object({
      path: z
        .string()
        .min(1)
        .describe("Path to the local artifact to analyze."),
      command: z.string().min(1).describe("One caller-selected Rizin command."),
    }),
    run: ({ args }) =>
      withCommandCancellation((signal) =>
        logCliCommand(logger, CLI_COMMANDS.executeRizinCommand, async () => {
          const result = await executeWithCleanup(service, () =>
            service.executeRizinCommand(args, { signal }),
          );
          return result.ok ? result.value : projectAnalysisError(result.error);
        }),
      ),
  });
  cli.command(CLI_COMMANDS.debugWithGdb, {
    description:
      "Run one unrestricted GDB console command in an ephemeral MI session; provide an inferior TTY so a live target can be safely detached",
    args: z.object({
      command: z
        .string()
        .min(1)
        .describe("One unrestricted GDB console command."),
    }),
    options: z.object({
      inferiorTty: z
        .string()
        .min(1)
        .describe(
          "Caller-selected durable TTY for output from a live GDB inferior.",
        ),
    }),
    run: ({ args, options }) =>
      withCommandCancellation((signal) =>
        logCliCommand(logger, CLI_COMMANDS.debugWithGdb, async () => {
          if (gdbOneShotCommandMayInvalidateDetachProof(args.command))
            return projectAnalysisError(
              new AnalysisInputError("gdb_console", undefined, [
                {
                  path: ["command"],
                  reason: "invalid_value",
                  message:
                    "This command can invalidate the verified inferior output route; use the persistent GDB session workflow.",
                },
              ]),
            );
          const manager = createGdbManager(environment);
          let sessionId: string | undefined;
          try {
            const started = await manager.start(signal, {
              inferiorTty: options.inferiorTty,
            });
            if (!started.ok) return projectAnalysisError(started.error);
            sessionId = started.value.session_id;
            const executed = await manager.execute(
              sessionId,
              args.command,
              signal,
            );
            return executed.ok
              ? executed.value.evidence
              : projectAnalysisError(executed.error);
          } finally {
            let cleanupFailed = false;
            if (sessionId !== undefined) {
              try {
                const closed = await manager.close(sessionId);
                cleanupFailed = !closed.ok;
                if (!closed.ok)
                  logger.error(
                    {
                      command: CLI_COMMANDS.debugWithGdb,
                      cleanup: projectAnalysisError(closed.error),
                    },
                    "GDB cleanup failed after collecting command output",
                  );
              } catch (cause) {
                cleanupFailed = true;
                logger.error(
                  {
                    command: CLI_COMMANDS.debugWithGdb,
                    cleanup:
                      cause instanceof Error
                        ? cause.message
                        : "Unknown cleanup failure",
                  },
                  "GDB cleanup failed after collecting command output",
                );
              }
            }
            try {
              await manager.closeAll();
              cleanupFailed = false;
            } catch (cause) {
              cleanupFailed = true;
              logger.error(
                {
                  command: CLI_COMMANDS.debugWithGdb,
                  cleanup:
                    cause instanceof Error
                      ? cause.message
                      : "Unknown cleanup failure",
                },
                "GDB fallback cleanup failed",
              );
            }
            if (cleanupFailed) process.exitCode = 1;
          }
        }),
      ),
  });
  cli.command(CLI_COMMANDS.debugWithRizin, {
    description:
      "Run one unrestricted Rizin debugger command in an ephemeral session",
    args: z.object({
      path: z.string().min(1).describe("Path to the local artifact to debug."),
      command: z
        .string()
        .min(1)
        .describe("One unrestricted Rizin debugger command.")
        .refine((value) => !/[\r\n]/u.test(value)),
    }),
    options: z.object({
      inferiorTty: z
        .string()
        .min(1)
        .describe("Caller-selected Linux TTY for inferior stdout and stderr."),
      backend: z
        .string()
        .min(1)
        .optional()
        .describe("Optional Rizin IO debugger backend name."),
    }),
    run: ({ args, options }) =>
      withCommandCancellation((signal) =>
        logCliCommand(logger, CLI_COMMANDS.debugWithRizin, async () => {
          const manager = new RizinDebugSessionManager(environment);
          let sessionId: string | undefined;
          try {
            const started = await manager.start(
              {
                ...args,
                inferior_tty: options.inferiorTty,
                ...(options.backend === undefined
                  ? {}
                  : { backend: options.backend }),
              },
              signal,
            );
            if (!started.ok) return projectAnalysisError(started.error);
            sessionId = started.value.session_id;
            const executed = await manager.execute(
              started.value.session_id,
              args.command,
              signal,
            );
            return executed.ok
              ? executed.value.evidence
              : projectAnalysisError(executed.error);
          } finally {
            const closed =
              sessionId === undefined
                ? undefined
                : await manager.close(sessionId);
            if (closed !== undefined && !closed.ok) {
              logger.error(
                {
                  command: CLI_COMMANDS.debugWithRizin,
                  cleanup: projectAnalysisError(closed.error),
                },
                "Rizin cleanup failed after collecting command output",
              );
              process.exitCode = 1;
            }
            await manager.closeAll().catch((cause: unknown) => {
              process.exitCode = 1;
              logger.error(
                {
                  command: CLI_COMMANDS.debugWithRizin,
                  cleanup:
                    cause instanceof Error
                      ? cause.message
                      : "Unknown cleanup failure",
                },
                "Rizin fallback cleanup failed",
              );
            });
          }
        }),
      ),
  });
};
