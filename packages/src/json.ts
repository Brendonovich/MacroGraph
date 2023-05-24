import {
  core,
  Enum,
  EnumBuilder,
  EnumVariant,
  EnumVariants,
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
type JSONType = Enum<
  [
    ...JSONLiteralVariantTypes,
    EnumVariant<
      "Array",
      {
        value: t.List<t.Enum<JSONType>>;
      }
    >
  ]
>;

const JSON: JSONType = pkg.createEnum("JSON", (e) =>
  e.lazy(() => [
    ...JSONLiteralVariants(e),
    e.variant("Array", {
      value: t.list(t.enum(JSON)),
    }),
    // e.variant("Object", {
    //   value: t.map(
    //     t.string(),
    //     t.enum(() => JSON)
    //   ),
    // }),
  ])
);
