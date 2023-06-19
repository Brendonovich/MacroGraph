import {
  AnyType,
  BasePrimitiveType,
  PrimitiveVariant,
  t,
} from "@macrograph/core";

const PrimitiveVariantColours: Record<PrimitiveVariant, string> = {
  bool: "[--mg-current:#DC2626]",
  string: "[--mg-current:#DA5697]",
  int: "[--mg-current:#30F3DB]",
  float: "[--mg-current:#00AE75]",
};

export const colour = (type: AnyType): string => {
  if (type instanceof BasePrimitiveType)
    return PrimitiveVariantColours[type.primitiveVariant()];

  if (type instanceof t.List || type instanceof t.Option)
    return colour(type.inner);

  if (type instanceof t.Map) return colour(type.value);

  if (type instanceof t.Enum) return "[--mg-current:#1B4DFF]";

  if (type instanceof t.Struct) return "[--mg-current:#FACC15]";

  if (type instanceof t.Wildcard) {
    const value = type.wildcard.value;

    if (value.isSome()) {
      return colour(value.unwrap());
    } else {
      return "[--mg-current:white]";
    }
  }

  throw new Error();
};
