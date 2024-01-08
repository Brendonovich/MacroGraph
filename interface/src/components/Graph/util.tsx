import {
  AnyType,
  BasePrimitiveType,
  PrimitiveVariant,
  t,
} from "@macrograph/typesystem";

const PrimitiveVariantColours: Record<PrimitiveVariant, string> = {
  bool: "#DC2626",
  string: "#DA5697",
  int: "#30F3DB",
  float: "#00AE75",
};

export const colour = (type: AnyType): string => {
  if (type instanceof BasePrimitiveType)
    return PrimitiveVariantColours[type.primitiveVariant()];

  if (type instanceof t.List) return colour(type.item);
  if (type instanceof t.Option) return colour(type.inner);
  if (type instanceof t.Map) return colour(type.value);

  if (type instanceof t.Enum) return "#1B4DFF";
  if (type instanceof t.Struct) return "#FACC15";

  if (type instanceof t.Wildcard) {
    const value = type.wildcard.value();

    if (value.isSome()) return colour(value.unwrap());
    else return "white";
  }

  throw new Error();
};
