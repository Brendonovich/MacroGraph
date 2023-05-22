// import { test, expect, describe } from "vitest";
// import { types } from ".";
// import { connectWildcardsInTypes, Wildcard } from "./wildcard";

// describe("connecting two types", () => {
//   test("T", () => {
//     const wildcard = new Wildcard();

//     const type1 = types.wildcard(wildcard);
//     const type2 = types.bool();

//     connectWildcardsInTypes(type1, type2);

//     // expect(type1.basePrimitive().primitiveVariant()).toBe(
//     //   type2.primitiveVariant()
//     // );
//   });
//   test("List<T>", () => {
//     const wildcard = new Wildcard();

//     const type1 = types.list(types.wildcard(wildcard));
//     const type2 = types.list(types.string());

//     connectWildcardsInTypes(type1, type2);

//     // expect(type1.basePrimitive().primitiveVariant()).toBe(
//     //   type2.basePrimitive().primitiveVariant()
//     // );
//   });
//   test("Option<T>", () => {
//     const wildcard = new Wildcard();

//     const type1 = types.option(types.wildcard(wildcard));
//     const type2 = types.option(types.int());

//     connectWildcardsInTypes(type1, type2);

//     // expect(type1.basePrimitive().primitiveVariant()).toBe(
//     //   type2.basePrimitive().primitiveVariant()
//     // );
//   });
//   test("Option<List<T>>", () => {
//     const wildcard = new Wildcard();

//     const type1 = types.option(types.list(types.wildcard(wildcard)));
//     const type2 = types.option(types.list(types.float()));

//     connectWildcardsInTypes(type1, type2);

//     // expect(type1.basePrimitive().primitiveVariant()).toBe(
//     //   type2.basePrimitive().primitiveVariant()
//     // );
//   });
// });

// describe("connecting two groups", () => {
//   test("T", () => {
//     const node1Wildcard = new Wildcard();
//     const node1Type = types.wildcard(node1Wildcard);

//     const node2Wildcard = new Wildcard();
//     const node2Type = types.wildcard(node2Wildcard);

//     const type = types.bool();

//     connectWildcardsInTypes(node1Type, node2Type);

//     connectWildcardsInTypes(node2Type, type);

//     // expect(node1Type.basePrimitive().primitiveVariant()).toBe(
//     //   type.primitiveVariant()
//     // );
//   });
// });

// describe("disconnecting two groups", () => {
//   test("T", () => {
//     const node1Wildcard = new Wildcard();
//     const node1Type = types.wildcard(node1Wildcard);

//     const node2Wildcard = new Wildcard();
//     const node2Type = types.wildcard(node2Wildcard);

//     const type = types.bool();

//     connectWildcardsInTypes(node1Type, node2Type);

//     connectWildcardsInTypes(node2Type, type);

//     // expect(node1Type.basePrimitive().primitiveVariant()).toBe(
//     //   type.primitiveVariant()
//     // );
//   });
// });
export default {};
