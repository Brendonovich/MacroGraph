import {
  core,
  Enum,
  EnumBuilder,
  EnumVariant,
  EnumVariants,
  InferEnum,
  Maybe,
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
    "Array",
    {
      value: t.List<t.Enum<JSONVariantTypes>>;
    }
  >,
  EnumVariant<
    "Object",
    {
      value: t.Map<t.Enum<JSONVariantTypes>>;
    }
  >
];

const JSON: Enum<JSONVariantTypes> = pkg.createEnum("JSON", (e) =>
  e.lazy(() => [
    ...JSONLiteralVariants(e),
    e.variant("Array", {
      value: t.list(t.enum(JSON)),
    }),
    e.variant("Object", {
      value: t.map(t.enum(JSON)),
    }),
  ])
);

const JSONParser = t.enum(JSON).asZodType();

function valueToJSON(type: t.Any, value: any): InferEnum<typeof JSON> | null {
  if (type instanceof t.Option) {
    if (Maybe(value).isNone()) return JSON.variant("Null");
    else return valueToJSON(type.inner, value);
  }
  if (type instanceof t.Int || type instanceof t.Float)
    return JSON.variant(["Number", value]);
  else if (type instanceof t.String) return JSON.variant(["String", value]);
  else if (type instanceof t.Bool) return JSON.variant(["Bool", value]);
  else if (type instanceof t.List) return JSON.variant(["Array", value]);
  else if (type instanceof t.Map) return JSON.variant(["Object", value]);
  else return null;
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
    const w = io.wildcard("");

    const val = Maybe(valueToJSON(w.value().expect(""), ctx.getInput("in")));

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
    ctx.setOutput(
      "out",
      JSONParser.parse(window.JSON.parse(ctx.getInput("in")))
    );
  },
});
