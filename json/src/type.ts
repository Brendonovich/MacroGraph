import { createEnum } from "@macrograph/core";
import {
  Enum,
  EnumBuilder,
  EnumVariant,
  EnumVariants,
  InferEnumVariant,
  t,
} from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";

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
type JSONLiteralValue = InferEnumVariant<JSONLiteralVariantTypes[number]>;
export type JSONValue =
  | JSONLiteralValue
  | { variant: "List"; data: { value: JSONValue[] } }
  | { variant: "Map"; data: { value: ReactiveMap<string, JSONValue> } };

type JSONVariantTypes = [
  ...JSONLiteralVariantTypes,
  EnumVariant<
    "List",
    { value: t.List<t.Enum<Enum<JSONVariantTypes, JSONValue>>> }
  >,
  EnumVariant<
    "Map",
    { value: t.Map<t.Enum<Enum<JSONVariantTypes, JSONValue>>> }
  >
];

export const JSON = createEnum<JSONVariantTypes>("JSON", (e) =>
  e.lazy(() => [
    ...JSONLiteralVariants(e),
    e.variant("List", {
      value: t.list(t.enum(JSON)),
    }),
    e.variant("Map", {
      value: t.map(t.enum(JSON)),
    }),
  ])
) as Enum<JSONVariantTypes, JSONValue>;
