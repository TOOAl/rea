export const __stub = 1;
//     value instanceof LosslessNumber
//       ? value.value
//       : typeof value === "number"
//         ? String(value)
//         : "";
//   const m = /^(-?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/u.exec(
//     literal,
//   );
//   if (m === null)
//     return invalid("qlog QUIC integer must be a JSON number.", pointer);
//   const digits = `${m[2]}${m[3] ?? ""}`.replace(/^0+/u, "");
//   if (digits === "") return 0n;
//   const exponent = m[4] === undefined ? 0 : Number(m[4]);
//   const shift = exponent - (m[3]?.length ?? 0);
//   const count = digits.length + shift;
//   if (m[1] === "-" || !Number.isSafeInteger(shift) || count > 19 || count <= 0)
//     return invalid(
//       "qlog QUIC integer is negative, fractional or outside the 62-bit range.",
//       pointer,
//     );
//   if (shift < 0 && /[1-9]/u.test(digits.slice(count)))
//     return invalid("qlog QUIC integer is fractional.", pointer);
//   const canonical =
//     shift < 0 ? digits.slice(0, count) : digits + "0".repeat(shift);
//   const result = BigInt(canonical);
//   if (result > MAX_VARINT)
//     return invalid("qlog QUIC integer exceeds the 62-bit range.", pointer);
//   return result;
// };
//
// /** Preserve JSON values/lexemes and structurally exclude only transport credentials and declared values. */
// const project = (
//   value: unknown,
//   sensitiveValues: readonly string[],
// ): Projection => {
//   const redactor = new CaptureRedaction(sensitiveValues);
//   const numeric_literals: Projection["numeric_literals"] = [];
//   const eventName = object(value) ? value.name : null;
//   const visit = (
//     item: unknown,
//     pointer: string,
//     parent?: Record<string, unknown>,
//   ): JsonValue => {
//     const header =
//       (eventName === "http:frame_created" ||
//         eventName === "http:frame_parsed") &&
//       /^\/data\/frame\/headers\/\d+\/value$/u.test(pointer) &&
//       typeof parent?.name === "string";
//     if (
//       (header && credentials.has(String(parent?.name).toLowerCase())) ||
//       qlogToken(eventName, pointer, parent)
//     )
//       return redactor.credential(pointer);
//     if (item instanceof LosslessNumber) {
//       if (
//         redactor.text(item.value, pointer) === null ||
//         (isSafeNumber(item.value) &&
//           redactor.text(String(Number(item.value)), pointer) === null)
//       )
//         return null;
//       numeric_literals.push({
//         pointer,
//         producer_type: "json-number",
//         literal: item.value,
//       });
//       return isSafeNumber(item.value) ? Number(item.value) : null;
//     }
//     if (typeof item === "string")
//       return redactor.text(
//         item,
//         pointer,
//         header &&
//           ["location", "referer", "origin"].includes(
//             String(parent?.name).toLowerCase(),
//           ),
//       );
//     if (item === null || typeof item === "boolean") return item;
//     if (Array.isArray(item))
//       return item.map((child, index) =>
//         visit(child, capturePointer(pointer, String(index))),
//       );
//     if (object(item))
//       return Object.fromEntries(
//         Object.entries(item).flatMap(([key, child]) => {
//           if (sensitiveValues.some((literal) => key.includes(literal))) {
//             redactor.redactions.push({
//               pointer,
//               reason: "explicit-sensitive-value",
//               scope: "property-name",
//             });
//             return [];
//           }
//           return [[key, visit(child, capturePointer(pointer, key), item)]];
//         }),
//       );
//     return invalid("qlog parser returned a non-JSON value.", pointer);
//   };
//   return {
//     reported: visit(value, ""),
//     numeric_literals,
//     binary_fields: [],
//     redactions: redactor.redactions,
//   };
// };
//
// const qlogToken = (
//   eventName: unknown,
//   pointer: string,
//   parent?: Record<string, unknown>,
// ): boolean => {
//   if (
//     packetEvent(eventName) &&
//     /^\/data\/frames\/\d+\/reset_token$/u.test(pointer) &&
//     parent?.frame_type === "new_connection_id"
//   )
//     return true;
//   if (
//     packetEvent(eventName) &&
//     /^\/data\/frames\/\d+\/token$/u.test(pointer) &&
//     parent?.frame_type === "new_token"
//   )
//     return true;
//   if (
//     eventName === "transport:parameters_set" &&
//     pointer === "/data/stateless_reset_token"
//   )
//     return true;
//   return false;
// };
export const _l = 129;
