export const __stub = 1;
//       if (!t.isIdentifier(expression)) return undefined;
//       const binding = resolveSemanticBindingState(
//         state,
//         expression,
//         expression.name,
//       );
//       const initializer = semanticStableInitializer(binding, state);
//       if (
//         binding === undefined ||
//         initializer === undefined ||
//         initializer.projection.length !== 0 ||
//         (initializer.node.end ?? Infinity) >= (expression.start ?? -1) ||
//         visited.has(binding.bindingId)
//       )
//         return undefined;
//       visited.add(binding.bindingId);
//       current = initializer.node;
//     }
//   };
//
//   const intrinsicReadChanged = (
//     node: t.Node,
//     path: readonly string[],
//   ): boolean => {
//     const capture = capturedIntrinsic(node)?.capturedAt ?? node;
//     const scope = opaqueMutationPath(capture).join(".");
//     const method = path.at(-1);
//     const invocationMethod =
//       method === "bind" || method === "call" || method === "apply";
//     return writes.some(
//       (write) =>
//         (write.scope === scope || write.scope === "intrinsic") &&
//         write.offset < (capture.start ?? -1) &&
//         (write.coverage.covers(path) ||
//           (invocationMethod &&
//             write.coverage.covers([
//               "intrinsic",
//               "Function",
//               "prototype",
//               method,
//             ]))),
//     );
//   };
//
//   const resolveBoundIntrinsic = (
//     node: t.Node,
//   ): JavaScriptIntrinsicInvocation | undefined => {
//     const visited = new Set<string>();
//     const argumentGroups: t.CallExpression["arguments"][] = [];
//     const bindReads: t.Node[] = [];
//     let opaqueArguments = false;
//     let receiver: t.Node | undefined;
//     let current = node;
//     for (;;) {
//       current = unwrapJavaScriptExpression(current).node;
//       if (t.isIdentifier(current)) {
//         const binding = resolveSemanticBindingState(
//           state,
//           current,
//           current.name,
//         );
//         const initializer = semanticStableInitializer(binding, state);
//         if (
//           binding === undefined ||
//           initializer === undefined ||
//           initializer.projection.length !== 0 ||
//           (initializer.node.end ?? Infinity) >= (current.start ?? -1) ||
//           visited.has(binding.bindingId)
//         )
//           return undefined;
//         visited.add(binding.bindingId);
//         current = initializer.node;
//         continue;
//       }
//       if (!t.isCallExpression(current)) return undefined;
//       const { root, members } = electronMemberPath(current.callee);
//       let bindTarget = root;
//       let bindingArguments: JavaScriptIntrinsicInvocation["arguments"] =
//         expandJavaScriptInvocationArguments(current.arguments);
//       let captured = capturedIntrinsic(current.callee);
//       let terminal = captured?.path.at(-1) === "bind";
//       let path: readonly string[] | undefined = captured?.path.slice(0, -1);
//       if (members.at(-1) === "bind") {
//         // A direct .bind may continue a bound callable, without discarding members.
//         if (!terminal && members.length !== 1) return undefined;
//         bindReads.push(captured?.capturedAt ?? current.callee);
//       } else {
//         // Reuse the invocation owner for generic call/apply/Reflect.apply of bind.
//         const invocation = resolveJavaScriptIntrinsicInvocation(
//           current,
//           intrinsicPath,
//           boundIntrinsic,
//           intrinsicReadChanged,
//         );
//         if (
//           invocation?.kind !== "known" ||
//           invocation.path.join(".") !== "intrinsic.Function.prototype.bind" ||
//           invocation.receiver === undefined
//         )
//           return undefined;
//         bindTarget = invocation.receiver;
//         bindingArguments = invocation.arguments;
//         captured = capturedIntrinsic(bindTarget);
//         terminal = captured !== undefined;
//         path = captured?.path;
//       }
//       receiver = bindingArguments?.[0];
//       const ownArguments = bindingArguments?.slice(1) ?? [];
//       opaqueArguments ||=
//         bindingArguments === undefined || t.isSpreadElement(receiver);
//       opaqueArguments ||= ownArguments.some((argument) =>
//         t.isSpreadElement(argument),
//       );
//       argumentGroups.push(ownArguments);
//       if (!terminal || path === undefined) {
//         current = bindTarget;
//         continue;
//       }
//       const boundPath = [...path, "bind"];
//       const functionBind = ["intrinsic", "Function", "prototype", "bind"];
//       opaqueArguments ||= bindReads.some((capture) => {
//         const scope = opaqueMutationPath(capture).join(".");
//         return writes.some(
//           (write) =>
//             (write.scope === scope || write.scope === "intrinsic") &&
//             write.offset < (capture.start ?? -1) &&
//             (write.coverage.covers(boundPath) ||
//               write.coverage.covers(functionBind)),
//         );
//       });
//       return {
//         kind: opaqueArguments ? "opaque" : "known",
//         path,
//         ...(receiver === undefined ? {} : { receiver }),
//         // Rebinding appends arguments to the earlier bound argument list.
//         arguments: opaqueArguments
//           ? undefined
//           : argumentGroups.toReversed().flat(),
//       };
//     }
//   };
//
//   const activeBoundValues = new WeakSet<t.Node>();
//   const boundIntrinsic = (
//     node: t.Node,
//   ): JavaScriptIntrinsicInvocation | undefined => {
//     if (activeBoundValues.has(node)) return undefined;
//     activeBoundValues.add(node);
//     try {
//       return resolveBoundIntrinsic(node);
//     } finally {
//       activeBoundValues.delete(node);
//     }
//   };
//
//   const isFreshObject = (node: t.Node): boolean => {
//     const visited = new Set<string>();
//     let current = node;
//     for (;;) {
//       current = unwrapJavaScriptExpression(current).node;
//       if (
//         t.isObjectExpression(current) ||
//         t.isArrayExpression(current) ||
//         t.isFunction(current) ||
//         (t.isClass(current) && !current.decorators?.length) ||
//         t.isRegExpLiteral(current)
//       )
//         return true;
//       if (!t.isIdentifier(current)) return false;
//       const binding = resolveSemanticBindingState(state, current, current.name);
//       const initializer = unprojectedInitializer(binding, state);
//       if (
//         binding === undefined ||
//         initializer === undefined ||
//         (!t.isFunctionDeclaration(initializer) &&
//           (initializer.end ?? Infinity) >= (current.start ?? -1)) ||
//         visited.has(binding.bindingId)
//       )
//         return false;
//       visited.add(binding.bindingId);
//       current = initializer;
//     }
//   };
//
//   const helperProof = (
//     binding: JavaScriptSemanticBindingState,
//   ): InteropHelper | undefined => {
//     const cached = helpers.get(binding.bindingId);
//     if (cached !== undefined) return cached ?? undefined;
//     helpers.set(binding.bindingId, null);
//     if (state.scopesById.get(binding.scopeId)?.kind !== "program")
//       return undefined;
//     const wrapper = unprojectedInitializer(binding, state);
//     if (wrapper === undefined) return undefined;
//     if (identityFunction(wrapper, state)) {
//       const proof = {
export const _l = 196;
