import { test, expect, describe } from "vitest";
import { toJSON, JSON, jsonToJS, jsToJSON } from "./json";
import { None, Some, t } from "@macrograph/core";

describe("toJSON", () => {
  test("t.Option (None) -> Null", () => {
    expect(toJSON(t.option(t.int()), None)).toEqual(JSON.variant("Null"));
  });
  test("t.Option<t.Int> (Some) -> Number", () => {
    expect(toJSON(t.option(t.int()), Some(5))).toEqual(
      JSON.variant(["Number", { value: 5 }])
    );
  });
  test("t.Int  -> Number", () => {
    expect(toJSON(t.int(), 0)).toEqual(JSON.variant(["Number", { value: 0 }]));
  });
  test("t.Float -> Number", () => {
    expect(toJSON(t.int(), 0)).toEqual(JSON.variant(["Number", { value: 0 }]));
  });
  test("t.String -> String", () => {
    expect(toJSON(t.string(), "")).toEqual(
      JSON.variant(["String", { value: "" }])
    );
  });
  test("t.Bool -> Bool", () => {
    expect(toJSON(t.bool(), false)).toEqual(
      JSON.variant(["Bool", { value: false }])
    );
  });
  test("t.List<t.Bool> -> List<bool>", () => {
    expect(toJSON(t.list(t.bool()), [])).toEqual(
      JSON.variant(["List", { value: [] }])
    );
  });
  test("t.Map<t.Bool> -> Map<Bool>", () => {
    const value = new Map();
    expect(toJSON(t.map(t.bool()), value)).toEqual(
      JSON.variant(["Map", { value }])
    );
  });
  test("t.Enum<JSON> -> Map<JSONValue>", () => {
    expect(
      toJSON(t.enum(JSON), JSON.variant(["String", { value: "" }]))
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

describe("jsonToJS", () => {
  test("Null -> null", () => {
    expect(jsonToJS(JSON.variant("Null"))).toBeNull();
  });
  test("Number -> number", () => {
    const value = 4;
    expect(jsonToJS(JSON.variant(["Number", { value }]))).toEqual(value);
  });
  test("String -> string", () => {
    const value = "string";
    expect(jsonToJS(JSON.variant(["String", { value }]))).toEqual(value);
  });
  test("Bool -> boolean", () => {
    const value = true;
    expect(jsonToJS(JSON.variant(["Bool", { value }]))).toEqual(value);
  });
  test("List -> Array<T>", () => {
    const value = [];
    expect(jsonToJS(JSON.variant(["List", { value }]))).toEqual(value);
  });
  test("Map -> MapValue<T>", () => {
    expect(jsonToJS(JSON.variant(["Map", { value: new Map() }]))).toEqual({});
    const value = {
      number: 4,
      string: "string",
    };
    expect(
      jsonToJS(
        JSON.variant([
          "Map",
          {
            value: new Map([
              ["number", JSON.variant(["Number", { value: value.number }])],
              ["string", JSON.variant(["String", { value: value.string }])],
            ]),
          },
        ])
      )
    ).toEqual(value);
  });
});

describe("jsToJSON", () => {
  test("null -> Null", () => {
    expect(jsToJSON(null)).toEqual(JSON.variant("Null"));
  });
  test("number -> Number", () => {
    const value = 4;
    expect(jsToJSON(value)).toEqual(JSON.variant(["Number", { value }]));
  });
  test("string -> String", () => {
    const value = "value";
    expect(jsToJSON(value)).toEqual(JSON.variant(["String", { value }]));
  });
  test("boolean -> Bool", () => {
    const value = true;
    expect(jsToJSON(value)).toEqual(JSON.variant(["Bool", { value }]));
  });
  test("Array<T> -> List", () => {
    expect(jsToJSON([])).toEqual(JSON.variant(["List", { value: [] }]));
  });
  test("object -> Object", () => {
    expect(jsToJSON({})).toEqual(JSON.variant(["Map", { value: new Map() }]));
    const value = {
      number: 4,
      string: "string",
      object: {
        nested: true,
      },
    };
    expect(jsToJSON(value)).toEqual(
      JSON.variant([
        "Map",
        {
          value: new Map([
            ["number", JSON.variant(["Number", { value: value.number }])],
            ["string", JSON.variant(["String", { value: value.string }])],
            [
              "object",
              JSON.variant([
                "Map",
                {
                  value: new Map([
                    [
                      "nested",
                      JSON.variant(["Bool", { value: value.object.nested }]),
                    ],
                  ]),
                },
              ]),
            ],
          ]),
        },
      ])
    );
  });
});
