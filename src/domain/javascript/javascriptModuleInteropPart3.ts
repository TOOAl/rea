export const __stub = 1;
//         dependencies: [],
//         readyAfter: t.isFunctionDeclaration(wrapper)
//           ? -1
//           : (wrapper.end ?? Infinity),
//         identity: true,
//       };
//       helpers.set(binding.bindingId, proof);
//       return proof;
//     }
//     const wrapperRoles = canonicalRoles(wrapper, TO_ESM, state);
//     const copyBinding = wrapperRoles?.get("__copyProps");
//     const copy = unprojectedInitializer(copyBinding, state);
//     const copyRoles =
//       copy === undefined ? undefined : canonicalRoles(copy, COPY_PROPS, state);
//     if (
//       wrapperRoles === undefined ||
//       copyRoles === undefined ||
//       copy === undefined
//     )
//       return undefined;
//     const dependencies: IntrinsicDependency[] = [];
//     let readyAfter = Math.max(wrapper.end ?? Infinity, copy.end ?? Infinity);
//     for (const roles of [wrapperRoles, copyRoles])
//       for (const [role, dependency] of roles) {
//         const expected = INTRINSICS[role];
//         if (expected === undefined) continue;
//         const initializer = unprojectedInitializer(dependency, state);
//         const captured =
//           initializer === undefined
//             ? undefined
//             : capturedIntrinsic(initializer);
//         if (
//           initializer === undefined ||
//           captured === undefined ||
//           JSON.stringify(captured.path) !==
//             JSON.stringify(["intrinsic", ...expected])
//         )
//           return undefined;
//         readyAfter = Math.max(readyAfter, initializer.end ?? Infinity);
//         dependencies.push(captured);
//         if (role === "__hasOwnProp")
//           dependencies.push({ path: [...captured.path, "call"] });
//       }
//     dependencies.push(
//       { path: ["intrinsic", "Function", "prototype", "bind"] },
//       { path: ["intrinsic", "Function", "prototype", "call"] },
//     );
//     const proof = {
//       dependencies,
//       identity: false,
//       readyAfter,
//     };
//     helpers.set(binding.bindingId, proof);
//     return proof;
//   };
//
//   const provenCall = (node: t.Node) => {
//     if (!t.isCallExpression(node) || !t.isIdentifier(node.callee))
//       return undefined;
//     const helper = resolveSemanticBindingState(
//       state,
//       node.callee,
//       node.callee.name,
//     );
//     const proof = helper === undefined ? undefined : helperProof(helper);
//     const input = node.arguments[0];
//     const mode = node.arguments[1];
//     const literalMode =
//       mode === undefined
//         ? { found: true, value: false }
//         : t.isExpression(mode)
//           ? readExactJavaScriptLiteral(mode)
//           : { found: false };
//     if (
//       proof === undefined ||
//       proof.readyAfter >= (node.start ?? -1) ||
//       !t.isExpression(input) ||
//       node.arguments.length > 2 ||
//       !literalMode.found
//     )
//       return undefined;
//     return {
//       input,
//       // A truthy node mode forces the module-valued default. Other modes
//       // preserve named exports without proving the source's default property.
//       defaultIsModule: !proof.identity && Boolean(literalMode.value),
//       dependencies: proof.dependencies.map((dependency) => ({
//         ...dependency,
//         capturedAt: dependency.capturedAt ?? node,
//       })),
//     };
//   };
//
//   const callOrigin = (node: t.Node): InteropOrigin | undefined => {
//     const cached = calls.get(node);
//     if (cached !== undefined) return cached;
//     const { root, members } = electronMemberPath(node);
//     if (!members.every((member): member is string => member !== null))
//       return undefined;
//     const converted = provenCall(root);
//     const required =
//       converted === undefined
//         ? undefined
//         : semanticRequireOrigin(converted.input, state)?.origin;
//     if (
//       converted === undefined ||
//       required === undefined ||
//       required.importedPath.length !== 0 ||
//       (members[0] === "default" && !converted.defaultIsModule)
//     )
//       return undefined;
//     const result = {
//       origin: { ...required, importedPath: members },
//       dependencies: converted.dependencies,
//       defaultIsModule: converted.defaultIsModule,
//     };
//     calls.set(node, result);
//     return result;
//   };
//
//   const origin = (
//     binding: JavaScriptSemanticBindingState,
//   ): InteropOrigin | undefined => {
//     const single = semanticStableInitializer(binding, state);
//     if (single !== undefined) {
//       if (
//         !single.projection.every(
//           (key): key is string => typeof key === "string",
//         )
//       )
//         return undefined;
//       const converted = callOrigin(single.node);
//       if (
//         converted?.origin.importedPath.length === 0 &&
//         single.projection[0] === "default" &&
//         !converted.defaultIsModule
//       )
//         return undefined;
//       const result =
//         converted === undefined
//           ? undefined
//           : {
//               ...converted,
//               origin: {
//                 ...converted.origin,
//                 importedPath: [
//                   ...converted.origin.importedPath,
//                   ...single.projection,
//                 ],
//               },
//             };
//       if (result !== undefined) origins.set(binding.bindingId, result);
//       return result;
//     }
//     const [initial, converted] = binding.initializers;
//     if (
//       binding.definitions.length !== 2 ||
//       binding.definitions[0]?.kind !== "variable" ||
//       binding.definitions[1]?.kind !== "assignment" ||
//       binding.initializers.length !== 2 ||
//       initial === undefined ||
//       converted === undefined ||
//       initial.projection.length !== 0 ||
//       converted.projection.length !== 0 ||
//       state.conditionallySkippedExpressions.has(initial.node)
//     )
//       return undefined;
//     const call = converted.node;
//     const assignment = state.parentsByNode.get(call);
//     const statement =
//       assignment === undefined
//         ? undefined
//         : state.parentsByNode.get(assignment);
//     const declaration = state.parentsByNode.get(initial.node);
//     const declarationStatement =
//       declaration === undefined
//         ? undefined
//         : state.parentsByNode.get(declaration);
//     if (
//       !t.isCallExpression(call) ||
//       !t.isIdentifier(call.callee) ||
//       !t.isAssignmentExpression(assignment, { operator: "=" }) ||
//       assignment.right !== call ||
//       !t.isIdentifier(assignment.left, { name: binding.name }) ||
//       !t.isExpressionStatement(statement) ||
//       !t.isVariableDeclarator(declaration) ||
//       !t.isVariableDeclaration(declarationStatement) ||
//       state.parentsByNode.get(statement) !==
//         state.parentsByNode.get(declarationStatement) ||
//       (initial.node.start ?? Infinity) >= (call.start ?? -1)
//     )
//       return undefined;
//     const convertedCall = provenCall(call);
//     const input = convertedCall?.input;
//     if (
//       !t.isIdentifier(input) ||
export const _l = 196;
