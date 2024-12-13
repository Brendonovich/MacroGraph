import { None, Some } from "@macrograph/option";
import { createEnum, createStruct } from "@macrograph/runtime";
import { type MapValue, serializeValue, t } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";
import { describe, expect, test } from "vitest";

import { JSONEnum, type JSONValue, jsToJSON, jsonToJS, toJSON } from ".";

describe("toJSON", () => {
  test("t.Option (None) -> Null", () => {
    expect(toJSON(t.option(t.int()), None)).toEqual(JSONEnum.variant("Null"));
  });
  test("t.Option<t.Int> (Some) -> Number", () => {
    expect(toJSON(t.option(t.int()), Some(5))).toEqual(
      JSONEnum.variant(["Number", { value: 5 }]),
    );
  });
  test("t.Int  -> Number", () => {
    expect(toJSON(t.int(), 0)).toEqual(
      JSONEnum.variant(["Number", { value: 0 }]),
    );
  });
  test("t.Float -> Number", () => {
    expect(toJSON(t.int(), 0)).toEqual(
      JSONEnum.variant(["Number", { value: 0 }]),
    );
  });
  test("t.String -> String", () => {
    expect(toJSON(t.string(), "")).toEqual(
      JSONEnum.variant(["String", { value: "" }]),
    );
  });
  test("t.Bool -> Bool", () => {
    expect(toJSON(t.bool(), false)).toEqual(
      JSONEnum.variant(["Bool", { value: false }]),
    );
  });
  test("t.List<t.Bool> -> List<bool>", () => {
    expect(toJSON(t.list(t.bool()), [])).toEqual(
      JSONEnum.variant(["List", { value: [] }]),
    );
  });
  test("t.Map<t.Bool> -> Map<Bool>", () => {
    const value = new Map();

    const actual = toJSON(t.map(t.bool()), value);
    const expected = JSONEnum.variant(["Map", { value: new ReactiveMap() }]);

    expect(serializeValue(actual, t.enum(JSONEnum))).toEqual(
      serializeValue(expected, t.enum(JSONEnum)),
    );
  });
  test("t.Enum<JSON> -> JSON", () => {
    const value = JSONEnum.variant(["String", { value: "" }]);
    expect(toJSON(t.enum(JSONEnum), value)).toEqual(value);
  });
  test("t.Enum<TestEnum> -> Map<JSONValue>", () => {
    const TestEnum = createEnum("TestEnum", (e) => [
      e.variant("Unit"),
      e.variant("Named", {
        value: t.string(),
      }),
    ]);

    expect(toJSON(t.enum(TestEnum), TestEnum.variant("Unit"))).toEqual(
      JSONEnum.variant([
        "Map",
        {
          value: new ReactiveMap(
            Object.entries({
              variant: JSONEnum.variant(["String", { value: "Unit" }]),
            }),
          ),
        },
      ]),
    );

    expect(
      toJSON(t.enum(TestEnum), TestEnum.variant(["Named", { value: "" }])),
    ).toEqual(
      JSONEnum.variant([
        "Map",
        {
          value: new ReactiveMap(
            Object.entries({
              variant: JSONEnum.variant(["String", { value: "Named" }]),
              data: JSONEnum.variant([
                "Map",
                {
                  value: new ReactiveMap(
                    Object.entries({
                      value: JSONEnum.variant(["String", { value: "" }]),
                    }),
                  ),
                },
              ]),
            }),
          ),
        },
      ]),
    );
  });
  test("t.Struct<TestStruct> -> Map<JSONValue>", () => {
    const TestStruct = createStruct("TestStruct", (s) => ({
      string: s.field("String", t.string()),
      int: s.field("Int", t.int()),
      bool: s.field("Bool", t.bool()),
      json: s.field("JSON", t.enum(JSONEnum)),
    }));

    const value = {
      string: "",
      int: 0,
      bool: true,
      json: JSONEnum.variant("Null"),
    };

    expect(
      serializeValue(toJSON(t.struct(TestStruct), value), t.enum(JSONEnum)),
    ).toEqual(
      serializeValue(
        JSONEnum.variant([
          "Map",
          {
            value: new Map(
              Object.entries({
                string: JSONEnum.variant(["String", { value: value.string }]),
                int: JSONEnum.variant(["Number", { value: value.int }]),
                bool: JSONEnum.variant(["Bool", { value: value.bool }]),
                json: value.json,
              }),
            ) as any,
          },
        ]),
        t.enum(JSONEnum),
      ),
    );
  });
});

describe("jsonToJS", () => {
  test("Null -> null", () => {
    expect(jsonToJS(JSONEnum.variant("Null"))).toBeNull();
  });
  test("Number -> number", () => {
    const value = 4;
    expect(jsonToJS(JSONEnum.variant(["Number", { value }]))).toEqual(value);
  });
  test("String -> string", () => {
    const value = "string";
    expect(jsonToJS(JSONEnum.variant(["String", { value }]))).toEqual(value);
  });
  test("Bool -> boolean", () => {
    const value = true;
    expect(jsonToJS(JSONEnum.variant(["Bool", { value }]))).toEqual(value);
  });
  test("List -> Array<T>", () => {
    const value: never[] = [];
    expect(jsonToJS(JSONEnum.variant(["List", { value }]) as any)).toEqual(
      value,
    );
  });
  test("Map -> MapValue<T>", () => {
    expect(
      jsonToJS(
        JSONEnum.variant(["Map", { value: new Map() as MapValue<never> }]),
      ),
    ).toEqual({});
    const value = {
      number: 4,
      string: "string",
    };
    expect(
      jsonToJS(
        JSONEnum.variant([
          "Map",
          {
            value: new Map(
              Object.entries({
                number: JSONEnum.variant(["Number", { value: value.number }]),
                string: JSONEnum.variant(["String", { value: value.string }]),
              }),
            ) as MapValue<never>,
          },
        ]),
      ),
    ).toEqual(value);
  });
});

describe("jsToJSON", () => {
  test("null -> Null", () => {
    expect(jsToJSON(null)).toEqual(JSONEnum.variant("Null"));
  });
  test("number -> Number", () => {
    const value = 4;
    expect(jsToJSON(value)).toEqual(JSONEnum.variant(["Number", { value }]));
  });
  test("string -> String", () => {
    const value = "value";
    expect(jsToJSON(value)).toEqual(JSONEnum.variant(["String", { value }]));
  });
  test("boolean -> Bool", () => {
    const value = true;
    expect(jsToJSON(value)).toEqual(JSONEnum.variant(["Bool", { value }]));
  });
  test("Array<T> -> List", () => {
    expect(jsToJSON([])).toEqual(JSONEnum.variant(["List", { value: [] }]));
  });
  test("object -> Object", () => {
    expect(jsToJSON({})).toEqual(
      JSONEnum.variant(["Map", { value: new ReactiveMap<string, never>() }]),
    );
    const value = {
      number: 4,
      string: "string",
      object: {
        nested: true,
      },
    };
    expect(jsToJSON(value)).toEqual(
      JSONEnum.variant([
        "Map",
        {
          value: new ReactiveMap<string, JSONValue>([
            ["number", JSONEnum.variant(["Number", { value: value.number }])],
            ["string", JSONEnum.variant(["String", { value: value.string }])],
            [
              "object",
              JSONEnum.variant([
                "Map",
                {
                  value: new ReactiveMap([
                    [
                      "nested",
                      JSONEnum.variant([
                        "Bool",
                        { value: value.object.nested },
                      ]),
                    ],
                  ]),
                },
              ]),
            ],
          ]),
        },
      ]),
    );
  });
});
