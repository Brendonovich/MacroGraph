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

export function assistedValueToJSON(
  type: t.Int | t.Float,
  value: number
): InferEnum<typeof JSON>;
export function assistedValueToJSON(
  type: t.String,
  value: string
): InferEnum<typeof JSON>;
export function assistedValueToJSON(
  type: t.Bool,
  value: boolean
): InferEnum<typeof JSON>;
export function assistedValueToJSON<T extends BaseType>(
  type: t.Option<T>,
  value: t.infer<t.Option<T>>
): InferEnum<typeof JSON>;
export function assistedValueToJSON<T extends BaseType>(
  type: t.List<T>,
  value: t.infer<t.List<T>>
): InferEnum<typeof JSON>;
export function assistedValueToJSON<T extends BaseType>(
  type: t.Map<T>,
  value: t.infer<t.Map<T>>
): InferEnum<typeof JSON>;
export function assistedValueToJSON<T extends Enum>(
  type: t.Enum<Enum<any>>,
  value: t.infer<t.Enum<Enum<any>>>
): InferEnum<typeof JSON>;
export function assistedValueToJSON(
  type: t.Wildcard,
  value: t.infer<t.Wildcard>
): InferEnum<typeof JSON>;
export function assistedValueToJSON(
  type: BaseType,
  value: any
): InferEnum<typeof JSON> | null {
  if (type instanceof t.Wildcard) {
    return assistedValueToJSON(
      type.wildcard.value().expect("Wildcard value not found!"),
      value
    );
  } else if (type instanceof t.Option) {
    if (value.isNone()) return JSON.variant("Null");
    else return assistedValueToJSON(type.inner, value.unwrap());
  } else if (type instanceof t.Int || type instanceof t.Float)
    return JSON.variant(["Number", { value }]);
  else if (type instanceof t.String) return JSON.variant(["String", { value }]);
  else if (type instanceof t.Bool) return JSON.variant(["Bool", { value }]);
  else if (type instanceof t.List)
    return JSON.variant([
      "List",
      { value: value.map((v: any) => assistedValueToJSON(type.item, v)) },
    ]);
  else if (type instanceof t.Map) {
    const newValue: MapValue<any> = new Map();

    for (const [k, v] of value) {
      newValue.set(k, assistedValueToJSON(type.value, v));
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

export function valueToJSON(value: any): InferEnum<typeof JSON> | null {
  if (Array.isArray(value)) {
    return JSON.variant(["List", { value: value.map(valueToJSON) }]);
  } else if (value instanceof Option) {
    return value.map(valueToJSON).unwrapOrElse(() => JSON.variant("Null"));
  } else if (value === null) {
    return JSON.variant("Null");
  } else if (value instanceof Map) {
    return JSON.variant([
      "Map",
      {
        value: new Map(
          Array.from(value.entries()).map(([key, value]) => [
            key,
            valueToJSON(value),
          ])
        ),
      },
    ]);
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
            Object.entries(value).map(([key, value]) => [
              key,
              valueToJSON(value),
            ])
          ),
        },
      ]);
    case "boolean":
      return JSON.variant(["Bool", { value }]);
  }

  return null;
}

export function jsonToValue(value: InferEnum<typeof JSON>): any {
  switch (value.variant) {
    case "Null":
      return null;
    case "Number":
    case "String":
    case "Bool":
      return value.data.value;
    case "List":
      return value.data.value.map((v: any) => jsonToValue(v));
    case "Map":
      return Object.fromEntries(
        [...value.data.value.entries()].map(([key, value]) => [
          key,
          jsonToValue(value as any),
        ])
      );
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
    const val = Maybe(assistedValueToJSON(io.in.type, ctx.getInput(io.in)));

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
    const value = valueToJSON(window.JSON.parse(ctx.getInput(io.in)));
    ctx.setOutput(io.out, Maybe(value).expect("Failed to parse JSON!"));
  },
});
