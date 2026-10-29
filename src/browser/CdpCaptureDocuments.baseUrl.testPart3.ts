export const __stub = 1;
//         { name: "svg", parent: 0 },
//         {
//           name: "a",
//           svg: true,
//           parent: 1,
//           attributes: [["xlink:href", "https://cdn.example.test/out"]],
//         },
//       ]),
//     );
//     expect(result.urls).toEqual([
//       {
//         node_index: 2,
//         attribute: "href",
//         url: null,
//         destination_scope: "outside_policy",
//       },
//     ]);
//   });
//
//   it("resolves SVG image and use xlink:href against the document base", () => {
//     const result = captureSvg(
//       svgDocument([
//         { name: "svg", parent: 0 },
//         {
//           name: "image",
//           svg: true,
//           parent: 1,
//           attributes: [["xlink:href", "guide"]],
//         },
//         {
//           name: "use",
//           svg: true,
//           parent: 1,
//           attributes: [["xlink:href", "icon.svg"]],
//         },
//       ]),
//     );
//     expect(result.urls).toEqual([
//       {
//         node_index: 2,
//         attribute: "href",
//         url: `${origin}/screens/assets/guide`,
//         destination_scope: "approved",
//       },
//       {
//         node_index: 3,
//         attribute: "href",
//         url: `${origin}/screens/assets/icon.svg`,
//         destination_scope: "approved",
//       },
//     ]);
//   });
// });
//
// describe("SVG xlink:href context", () => {
//   it("binds SVG identity to the selected element across documents", () => {
//     const svg = svgDocument([
//       {
//         name: "a",
//         svg: true,
//         parent: 2,
//         attributes: [["xlink:href", "/svg-link"]],
//       },
//       { name: "g", parent: 3 },
//       { name: "svg", parent: 0 },
//     ]);
//     const html = svgDocument([
//       {
//         name: "A",
//         svg: false,
//         parent: 2,
//         attributes: [["xlink:href", "/html-link"]],
//       },
//       { name: "DIV", parent: 3 },
//       { name: "BODY", parent: 0 },
//     ]);
//     const offset = svg.strings.length;
//     const result = captureSvg({
//       strings: [...svg.strings, ...html.strings],
//       documents: [
//         ...svg.documents,
//         ...html.documents.map((document) => ({
//           ...document,
//           documentURL: document.documentURL + offset,
//           baseURL: document.baseURL + offset,
//           nodes: {
//             ...document.nodes,
//             nodeName: document.nodes.nodeName.map((index) => index + offset),
//             nodeValue: document.nodes.nodeValue.map((index) => index + offset),
//             attributes: document.nodes.attributes.map((attributes) =>
//               attributes.map((index) => index + offset),
//             ),
//           },
//         })),
//       ],
//     });
//     expect(result.urls).toEqual([
//       {
//         node_index: 1,
//         attribute: "href",
//         url: `${origin}/svg-link`,
//         destination_scope: "approved",
//       },
//     ]);
//   });
//
//   it.each(["foreignObject", "desc", "title"])(
//     "preserves browser SVG identity across %s HTML integration points",
//     (integrationPoint) => {
//       const result = captureSvg(
//         svgDocument([
//           { name: "svg", parent: 0 },
//           { name: integrationPoint, parent: 1 },
//           {
//             name: "A",
//             svg: false,
//             parent: 2,
//             attributes: [["xlink:href", "/xl-html-fo"]],
//           },
//           { name: "svg", parent: 2 },
//           {
//             name: "a",
//             svg: true,
//             parent: 4,
//             attributes: [["xlink:href", "/xl-nested"]],
//           },
//         ]),
//       );
//       expect(urlFor(result, 3)).toBeUndefined();
//       expect(urlFor(result, 5)).toMatchObject({
//         attribute: "href",
//         url: `${origin}/xl-nested`,
//         destination_scope: "approved",
//       });
//     },
//   );
// });
//
// describe("SVG XLink precedence and unknown identity", () => {
//   it("keeps an empty href ahead of xlink:href", () => {
//     const baseUrl = `${origin}/screens/assets/`;
//     const result = captureSvg(
//       svgDocument(
//         [
//           { name: "svg", parent: 0 },
//           {
//             name: "a",
//             svg: true,
//             parent: 1,
//             attributes: [
//               ["href", ""],
//               ["xlink:href", "/xlink-should-lose"],
//             ],
//           },
//         ],
//         baseUrl,
//       ),
//     );
//     expect(result.urls).toEqual([
//       {
//         node_index: 2,
//         attribute: "href",
//         url: baseUrl,
//         destination_scope: "approved",
//       },
//     ]);
//   });
//
//   it("classifies a non-http SVG xlink:href as unsupported", () => {
//     const result = captureSvg(
//       svgDocument([
//         { name: "svg", parent: 0 },
//         {
//           name: "a",
//           svg: true,
//           parent: 1,
//           attributes: [["xlink:href", "javascript:void(0)"]],
//         },
//       ]),
//     );
//     expect(result.urls).toEqual([
//       {
//         node_index: 2,
//         attribute: "href",
//         url: null,
//         destination_scope: "unsupported",
//       },
//     ]);
//   });
//
//   it("keeps an unavailable SVG identity unknown despite ancestor names", () => {
//     const cyclic = captureSvg(
//       svgDocument([
//         { name: "g", parent: 2 },
//         {
//           name: "a",
//           parent: 1,
//           attributes: [["xlink:href", "/cycle"]],
//         },
//       ]),
//     );
//     const dangling = captureSvg(
//       svgDocument([
//         {
//           name: "a",
//           parent: 99,
//           attributes: [["xlink:href", "/missing-parent"]],
//         },
//       ]),
//     );
//     expect(cyclic.urls).toEqual([]);
//     expect(dangling.urls).toEqual([]);
//   });
// });
//
// const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
// const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
// const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
//
// const xhtmlRoot = (
//   attributes: readonly (readonly [string, string])[] = [
//     ["xmlns", XHTML_NAMESPACE],
//     ["xmlns:svg", SVG_NAMESPACE],
//     ["xmlns:xlink", XLINK_NAMESPACE],
//   ],
// ): SvgSnapshotNode => ({
//   name: "html",
//   parent: 0,
//   attributes,
// });
//
// const approvedHref = (
//   nodeIndex: number,
//   url: string,
// ): {
//   readonly node_index: number;
//   readonly attribute: "href";
//   readonly url: string;
//   readonly destination_scope: "approved";
// } => ({
//   node_index: nodeIndex,
//   attribute: "href",
//   url,
//   destination_scope: "approved",
// });
//
// describe("XML SVG roots and namespace scope restoration", () => {
//   it.each(["svg", "document"])(
//     "resolves namespaces under an unprefixed XML %s root",
//     (name) => {
//       const result = captureSvg(
//         svgDocument([
//           {
//             name,
//             parent: 0,
//             attributes: [
//               ["xmlns", SVG_NAMESPACE],
//               ["xmlns:p", XLINK_NAMESPACE],
//             ],
//           },
//           {
//             name: "a",
//             svg: true,
//             parent: 1,
//             attributes: [["p:href", "/linked"]],
//           },
//         ]),
//       );
//       expect(result.urls).toEqual([approvedHref(2, `${origin}/linked`)]);
//     },
//   );
//
//   it.each([2, 3, 99])(
//     "rejects self-parent, cyclic and dangling XML ancestry (%s)",
//     (parent) => {
//       const result = captureSvg(
//         svgDocument([
//           xhtmlRoot(),
//           {
//             name: "svg:a",
//             parent,
//             attributes: [
//               ["xmlns:svg", SVG_NAMESPACE],
//               ["xmlns:p", XLINK_NAMESPACE],
//               ["p:href", "/invalid"],
//             ],
//           },
//           { name: "svg:g", parent: 2 },
//         ]),
//       );
//       expect(result.urls).toEqual([]);
//     },
//   );
//
//   it("restores namespace declarations and undeclarations before visiting siblings", () => {
//     const result = captureSvg(
//       svgDocument([
//         xhtmlRoot(),
//         {
//           name: "svg:a",
//           parent: 1,
//           attributes: [
//             ["xmlns:xlink", ""],
//             ["xlink:href", "/undeclared"],
//           ],
//         },
//         {
//           name: "svg:a",
//           parent: 1,
//           attributes: [["xlink:href", "/inherited"]],
//         },
//         {
//           name: "svg:a",
//           parent: 1,
export const _l = 314;
