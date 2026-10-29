export const __stub = 1;
//  * Member kinds each operand kind may name. A MemberRef whose signature does
//  * not decode keeps its name on calls, as before, but is never named a field.
//  */
// const NAMEABLE_KINDS = new Map<string, ReadonlySet<MemberCore["kind"]>>([
//   ["method", new Set(["method", "unknown"])],
//   ["field", new Set(["field"])],
// ]);
//
// const targetKind = (token: string): ManagedCallEdge["target_kind"] =>
//   token.startsWith("0x06")
//     ? "method-def"
//     : token.startsWith("0x0a")
//       ? "member-ref"
//       : token.startsWith("0x2b")
//         ? "method-spec"
//         : "unknown";
//
// /** The member an operand names, if the operand kind can name that member's kind. */
// const namedTarget = (
//   members: ReadonlyMap<string, MemberCore>,
//   operandKind: string,
//   operand: string,
// ): MemberCore | undefined => {
//   const member = members.get(operand);
//   return member !== undefined &&
//     NAMEABLE_KINDS.get(operandKind)?.has(member.kind) === true
//     ? member
//     : undefined;
// };
//
// export const edges = (
//   methods: readonly ManagedMethod[],
//   members: ReadonlyMap<string, MemberCore>,
//   budget: ManagedDecodeBudget,
// ): {
//   readonly callEdges: readonly ManagedCallEdge[];
//   readonly fieldAccesses: readonly ManagedFieldAccess[];
// } => {
//   const callEdges: ManagedCallEdge[] = [];
//   const fieldAccesses: ManagedFieldAccess[] = [];
//   for (const method of methods) {
//     const derives = method.body.anchors.some(
//       (anchor) =>
//         anchor.opcode !== "ldtoken" &&
//         anchor.operand !== null &&
//         (anchor.operand_kind === "method" || anchor.operand_kind === "field"),
//     );
//     if (derives) budget.admitTransient(callerNameBytes(method), null);
//     // Built once per method, only after its exact size was admitted.
//     const caller = derives ? callerName(method) : method.name;
//     for (const anchor of method.body.anchors) {
//       if (anchor.opcode === "ldtoken") continue;
//       const { operand } = anchor;
//       if (operand === null) continue;
//       const target = namedTarget(members, anchor.operand_kind, operand);
//       if (anchor.operand_kind === "method") {
//         // Each derived record is admitted before the graph grows further.
//         callEdges.push(
//           admitManagedProjection(
//             {
//               caller_token: method.token,
//               caller,
//               opcode: anchor.opcode,
//               target_token: operand,
//               target_kind: targetKind(operand),
//               target_name: target?.name ?? null,
//               target_declaring_type: target?.declaringType ?? null,
//             },
//             budget,
//           ),
//         );
//       }
//       if (anchor.operand_kind === "field") {
//         fieldAccesses.push(
//           admitManagedProjection(
//             {
//               method_token: method.token,
//               method: caller,
//               opcode: anchor.opcode,
//               field_token: operand,
//               field_name: target?.name ?? null,
//               field_declaring_type: target?.declaringType ?? null,
//             },
//             budget,
//           ),
//         );
//       }
//     }
//     // Every record now reserves the name it carries.
//     if (derives) budget.releaseTransient();
//   }
//   return { callEdges, fieldAccesses };
// };
//
// const callerName = (method: ManagedMethod): string =>
//   method.declaring_type === null
//     ? method.name
//     : `${method.declaring_type}.${method.name}`;
//
// /** JSON bytes of `callerName`, from its parts: the joining dot adds one byte. */
// const callerNameBytes = (method: ManagedMethod): number =>
//   method.declaring_type === null
//     ? managedJsonStringBytes(method.name)
//     : managedJsonStringBytes(method.declaring_type) +
//       managedJsonStringBytes(method.name) -
//       1;
//
// const budgetedSignature = (
//   bytes: Buffer,
//   layout: ManagedMetadataLayout,
//   signatureTypeName: SignatureTypeName,
// ): ReturnType<typeof signature> => {
//   const budget = managedDecodeBudget(layout);
//   budget.admitTransient(bytes.length * 256, layout.blob.offset);
//   try {
//     return admitManagedProjection(
//       signature(bytes, budget.digest(bytes, "sha256"), signatureTypeName),
//       budget,
//     );
//   } finally {
//     budget.releaseTransient();
//   }
// };
export const _l = 123;
