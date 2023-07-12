import {
  core,
  Enum,
  EnumBuilder,
  EnumVariant,
  EnumVariants,
  InferEnum,
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
      value: t.List<t.Enum<JSONVariantTypes>>;
    }
  >,
  EnumVariant<
    "Map",
    {
      value: t.Map<t.Enum<JSONVariantTypes>>;
    }
  >
];

const JSON: Enum<JSONVariantTypes> = pkg.createEnum("JSON", (e) =>
  e.lazy(() => [
    ...JSONLiteralVariants(e),
    e.variant("List", {
      value: t.list(t.enum(JSON)),
    }),
    e.variant("Map", {
      value: t.map(t.enum(JSON)),
    }),
  ])
);

function assistedValueToJSON(type: t.Any, value: any): InferEnum<typeof JSON> | null {
  if (type instanceof t.Option) {
    if (Maybe(value).isNone()) return JSON.variant("Null");
    else return assistedValueToJSON(type.inner, value);
  }
  if (type instanceof t.Int || type instanceof t.Float)
    return JSON.variant(["Number", value]);
  else if (type instanceof t.String) return JSON.variant(["String", value]);
  else if (type instanceof t.Bool) return JSON.variant(["Bool", value]);
  else if (type instanceof t.List) return JSON.variant(["List", value]);
  else if (type instanceof t.Map) return JSON.variant(["Map", value]);
  else return null;
}

function valueToJSON(value: any): InferEnum<typeof JSON> | null {
	if (Array.isArray(value)) {
		return JSON.variant(["List", { value: value.map(valueToJSON) }])
	} else if(value instanceof Option) {
		return value.map(valueToJSON).unwrapOrElse(() => JSON.variant("Null"))
	} else if(value === null) {
		return JSON.variant("Null")
	} else if (value instanceof Map) {
		return JSON.variant(["Map", { value: new Map(Array.from(value.entries()).map(([key, value]) => [key, valueToJSON(value)])) }])
	}

	switch (typeof value) {
		case "number":
			return JSON.variant(["Number", {  value } ])
		case "string":
			return JSON.variant(["String", { value }])
		case "object":
			return JSON.variant(["Map", { value: new Map(Object.entries(value).map(([key, value]) => [key, valueToJSON(value)])) }])
		case "boolean":
			return JSON.variant(["Bool", { value }])
	}

	return null;
}

pkg.createNonEventSchema({
  name: "To JSON",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "in",
      type: t.wildcard(w),
    });
    io.dataOutput({
      id: "out",
      type: t.enum(JSON),
    });
  },
  run({ ctx, io }) {
    const w = io.wildcards.get("")!;

    const val = Maybe(assistedValueToJSON(w.value().expect("No wildcard value!"), ctx.getInput("in")));

    ctx.setOutput(
      "out",
      val.expect(`Type ${w.toString()} cannot be converted to JSON!`)
    );
  },
});

pkg.createNonEventSchema({
  name: "Parse JSON",
  variant: "Exec",
  generateIO(io) {
    io.dataInput({
      id: "in",
      type: t.string(),
    });
    io.dataOutput({
      id: "out",
      type: t.enum(JSON),
    });
  },
  run({ ctx }) {
   const value = valueToJSON(window.JSON.parse(ctx.getInput("in")));

    ctx.setOutput(
      "out",
      value
    );
  },
});
