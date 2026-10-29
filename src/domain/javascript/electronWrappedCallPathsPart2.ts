export const __stub = 1;
//   };
//   // Duplicate checks consult only facts at the same endpoint and call site.
//   // Scanning every prior fact made bundles with many registrations quadratic.
//   let ipcByEndpoint: Map<string, IpcEndpointFacts> | undefined;
//   const ipcAtEndpoint = (): Map<string, IpcEndpointFacts> => {
//     if (ipcByEndpoint !== undefined) return ipcByEndpoint;
//     ipcByEndpoint = new Map();
//     for (const { value } of accumulator.ipc)
//       indexIpcFinding(ipcByEndpoint, value);
//     return ipcByEndpoint;
//   };
//   const hasConditions = (value: SymbolicValue): boolean =>
//     symbolicVariants(value).some((variant) => variant.conditions?.length);
//   function* bridgeMemberFunctions(
//     value: SymbolicValue,
//     segments: readonly string[] = [],
//     active = new Set<SymbolicValue>(),
//   ): Generator<{
//     readonly name: string;
//     readonly path: readonly string[];
//     readonly fn: SymbolicFunction;
//   }> {
//     if (active.has(value)) return;
//     if (active.size >= 128) {
//       accumulator.unknownFindings += 1;
//       accumulator.electronCallPathLimitReached = true;
//       return;
//     }
//     const nested = new Set(active);
//     nested.add(value);
//     for (const member of [...resolver.members(value)].sort()) {
//       if (--remainingVisits < 0) return;
//       const path = [...segments, member];
//       const name = path.join(".");
//       for (const variant of symbolicVariants(
//         resolver.property(value, member),
//       )) {
//         if (variant.kind === "function") yield { name, path, fn: variant };
//         else if (resolver.members(variant).length > 0)
//           yield* bridgeMemberFunctions(variant, path, nested);
//       }
//       if (remainingVisits < 0) return;
//     }
//   }
//   const isolatedBridgeCall = (
//     node: t.CallExpression | t.OptionalCallExpression,
//   ):
//     | { readonly env: SymbolicEnvironment; readonly callee: SymbolicValue }
//     | undefined => {
//     const env = resolver.environmentAt(node);
//     const callee = resolver.evaluate(node.callee, env);
//     return symbolicVariants(callee).some(
//       (callee) =>
//         callee.kind === "external" &&
//         identity.intactExport(callee.path) &&
//         callee.path.slice(1).join(".") ===
//           "contextBridge.exposeInIsolatedWorld",
//     )
//       ? { env, callee }
//       : undefined;
//   };
//   const electronStaticSymbolicValue = (
//     value: SymbolicValue | undefined,
//     node: t.Node | undefined,
//   ): ElectronStaticValue => {
//     const variants = value === undefined ? [] : symbolicVariants(value);
//     const variant = variants.length === 1 ? variants[0] : undefined;
//     if (variant?.kind === "literal" && variant.value !== undefined)
//       return {
//         status: "literal",
//         value: variant.value,
//         expression: null,
//       };
//     return {
//       status: "dynamic",
//       value: null,
//       expression: boundedExpression(source, node),
//     };
//   };
//   const emit = (
//     context: PathContext,
//     node: t.Node,
//     terminal: string,
//     channel = context.channel,
//   ): void => {
//     if (context.entryKind === null) return;
//     const path: ElectronCallPath = {
//       entry_kind: context.entryKind,
//       entry: context.entry,
//       ...(context.entryKind !== "bridge-member" ||
//       context.entryPath === undefined
//         ? {}
//         : { entry_path: context.entryPath }),
//       channel,
//       terminal,
//       resolution: "candidate",
//       steps: [...context.steps, step(node, "terminal", terminal)],
//       conditions: context.conditions,
//     };
//     const key = JSON.stringify(path);
//     if (seen.has(key)) return;
//     seen.add(key);
//     paths.push(path);
//   };
//   const functionBody = (
//     fn: SymbolicFunction,
//     args: readonly SymbolicValue[],
//     context: PathContext,
//     invocationNode: t.Node,
//   ): void => {
//     if (context.active.has(fn.node)) return;
//     if (fn.conditionUnresolved === true) {
//       accumulator.unknownFindings += 1;
//       return;
//     }
//     const name =
//       (t.isFunctionExpression(fn.node) || t.isFunctionDeclaration(fn.node)) &&
//       fn.node.id
//         ? fn.node.id.name
//         : "closure";
//     walk(fn.node.body, resolver.bind(fn, args, invocationNode), {
//       ...context,
//       steps: [
//         ...context.steps,
//         ...fn.origins.map((n) =>
//           step(
//             n,
//             "factory",
//             t.isCallExpression(n) ? callLabel(n.callee) : "factory",
//           ),
//         ),
//         step(fn.node, "function", name),
//       ],
//       active: new Set([...context.active, fn.node]),
//     });
//   };
//   const ipc = (
//     node: t.CallExpression | t.OptionalCallExpression,
//     descriptor: ElectronIpcDescriptor,
//     args: readonly SymbolicValue[],
//     context: PathContext,
//     endpoint: string,
//     guardedDispatch: boolean,
//   ): void => {
//     const first = args[0];
//     if (first?.kind !== "literal" || typeof first.value !== "string") {
//       accumulator.unknownFindings += 1;
//       return;
//     }
//     const channelContext = metadataContext(context, first);
//     if (!channelContext) return;
//     const handlerValue = args[1] ?? symbolicUnknown("missing handler");
//     const handlerContext = metadataContext(channelContext, handlerValue);
//     if (!handlerContext) return;
//     const channel = first.value;
//     const location = range(node);
//     const invocationLocation =
//       JSON.stringify(range(context.entryNode)) === JSON.stringify(location)
//         ? undefined
//         : range(context.entryNode);
//     const findingContext = {
//       module_key: null,
//       location,
//       ...(invocationLocation === undefined
//         ? {}
//         : { invocation_location: invocationLocation }),
//     };
//     const handlers = symbolicVariants(handlerValue);
//     // A channel registration must not acquire one arbitrary handler from a union.
//     // Keep the unresolved registration so it still competes with other handlers.
//     const fn =
//       handlers.length === 1 && handlers[0]?.kind === "function"
//         ? handlers[0]
//         : undefined;
//     const handlerNode = node.arguments[1];
//     const finding: ElectronIpcFinding =
//       descriptor.mode === "send" || descriptor.mode === "invoke"
//         ? {
//             ...descriptor,
export const _l = 179;
