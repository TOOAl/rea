import * as t from "@babel/types";

import type {
  JavaScriptSemanticCallable,
  JavaScriptSemanticChildProcessInteraction,
  JavaScriptSemanticChildProcessSpawn,
} from "./javascriptSemanticIr.js";
import { createSemanticCallableIdStack } from "./javascriptSemanticCallableStack.js";
import {
  resolveSemanticBindingState,
  type JavaScriptSemanticAnalysisState,
} from "./javascriptSemanticState.js";
import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";
import { range } from "./javascriptStaticAnalysisHelpers.js";
import {
  dataEffectLiteralString,
  assignedSemanticResultBindings,
  scalarAssignedResultBinding,
  semanticProjectedBindingFacts,
} from "./javascriptSemanticDataEffectHelpers.js";

const CHILD_PROCESS_METHODS = ["spawn", "exec", "execFile", "fork"] as const;
const CHILD_LISTENER_METHODS = ["on", "once", "addListener"] as const;

interface ChildProcessAnalysis {
  readonly childProcessSpawns: readonly JavaScriptSemanticChildProcessSpawn[];
  readonly childProcessInteractions: readonly JavaScriptSemanticChildProcessInteraction[];
}

interface SpawnCandidate {
  readonly node: t.CallExpression | t.OptionalCallExpression;
  readonly method: JavaScriptSemanticChildProcessSpawn["method"];
  readonly ownerCallableId: string | null;
  readonly resultBindingId: string | null;
  readonly projectedResultBindings: readonly {
    readonly bindingId: string;
    readonly projectionPath: readonly (string | number | null)[];
    readonly resolution: "complete" | "partial";
  }[];
}

interface ChildInteractionContext {
  readonly state: JavaScriptSemanticAnalysisState;
  readonly spawnByNode: WeakMap<t.Node, SpawnCandidate>;
  readonly spawnsByBinding: ReadonlyMap<string, readonly SpawnCandidate[]>;
}

/** Recover explicit asynchronous node:child_process ownership candidates. */
export const collectJavaScriptSemanticChildProcesses = (
  program: t.Program,
  state: JavaScriptSemanticAnalysisState,
  callables: readonly JavaScriptSemanticCallable[],
): ChildProcessAnalysis => {
  const candidates = collectSpawns(program, state, callables);
  const childProcessSpawns = candidates.map((candidate) =>
    immutableSpawn(candidate),
  );
  return {
    childProcessSpawns,
    childProcessInteractions: collectInteractions(
      program,
      state,
      callables,
      candidates,
    ),
  };
};

const collectSpawns = (
  program: t.Program,
  state: JavaScriptSemanticAnalysisState,
  callables: readonly JavaScriptSemanticCallable[],
): SpawnCandidate[] => {
  const output: SpawnCandidate[] = [];
  const admittedCallables = new Set(
    callables.map(({ callableId }) => callableId),
  );
  const callableStack = createSemanticCallableIdStack(admittedCallables);
  const ancestors: t.Node[] = [];
  traverseJavaScriptAst(program, {
    enter: (node, parent) => {
      callableStack.enter(node, parent);
      if (t.isCallExpression(node) || t.isOptionalCallExpression(node)) {
        const method = childProcessMethod(node.callee, state);
        if (method !== null) {
          const projectedResultBindings = assignedSemanticResultBindings(
            node,
            ancestors,
            state,
          );
          output.push({
            node,
            method,
            ownerCallableId: callableStack.callables.at(-1) ?? null,
            resultBindingId: scalarAssignedResultBinding(
              projectedResultBindings,
            ),
            projectedResultBindings: semanticProjectedBindingFacts(
              projectedResultBindings.filter(
                ({ projectionPath }) => projectionPath.length > 0,
              ),
            ),
          });
        }
      }
      ancestors.push(node);
    },
    exit: (node) => {
      ancestors.pop();
      callableStack.exit(node);
    },
  });
  return output;
};

const immutableSpawn = (
  candidate: SpawnCandidate,
): JavaScriptSemanticChildProcessSpawn => {
  const options = spawnOptions(candidate);
  const command = dataEffectLiteralString(candidate.node.arguments[0]);
  return {
    processId: spawnId(candidate),
    method: candidate.method,
    location: range(candidate.node),
    ownerCallableId: candidate.ownerCallableId,
    resultBindingId: candidate.resultBindingId,
    projectedResultBindings: candidate.projectedResultBindings,
    command,
    argvCount: spawnArgvCount(candidate),
    environmentSupplied: objectHasProperty(options, "env"),
    stdioMode: stdioMode(options),
    resolution: command === null ? "partial" : "complete",
  };
};

const collectInteractions = (
  program: t.Program,
  state: JavaScriptSemanticAnalysisState,
  callables: readonly JavaScriptSemanticCallable[],
  spawns: readonly SpawnCandidate[],
): JavaScriptSemanticChildProcessInteraction[] => {
  const output: JavaScriptSemanticChildProcessInteraction[] = [];
  const callableIds = new Set(callables.map(({ callableId }) => callableId));
  const callableStack = createSemanticCallableIdStack(callableIds);
  const spawnByNode = new WeakMap<t.Node, SpawnCandidate>();
  const spawnsByBinding = new Map<string, SpawnCandidate[]>();
  for (const spawn of spawns) {
    spawnByNode.set(spawn.node, spawn);
    const ids = [
      ...(spawn.resultBindingId === null ? [] : [spawn.resultBindingId]),
      ...spawn.projectedResultBindings.map(({ bindingId }) => bindingId),
    ];
    for (const id of ids) {
      const existing = spawnsByBinding.get(id) ?? [];
      existing.push(spawn);
      spawnsByBinding.set(id, existing);
    }
  }
  const context: ChildInteractionContext = {
    state,
    spawnByNode,
    spawnsByBinding,
  };
  traverseJavaScriptAst(program, {
    enter: (node, parent) => {
      callableStack.enter(node, parent);
      if (!t.isCallExpression(node) && !t.isOptionalCallExpression(node))
        return;
      const interaction = childInteraction(
        node,
        callableStack.callables.at(-1) ?? null,
        context,
      );
      if (interaction === null) return;
      output.push(interaction);
    },
    exit: (node) => callableStack.exit(node),
  });
  return output;
};
