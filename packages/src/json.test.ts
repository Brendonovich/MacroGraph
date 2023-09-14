import { test, expect, describe } from "vitest";
import { assistedValueToJSON, JSON } from "./json";
import { MapValue, None, Some, t } from "@macrograph/core";

describe("assistedValueToJSON", () => {
  test("Option.None -> null", () => {
    expect(assistedValueToJSON(t.option(t.int()), None)).toEqual(
      JSON.variant("Null")
    );
  });
  test("Option.Some<Int> -> number", () => {
    expect(assistedValueToJSON(t.option(t.int()), Some(5))).toEqual(
      JSON.variant(["Number", { value: 5 }])
    );
  });
  test("Int  -> number", () => {
    expect(assistedValueToJSON(t.int(), 0)).toEqual(
      JSON.variant(["Number", { value: 0 }])
    );
  });
  test("Float -> number", () => {
    expect(assistedValueToJSON(t.int(), 0)).toEqual(
      JSON.variant(["Number", { value: 0 }])
    );
  });
  test("String -> string", () => {
    expect(assistedValueToJSON(t.string(), "")).toEqual(
      JSON.variant(["String", { value: "" }])
    );
  });
  test("Bool -> boolean", () => {
    expect(assistedValueToJSON(t.bool(), false)).toEqual(
      JSON.variant(["Bool", { value: false }])
    );
  });
  test("List<Bool> -> Array<bool>", () => {
    expect(assistedValueToJSON(t.list(t.bool()), [])).toEqual(
      JSON.variant(["List", { value: [] }])
    );
  });
  test("Map<Bool> -> MapValue<boolean>", () => {
    const value = new Map();
    expect(assistedValueToJSON(t.map(t.bool()), value)).toEqual(
      JSON.variant(["Map", { value: value as MapValue<never> }])
    );
  });
  test("Enum<JSON> -> InferEnum<JSON>", () => {
    expect(
      assistedValueToJSON(t.enum(JSON), JSON.variant(["String", { value: "" }]))
    ).toEqual(
      JSON.variant([
        "Map",
        {
          value: new Map(
            Object.entries({
              variant: "String",
              data: { value: "" },
            })
          ) as any,
        },
      ])
    );
  });
});
