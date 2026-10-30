export const __stub = 1;
//             channel,
//             channel_expression: null,
//             handler_kind: null,
//             handler_location: null,
//             ...findingContext,
//           }
//         : fn
//           ? {
//               ...descriptor,
//               channel,
//               channel_expression: null,
//               handler_kind: "inline-function",
//               handler_location: range(fn.node),
//               ...findingContext,
//             }
//           : handlerNode
//             ? {
//                 ...descriptor,
//                 channel,
//                 channel_expression: null,
//                 handler_kind: "dynamic-expression",
//                 handler_location: range(handlerNode),
//                 ...findingContext,
//               }
//             : {
//                 ...descriptor,
//                 channel,
//                 channel_expression: null,
//                 handler_kind: "missing",
//                 handler_location: null,
//                 ...findingContext,
//               };
//     // A fully observed transmission stays one source fact when its callback is
//     // traced. Registrations retain invocation identity because handlers compete.
//     const recorded = ipcAtEndpoint().get(ipcEndpointKey(finding));
//     const duplicate =
//       recorded !== undefined &&
//       (recorded.observedTransmission ||
//         recorded.invocations.has(ipcInvocationKey(invocationLocation)));
//     const findingGuarded =
//       context.conditions.length > 0 || hasConditions(first) || guardedDispatch;
//     if (!duplicate && !findingGuarded) {
//       const value: ElectronIpcFinding = {
//         ...finding,
//         resolution_basis: "wrapper-substitution",
//       };
//       accumulator.ipc.push({ offset: node.start ?? -1, value });
//       indexIpcFinding(ipcAtEndpoint(), value);
//       if (descriptor.mode !== "send" && descriptor.mode !== "invoke" && !fn)
//         accumulator.unknownFindings += 1;
//     } else if (findingGuarded) accumulator.unknownFindings += 1;
//     if (descriptor.mode === "send" || descriptor.mode === "invoke") {
//       emit(channelContext, node, endpoint, channel);
//       return;
//     }
//     if (descriptor.side === "main" && fn)
//       functionBody(
//         fn,
//         [
//           { kind: "external", path: ["ipc-event"] },
//           symbolicUnknown("IPC payload"),
//         ],
//         {
//           ...handlerContext,
//           entryKind: "ipc-handler",
//           entry: channel,
//           channel,
//           steps: [...context.steps, step(node, "ipc", endpoint)],
//         },
//         node,
//       );
//   };
//   const bridge = (
//     node: t.CallExpression | t.OptionalCallExpression,
//     exposure: JavaScriptContextBridgeExposureArguments<SymbolicValue>,
//     context: PathContext,
//     guardedDispatch: boolean,
//   ): void => {
//     const key = exposure.apiKey;
//     const object = exposure.api;
//     const worldValue =
//       exposure.worldId === null
//         ? null
//         : (exposure.worldId ?? symbolicUnknown("missing world id"));
//     const worldContext =
//       worldValue === null ? context : metadataContext(context, worldValue);
//     if (!worldContext) return;
//     const worldId =
//       worldValue === null
//         ? null
//         : electronStaticSymbolicValue(
//             worldValue,
//             exposure.worldIdIndex === null
//               ? undefined
//               : argumentNode(node.arguments[exposure.worldIdIndex]),
//           );
//     if (worldId?.status === "dynamic") accumulator.unknownFindings += 1;
//     if (key?.kind !== "literal" || typeof key.value !== "string" || !object) {
//       accumulator.unknownFindings += 1;
//       return;
//     }
//     const keyContext = metadataContext(worldContext, key);
//     if (!keyContext || !metadataContext(keyContext, object)) return;
//     const members = [...resolver.members(object)].sort();
//     const location = range(node);
//     const existing = accumulator.contextBridgeApis.find(
//       ({ value }) =>
//         JSON.stringify(value.location) === JSON.stringify(location),
//     );
//     const finding: ElectronContextBridgeFinding = {
//       world: exposure.world,
//       world_id: worldId,
//       api_key: key.value,
//       api_key_expression: null,
//       api_status: "dynamic" as const,
//       resolution_basis: "wrapper-substitution" as const,
//       // The direct syntax pass recursively retains literal dotted paths. The
//       // symbolic resolver enumerates only immediate object keys, so its
//       // replacement must not erase paths already established at this call.
//       members: [
//         ...new Set([...(existing?.value.members ?? []), ...members]),
//       ].sort(compareUnicodeCodePoints),
//       unknown_members: resolver.unknownMembers(object),
//       module_key: null,
//       location,
//     };
//     // This report shape has no predicate field, so a guarded world or object
//     // cannot be recorded as an unconditional exposure fact.
//     const guardedWorld = worldValue !== null && hasConditions(worldValue);
//     const guardedKey = hasConditions(key);
//     const guardedObject = hasConditions(object);
//     const guarded =
//       context.conditions.length > 0 ||
//       guardedWorld ||
//       guardedKey ||
//       guardedObject ||
//       guardedDispatch;
//     if (guarded) accumulator.unknownFindings += 1;
//     // Existing entries are raw syntax observations and remain valid even when
//     // symbolic substitution can only describe this call under a predicate.
//     if (!guarded && existing)
//       (existing.value.api_status !== "object-literal" ||
//         existing.value.unknown_members > 0) &&
//         accumulator.contextBridgeApis.splice(
//           accumulator.contextBridgeApis.indexOf(existing),
//           1,
//           { offset: node.start ?? -1, value: finding },
//         );
//     else if (!guarded)
//       accumulator.contextBridgeApis.push({
//         offset: node.start ?? -1,
//         value: finding,
//       });
//     for (const { name, path, fn } of bridgeMemberFunctions(object)) {
//       const memberContext = metadataContext(keyContext, fn);
//       if (!memberContext) continue;
//       const entry = `${key.value}.${name}`;
//       functionBody(
//         fn,
//         runtimeFunctionParameters(fn.node).map(() =>
//           symbolicUnknown("public API argument"),
//         ),
//         {
//           ...memberContext,
//           entryNode: node,
//           entryKind: "bridge-member",
//           entry,
//           entryPath: [key.value, ...path],
//           channel: null,
//           steps: [step(node, "exposure", entry)],
//           active: new Set(),
//         },
//         node,
//       );
//     }
//   };
//   const call = (
//     node: t.CallExpression | t.OptionalCallExpression,
//     env: SymbolicEnvironment,
export const _l = 179;
