export const __stub = 1;
//           attributes: [
//             ["xmlns:svg", "other"],
//             ["xlink:href", "/rebound"],
//           ],
//         },
//         { name: "svg:a", parent: 1, attributes: [["xlink:href", "/restored"]] },
//       ]),
//     );
//     expect(result.urls).toEqual([
//       approvedHref(3, `${origin}/inherited`),
//       approvedHref(5, `${origin}/restored`),
//     ]);
//   });
// });
//
// describe("XHTML and XML SVG namespace prefixes", () => {
//   it("reports prefixed svg:a, svg:image, and an svg:a with no svg parent", () => {
//     const result = captureSvg(
//       svgDocument([
//         xhtmlRoot(),
//         { name: "svg:svg", parent: 1 },
//         {
//           name: "svg:a",
//           parent: 2,
//           attributes: [
//             ["xlink:href", "/xl-pa1"],
//             ["xlink:href", "/later"],
//           ],
//         },
//         {
//           name: "svg:image",
//           parent: 2,
//           attributes: [["xlink:href", "guide"]],
//         },
//         {
//           name: "svg:a",
//           parent: 1,
//           attributes: [["xlink:href", "/xl-orphan"]],
//         },
//       ]),
//     );
//     expect(result.nodes[3]?.node_name).toBe("svg:a");
//     expect(result.nodes[3]?.attribute_names).toEqual(["xlink:href"]);
//     expect(result.urls).toEqual([
//       approvedHref(3, `${origin}/xl-pa1`),
//       approvedHref(4, `${origin}/screens/assets/guide`),
//       approvedHref(5, `${origin}/xl-orphan`),
//     ]);
//   });
//
//   it("reports svg:a under svg:foreignObject and skips XHTML anchors there", () => {
//     const result = captureSvg(
//       svgDocument([
//         xhtmlRoot([
//           ["xmlns", XHTML_NAMESPACE],
//           ["xmlns:svg", SVG_NAMESPACE],
//           ["xmlns:xlink", XLINK_NAMESPACE],
//           ["xmlns:h", XHTML_NAMESPACE],
//         ]),
//         { name: "svg:svg", parent: 1 },
//         { name: "svg:foreignObject", parent: 2 },
//         {
//           name: "a",
//           svg: true,
//           parent: 3,
//           attributes: [["xlink:href", "/xl-html-fo"]],
//         },
//         {
//           name: "h:a",
//           parent: 3,
//           attributes: [["xlink:href", "/xl-h"]],
//         },
//         {
//           name: "svg:a",
//           parent: 3,
//           attributes: [["xlink:href", "/xl-fo-svg"]],
//         },
//       ]),
//     );
//     expect(urlFor(result, 4)).toBeUndefined();
//     expect(urlFor(result, 5)).toBeUndefined();
//     expect(result.urls).toEqual([approvedHref(6, `${origin}/xl-fo-svg`)]);
//   });
//
//   it("reads XLink by namespace, including a prefix other than xlink", () => {
//     const result = captureSvg(
//       svgDocument([
//         xhtmlRoot([["xmlns", XHTML_NAMESPACE]]),
//         {
//           name: "svg",
//           parent: 1,
//           attributes: [
//             ["xmlns", SVG_NAMESPACE],
//             ["xmlns:xlink", "http://example.com/not-xlink"],
//             ["xmlns:x", XLINK_NAMESPACE],
//           ],
//         },
//         {
//           name: "a",
//           svg: true,
//           parent: 2,
//           attributes: [
//             ["xlink:href", "/not-xlink"],
//             ["x:href", "/xl-custom"],
//             ["x:href", "/later"],
//           ],
//         },
//       ]),
//     );
//     expect(result.nodes[3]?.attribute_names).toEqual(["xlink:href", "x:href"]);
//     expect(result.urls).toEqual([approvedHref(3, `${origin}/xl-custom`)]);
//   });
//
//   it("keeps plain href ahead of a namespaced XLink href, including an empty href", () => {
//     const baseUrl = `${origin}/screens/assets/`;
//     const anchor = (
//       parent: number,
//       attributes: readonly (readonly [string, string])[],
//     ): SvgSnapshotNode => ({
//       name: "svg:a",
//       parent,
//       attributes,
//     });
//     const result = captureSvg(
//       svgDocument(
//         [
//           xhtmlRoot(),
//           { name: "svg:svg", parent: 1 },
//           anchor(2, [
//             ["xlink:href", "/xlink-loses"],
//             ["href", "/href-wins"],
//           ]),
//           anchor(2, [
//             ["href", "/href-wins"],
//             ["xlink:href", "/xlink-loses"],
//           ]),
//           anchor(2, [
//             ["href", ""],
//             ["xlink:href", "/xlink-should-lose"],
//           ]),
//         ],
//         baseUrl,
//       ),
//     );
//     expect(result.urls).toEqual([
//       approvedHref(3, `${origin}/href-wins`),
//       approvedHref(4, `${origin}/href-wins`),
//       approvedHref(5, baseUrl),
//     ]);
//   });
// });
//
// describe("XHTML SVG exclusions, HTML documents, and prefix scope", () => {
//   it("classifies a prefixed SVG xlink:href outside the allowed origins as outside_policy", () => {
//     const result = captureSvg(
//       svgDocument([
//         xhtmlRoot(),
//         { name: "svg:svg", parent: 1 },
//         {
//           name: "svg:a",
//           parent: 2,
//           attributes: [["xlink:href", "https://cdn.example.test/out"]],
//         },
//       ]),
//     );
//     expect(result.urls).toEqual([
//       {
//         node_index: 3,
//         attribute: "href",
//         url: null,
//         destination_scope: "outside_policy",
//       },
//     ]);
//   });
//
//   it("does not treat bogus:svg in another namespace as SVG", () => {
//     const result = captureSvg(
//       svgDocument([
//         xhtmlRoot([
//           ["xmlns", XHTML_NAMESPACE],
//           ["xmlns:svg", SVG_NAMESPACE],
//           ["xmlns:xlink", XLINK_NAMESPACE],
//           ["xmlns:bogus", "http://example.com/not-svg"],
//         ]),
//         {
//           name: "bogus:svg",
//           parent: 1,
//           attributes: [["xlink:href", "/xl-bogus"]],
//         },
//         {
//           name: "bogus:a",
//           parent: 2,
//           attributes: [["xlink:href", "/xl-bogus-a"]],
//         },
//         {
//           name: "svg:a",
//           parent: 1,
//           attributes: [["xlink:href", "/xl-kept"]],
//         },
//       ]),
//     );
//     expect(result.nodes[2]?.node_name).toBe("bogus:svg");
//     expect(result.urls).toEqual([approvedHref(4, `${origin}/xl-kept`)]);
//   });
//
//   it("leaves HTML documents on literal svg and xlink:href names", () => {
//     const result = captureSvg(
//       svgDocument([
//         { name: "HTML", parent: 0 },
//         {
//           name: "svg",
//           parent: 1,
//           attributes: [
//             ["xmlns", SVG_NAMESPACE],
//             ["xmlns:x", XLINK_NAMESPACE],
//           ],
//         },
//         {
//           name: "a",
//           svg: true,
//           parent: 2,
//           attributes: [["xlink:href", "/xl-literal"]],
//         },
//         {
//           name: "a",
//           svg: true,
//           parent: 2,
//           attributes: [["x:href", "/xl-custom-html"]],
//         },
//         {
//           name: "svg:a",
//           parent: 1,
//           attributes: [
//             ["xmlns:svg", SVG_NAMESPACE],
//             ["xmlns:xlink", XLINK_NAMESPACE],
//             ["xlink:href", "/xl-prefixed-html"],
//           ],
//         },
//         {
//           name: "A",
//           svg: false,
//           parent: 1,
//           attributes: [["xlink:href", "/xl-html-anchor"]],
//         },
//       ]),
//     );
//     expect(result.urls).toEqual([approvedHref(3, `${origin}/xl-literal`)]);
//   });
// });
//
// describe("XML namespace resolution ordering and capacity", () => {
//   it("applies an element's own xmlns declarations to its name and href", () => {
//     const result = captureSvg(
//       svgDocument([
//         { name: "html", parent: 0, attributes: [["xmlns", XHTML_NAMESPACE]] },
//         {
//           name: "svg:a",
//           parent: 1,
//           attributes: [
//             ["xmlns:svg", SVG_NAMESPACE],
//             ["xmlns:xlink", XLINK_NAMESPACE],
//             ["xlink:href", "/xl-self"],
//           ],
//         },
//       ]),
//     );
//     expect(result.urls).toEqual([approvedHref(2, `${origin}/xl-self`)]);
//   });
//
//   it("resolves a prefix declared on a later ancestor", () => {
//     const result = captureSvg(
//       svgDocument([
//         {
//           name: "svg:a",
//           parent: 2,
//           attributes: [["xlink:href", "/forward"]],
//         },
//         { name: "svg:svg", parent: 3 },
//         xhtmlRoot(),
//       ]),
//     );
//     expect(result.urls).toEqual([approvedHref(1, `${origin}/forward`)]);
//   });
//
//   it("resolves a deep chain with distinct namespace declarations without quadratic expansion", () => {
//     const depth = 12_000;
//     const elements: SvgSnapshotNode[] = [
//       xhtmlRoot(),
//       { name: "svg:svg", parent: 1 },
//     ];
//     let parent = 2;
//     for (let index = 0; index < depth; index += 1) {
//       elements.push({
//         name: "svg:g",
//         parent,
//         attributes: [[`xmlns:p${index}`, `urn:prefix:${index}`]],
//       });
//       parent = elements.length;
//     }
//     elements.push({
//       name: "svg:a",
//       parent,
//       attributes: [["xlink:href", "/deep"]],
//     });
//     const snapshot = svgDocument(elements);
//     const result = captureSvg(snapshot);
//     expect(result.urls).toEqual([
//       approvedHref(elements.length, `${origin}/deep`),
//     ]);
//   }, 30_000);
// });
export const _l = 311;
