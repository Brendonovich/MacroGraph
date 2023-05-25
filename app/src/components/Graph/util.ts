import {
  AnyType,
  BasePrimitiveType,
  EnumType,
  ListType,
  OptionType,
  PrimitiveVariant,
  StructType,
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

  if (type instanceof ListType || type instanceof OptionType)
    return colour(type.inner);

  if (type instanceof EnumType) return "[--mg-current:#1B4DFF]";

  if (type instanceof StructType) return "[--mg-current:#FACC15]";

  const value = type.wildcard.value;

  if (value.isSome()) {
    return colour(value.unwrap());
  } else {
    return "[--mg-current:white]";
  }
};
