import {
  BaseType,
  core,
  Enum,
  EnumBuilder,
  EnumVariant,
  EnumVariants,
  InferEnum,
  MapValue,
  Maybe,
  Option,
  t,
} from "@macrograph/core";

// - JSON String
// - JS Value
// - Runtime Value
// -

const pkg = core.createPackage({
  name: "JSON",
});

const JSONLiteralVariants = (e: EnumBuilder) =>
  [
    e.variant("Null"),
    e.variant("Bool", { value: t.bool() }),
    e.variant("Number", {
      value: t.float(),
    }),
    e.variant("String", {
      value: t.string(),
    }),
  ] satisfies EnumVariants;

type JSONLiteralVariantTypes = ReturnType<typeof JSONLiteralVariants>;
type JSONVariantTypes = [
  ...JSONLiteralVariantTypes,
  EnumVariant<
    "List",
    {
      value: t.List<t.Enum<typeof JSON>>;
    }
  >,
  EnumVariant<
    "Map",
    {
      value: t.Map<t.Enum<typeof JSON>>;
    }
  >
];

export const JSON: Enum<JSONVariantTypes> = pkg.createEnum<JSONVariantTypes>(
  "JSON",
  (e) =>
    e.lazy(
      () =>
        [
          ...JSONLiteralVariants(e),
          e.variant("List", {
            value: t.list(t.enum(JSON)),
          }),
          e.variant("Map", {
            value: t.map(t.enum(JSON)),
          }),
        ] as JSONVariantTypes
    )
);

type JSONValue = InferEnum<typeof JSON>;

/**
 * Runtime Value -> JSON
 */
export function toJSON(type: t.Int | t.Float, value: number): JSONValue;
export function toJSON(type: t.String, value: string): JSONValue;
export function toJSON(type: t.Bool, value: boolean): JSONValue;
export function toJSON<T extends BaseType>(
  type: t.Option<T>,
  value: t.infer<t.Option<T>>
): JSONValue;
export function toJSON<T extends BaseType>(
  type: t.List<T>,
  value: t.infer<t.List<T>>
): JSONValue;
export function toJSON<T extends BaseType>(
  type: t.Map<T>,
  value: t.infer<t.Map<T>>
): JSONValue;
export function toJSON<T extends Enum>(
  type: t.Enum<Enum<any>>,
  value: t.infer<t.Enum<Enum<any>>>
): JSONValue;
export function toJSON(type: t.Wildcard, value: t.infer<t.Wildcard>): JSONValue;
export function toJSON(type: t.Any, value: any): JSONValue | null;
export function toJSON(type: t.Any, value: any): JSONValue | null {
  if (type instanceof t.Wildcard) {
    return toJSON(
      type.wildcard.value().expect("Wildcard value not found!"),
      value
    );
  } else if (type instanceof t.Option) {
    if (value.isNone()) return JSON.variant("Null");
    else return toJSON(type.inner, value.unwrap());
  } else if (type instanceof t.Int || type instanceof t.Float)
    return JSON.variant(["Number", { value }]);
  else if (type instanceof t.String) return JSON.variant(["String", { value }]);
  else if (type instanceof t.Bool) return JSON.variant(["Bool", { value }]);
  else if (type instanceof t.List)
    return JSON.variant([
      "List",
      { value: value.map((v: any) => toJSON(type.item, v)) },
    ]);
  else if (type instanceof t.Map) {
    const newValue: MapValue<any> = new Map();

    for (const [k, v] of value) {
      newValue.set(k, toJSON(type.value, v));
    }

    return JSON.variant([
      "Map",
      {
        value: newValue,
      },
    ]);
  } else if (type instanceof t.Enum) {
    return JSON.variant(["Map", { value: new Map(Object.entries(value)) }]);
  } else return null;
}

/**
 * JS Value -> JSON
 */
export function jsToJSON(value: any): JSONValue | null {
  if (Array.isArray(value)) {
    return JSON.variant(["List", { value: value.map(jsToJSON) }]);
  } else if (value === null) {
    return JSON.variant("Null");
  }

  switch (typeof value) {
    case "number":
      return JSON.variant(["Number", { value }]);
    case "string":
      return JSON.variant(["String", { value }]);
    case "object":
      return JSON.variant([
        "Map",
        {
          value: new Map(
            Object.entries(value).map(([key, value]) => [key, jsToJSON(value)])
          ),
        },
      ]);
    case "boolean":
      return JSON.variant(["Bool", { value }]);
  }

  return null;
}

/**
 * JSON -> JS Value
 */
export function jsonToJS(value: JSONValue): any {
  switch (value.variant) {
    case "Null":
      return null;
    case "Number":
    case "String":
    case "Bool":
      return value.data.value;
    case "List":
      return value.data.value.map((v: any) => jsonToJS(v));
    case "Map":
      return [...value.data.value.entries()].reduce((acc, [key, value]) => {
        acc[key] = jsonToJS(value as any);
        return acc;
      }, {} as any);
  }
}

pkg.createNonEventSchema({
  name: "To JSON",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    return {
      w,
      in: io.dataInput({
        id: "in",
        type: t.wildcard(w),
      }),
      out: io.dataOutput({
        id: "out",
        type: t.enum(JSON),
      }),
    };
  },
  run({ ctx, io }) {
    const val = Maybe(toJSON(io.in.type, ctx.getInput(io.in)));
    ctx.setOutput(
      io.out,
      val.expect(`Type ${io.w.toString()} cannot be converted to JSON!`)
    );
  },
});

pkg.createNonEventSchema({
  name: "Parse JSON",
  variant: "Exec",
  generateIO(io) {
    return {
      in: io.dataInput({
        id: "in",
        type: t.string(),
      }),
      out: io.dataOutput({
        id: "out",
        type: t.enum(JSON),
      }),
    };
  },
  run({ ctx, io }) {
    const value = jsToJSON(window.JSON.parse(ctx.getInput(io.in)));
    ctx.setOutput(io.out, Maybe(value).expect("Failed to parse JSON!"));
  },
});
