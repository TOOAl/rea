export const __stub = 1;
//     context: PathContext,
//     evaluatedCallee?: SymbolicValue,
//   ): void => {
//     const value = evaluatedCallee ?? resolver.evaluate(node.callee, env);
//     const args = resolver.arguments(node, env);
//     for (const callee of symbolicVariants(value)) {
//       const branchContext = metadataContext(context, callee);
//       if (!branchContext) continue;
//       if (callee.kind === "function") {
//         functionBody(
//           callee,
//           args,
//           {
//             ...branchContext,
//             steps: [
//               ...branchContext.steps,
//               step(node, "call", callLabel(node.callee)),
//             ],
//           },
//           node,
//         );
//       } else if (callee.kind === "external") {
//         const path = callee.path;
//         const endpoint = path.join(".");
//         if (identity.intactExport(path)) {
//           const descriptor = ipcDescriptor(path.slice(1));
//           const exposure =
//             path.length === 3 && path[1] === "contextBridge"
//               ? contextBridgeExposureArguments(path[2] ?? "", args)
//               : undefined;
//           if (exposure)
//             bridge(node, exposure, branchContext, hasConditions(callee));
//           else if (descriptor)
//             ipc(
//               node,
//               descriptor,
//               args,
//               branchContext,
//               endpoint,
//               hasConditions(callee),
//             );
//           else if (path[1] === "clipboard") emit(branchContext, node, endpoint);
//         } else if (
//           (path[0] === "navigator" && path[1] === "clipboard") ||
//           (path[0] === "ipc-event" && path[1] === "sender")
//         )
//           emit(branchContext, node, endpoint);
//       }
//     }
//   };
//   function walk(
//     node: t.Node,
//     env: SymbolicEnvironment,
//     context: PathContext,
//   ): void {
//     if (--remainingVisits < 0 || t.isFunction(node) || t.isClass(node)) return;
//     if (t.isBlockStatement(node)) {
//       let next = context;
//       for (const statement of node.body) {
//         walk(statement, env, next);
//         const fallthrough = sequentialFallthrough(statement, env, next);
//         if (!fallthrough.continues) break;
//         next = fallthrough.context;
//       }
//       return;
//     }
//     if (t.isIfStatement(node) || t.isConditionalExpression(node)) {
//       const truth = symbolicTruth(resolver.evaluate(node.test, env));
//       if (truth !== false)
//         walk(
//           node.consequent,
//           env,
//           truth === undefined ? condition(context, node.test) : context,
//         );
//       if (truth !== true && node.alternate)
//         walk(
//           node.alternate,
//           env,
//           truth === undefined ? condition(context, node.test, false) : context,
//         );
//       return;
//     }
//     if (t.isLogicalExpression(node)) {
//       walk(node.left, env, context);
//       const right = symbolicLogicalRight(
//         node.operator,
//         resolver.evaluate(node.left, env),
//       );
//       if (right === false) return;
//       walk(
//         node.right,
//         env,
//         right === undefined
//           ? condition(
//               context,
//               node.left,
//               node.operator === "??" ? "nullish" : node.operator === "&&",
//             )
//           : context,
//       );
//       return;
//     }
//     if (t.isCallExpression(node) || t.isOptionalCallExpression(node))
//       call(node, env, context);
//     for (const child of childNodes(node)) walk(child, env, context);
//   }
//   traverseJavaScriptAst(program, {
//     enter: (node) => {
//       if (!t.isCallExpression(node) && !t.isOptionalCallExpression(node))
//         return;
//       const isolatedSeed = t.isStringLiteral(node.arguments[0])
//         ? undefined
//         : isolatedBridgeCall(node);
//       if (!t.isStringLiteral(node.arguments[0]) && isolatedSeed === undefined)
//         return;
//       const env = isolatedSeed?.env ?? resolver.environmentAt(node);
//       let context: PathContext = {
//         entryNode: node,
//         entry: "",
//         entryKind: null,
//         channel: null,
//         steps: [],
//         conditions: [],
//         active: new Set(),
//       };
//       for (
//         let child: t.Node = node, parent = state.parentsByNode.get(child);
//         parent && !t.isFunction(parent);
//         child = parent, parent = state.parentsByNode.get(child)
//       ) {
//         if (t.isIfStatement(parent) || t.isConditionalExpression(parent)) {
//           if (child === parent.test) continue;
//           const truth = symbolicTruth(resolver.evaluate(parent.test, env));
//           const positive = child === parent.consequent;
//           if (truth !== undefined && truth !== positive) return;
//           if (truth === undefined)
//             context = condition(context, parent.test, positive);
//         } else if (t.isLogicalExpression(parent) && child === parent.right) {
//           const right = symbolicLogicalRight(
//             parent.operator,
//             resolver.evaluate(parent.left, env),
//           );
//           if (right === false) return;
//           if (right === undefined)
//             context = condition(
//               context,
//               parent.left,
//               parent.operator === "??" ? "nullish" : parent.operator === "&&",
//             );
//         } else if (t.isBlockStatement(parent)) {
//           const index = parent.body.findIndex(
//             (statement) => statement === child,
//           );
//           if (index >= 0) {
//             for (const statement of parent.body.slice(0, index)) {
//               const fallthrough = sequentialFallthrough(
//                 statement,
//                 env,
//                 context,
//               );
//               if (!fallthrough.continues) return;
//               context = fallthrough.context;
//             }
//           }
//         }
//       }
//       call(node, env, context, isolatedSeed?.callee);
//     },
//   });
//   if (remainingVisits < 0 || resolver.truncated) {
//     accumulator.unknownFindings += 1;
//     accumulator.electronCallPathLimitReached = true;
//   }
//   if (resolver.unresolved) accumulator.unknownFindings += 1;
//   return paths;
// };
export const _l = 176;
