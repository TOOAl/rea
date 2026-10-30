import { readFile } from "node:fs/promises";
import { AnalysisCapabilityUnavailableError } from "../domain/analysisErrorCore.js";

import { launcherIdentityFailure } from "./ProcessOwnershipIdentity.js";
import { descendantsOf, liveProcesses } from "./ProcessOwnershipProcessTree.js";
import { execFileOutput } from "./ExecFileOutput.js";
import {
  createDarwinProcessRunTokenReader,
  type DarwinProcessReaderCompiler,
} from "./DarwinProcessRunTokenReader.js";
import { readProcessRunTokens } from "./ProcessRunTokenObservations.js";
import type {
  OwnedProcessGroup,
  ProcessGroupObservation,
  ProcessLineageObservation,
  ProcessOwnershipHost,
  ProcessIdentityObservation,
  ProcessOwnershipBaseline,
  ProcessTableEntry,
} from "./ProcessOwnership.js";

/** Observe multiple groups from one process snapshot and one token batch. */
export const observeOwnedProcessGroups = async (
  runId: string,
  processGroupIds: readonly number[],
  host: ProcessOwnershipHost = systemProcessOwnershipHost,
  signal?: AbortSignal,
): Promise<ReadonlyMap<number, ProcessGroupObservation>> => {
  signal?.throwIfAborted();
  const groupIds = [...new Set(processGroupIds)];
  if (groupIds.length === 0) return new Map();
  let processes: readonly ProcessTableEntry[];
  try {
    processes = liveProcesses(await host.listProcesses(signal));
  } catch (cause: unknown) {
    signal?.throwIfAborted();
    const failure = {
      state: "unverifiable" as const,
      reason: `process group could not be inspected: ${errorMessage(cause)}`,
    };
    return new Map(groupIds.map((groupId) => [groupId, failure]));
  }
  signal?.throwIfAborted();
  const membersByGroup = new Map(
    groupIds.map((groupId) => [groupId, [] as ProcessTableEntry[]]),
  );
  for (const process of processes)
    membersByGroup.get(process.processGroupId)?.push(process);
  const observations = new Map<number, ProcessGroupObservation>(
    groupIds.map((groupId) => [
      groupId,
      (membersByGroup.get(groupId)?.length ?? 0) > 0
        ? { state: "alive" }
        : { state: "empty" },
    ]),
  );
  const liveMembers = groupIds.flatMap(
    (groupId) => membersByGroup.get(groupId) ?? [],
  );
  const pendingGroups = new Set(
    groupIds.filter(
      (groupId) => (membersByGroup.get(groupId)?.length ?? 0) > 0,
    ),
  );
  for await (const { process: member, observation } of readProcessRunTokens(
    host,
    liveMembers,
    signal,
  )) {
    if (!pendingGroups.has(member.processGroupId)) continue;
    if (observation.state === "readable") {
      if (observation.runId !== runId) {
        observations.set(member.processGroupId, {
          state: "unverifiable",
          reason: "process ownership did not match",
        });
        pendingGroups.delete(member.processGroupId);
      }
    } else {
      const gone = await processIsGone(host, member.pid);
      signal?.throwIfAborted();
      if (!gone) {
        observations.set(member.processGroupId, {
          state: "unverifiable",
          reason: `process ownership could not be revalidated for PID ${member.pid}: ${observation.reason}`,
        });
        pendingGroups.delete(member.processGroupId);
      }
    }
    if (pendingGroups.size === 0) break;
  }
  signal?.throwIfAborted();
  return observations;
};

/**
 * Record the live launcher and descendant lineage after run-token validation.
 *
 * The observation is intentionally point-in-time. A verified empty descendant
 * list means no descendants were live during this observation, not that the
 * run never created a short-lived child.
 */
export const observeOwnedProcessLineage = async (
  ownership: OwnedProcessGroup,
  host: ProcessOwnershipHost = systemProcessOwnershipHost,
): Promise<ProcessLineageObservation> => {
  let processes: readonly ProcessTableEntry[];
  try {
    processes = liveProcesses(await host.listProcesses());
  } catch (cause: unknown) {
    return unavailableLineage(
      ownership,
      `process table could not be inspected: ${errorMessage(cause)}`,
    );
  }
  const launcher = processes.find(({ pid }) => pid === ownership.leaderPid);
  if (launcher === undefined)
    return unavailableLineage(ownership, "owned launcher is not live");
  const identityFailure = launcherIdentityFailure(launcher, ownership);
  if (identityFailure !== null)
    return unavailableLineage(ownership, identityFailure);
  const descendants = descendantsOf([launcher.pid], processes);
  const verifiedDescendants: ProcessTableEntry[] = [];
  for await (const { process: member, observation } of readProcessRunTokens(
    host,
    [launcher, ...descendants],
  )) {
    if (observation.state === "readable") {
      if (observation.runId !== ownership.runId)
        return unavailableLineage(
          ownership,
          "process lineage contains an unowned or PID-reused process",
        );
      if (member.pid !== launcher.pid) verifiedDescendants.push(member);
    } else {
      if (await processIsGone(host, member.pid)) {
        if (member.pid === launcher.pid)
          return unavailableLineage(
            ownership,
            "owned launcher exited during lineage validation",
          );
        continue;
      }
      return unavailableLineage(
        ownership,
        `process ownership could not be revalidated for PID ${member.pid}: ${observation.reason}`,
      );
    }
  }
  return {
    status: "verified",
    observedAt: new Date().toISOString(),
    lineage: {
      runId: ownership.runId,
      launcherPid: launcher.pid,
      launcherParentPid: launcher.parentPid,
      processGroupId: launcher.processGroupId,
      descendants: verifiedDescendants
        .sort((left, right) => left.pid - right.pid)
        .map(({ pid, parentPid, processGroupId }) => ({
          pid,
          parentPid,
          processGroupId,
        })),
    },
  };
};

const unavailableLineage = (
  ownership: OwnedProcessGroup,
  reason: string,
): Extract<ProcessLineageObservation, { readonly status: "unavailable" }> => ({
  status: "unavailable",
  observedAt: new Date().toISOString(),
  runId: ownership.runId,
  launcherPid: ownership.leaderPid,
  processGroupId: ownership.processGroupId,
  reason,
});

/** Parse the NUL-delimited Linux process environment without nameless keys. */
export const parseProcessEnvironment = (
  value: string,
): Readonly<Record<string, string>> =>
  Object.fromEntries(
    value
      .split("\0")
      .filter((entry) => entry.indexOf("=") > 0)
      .map((entry) => {
        const separator = entry.indexOf("=");
        return [entry.slice(0, separator), entry.slice(separator + 1)];
      }),
  );

/** Read Linux stat field 22, tolerating spaces and closing parentheses in comm. */
export const parseLinuxProcessStartTime = (
  value: string,
): string | undefined => {
  const commandEnd = value.lastIndexOf(")");
  if (commandEnd < 0) return undefined;
  const fields = value
    .slice(commandEnd + 1)
    .trim()
    .split(/\s+/u);
  const startTime = fields[19];
  return startTime !== undefined && /^\d+$/u.test(startTime)
    ? startTime
    : undefined;
};

const isExpectedAbort = (
  cause: unknown,
  signal: AbortSignal | undefined,
): boolean =>
  signal?.aborted === true &&
  (cause === signal.reason ||
    (cause instanceof Error && cause.name === "AbortError"));

/** Create the operating-system process inspector for an explicit host context. */
