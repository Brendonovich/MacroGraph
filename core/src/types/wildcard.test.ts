import { test, expect, describe } from "vitest";
import { Option, None } from "./option";
// import { t } from ".";
// import { connectWildcardsInTypes, Wildcard } from "./wildcard";

// describe("connecting two types", () => {
//   test("T", async () => {
//     const wildcard = new Wildcard("");

//     const type1 = t.wildcard(wildcard);
//     const type2 = t.bool();

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.wildcard.value().unwrap()).toBe(type2);
//   });
//   test("List<T>", () => {
//     const wildcard = new Wildcard("");

//     const type1 = t.list(t.wildcard(wildcard));
//     const type2 = t.list(t.string());

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.inner.wildcard.value().unwrap()).toBe(type2.inner);
//   });
//   test("Option<T>", () => {
//     const wildcard = new Wildcard("");

//     const type1 = t.option(t.wildcard(wildcard));
//     const type2 = t.option(t.int());

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.inner.wildcard.value().unwrap()).toBe(type2.inner);
//   });
//   test("Option<List<T>>", () => {
//     const wildcard = new Wildcard("");

//     const type1 = t.option(t.list(t.wildcard(wildcard)));
//     const type2 = t.option(t.list(t.float()));

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.inner.inner.wildcard.value().unwrap()).toBe(type2.inner.inner);
//   });
// });

// describe("connecting two groups", () => {
//   test("T", () => {
//     const wildcard1 = new Wildcard("1");
//     const wildcard1Out = t.wildcard(wildcard1);

//     const wildcard2 = new Wildcard("2");
//     const wildcard2In = t.wildcard(wildcard2);
//     const wildcard2Out = t.wildcard(wildcard2);

//     const bool = t.bool();

//     connectWildcardsInTypes(wildcard1Out, wildcard2In);
//     connectWildcardsInTypes(wildcard2Out, bool);

//     expect(wildcard2.value().unwrap()).toBe(bool);
//     expect(wildcard1.value().unwrap()).toBe(bool);
//   });
// });

abstract class BaseType {}

class StringType extends BaseType {}

class MapType extends BaseType {}

class WildcardType extends BaseType {
  constructor(public wildcard: Wildcard) {
    super();

    wildcard.types.add(this);
  }
}

class Wildcard {
  types = new Set<WildcardType>();

  value: Option<BaseType> = None;

  calculateValue() {
    const surroundingValues = [...types].flatMap((t) => t.wildcard);
  }
}

function connectWildcardsInTypes(output: BaseType, input: BaseType) {}

test("bruh", () => {
  // Node 1
  const output = new StringType();

  // Node 2
  const wildcard = new Wildcard();
  const input = new WildcardType(wildcard);

  connectWildcardsInTypes(output, input);
});
