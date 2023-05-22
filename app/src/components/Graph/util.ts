import {
  AnyType,
  BasePrimitiveType,
  ListType,
  OptionType,
  PrimitiveVariant,
} from "@macrograph/core";

const DataPinTypeColours: Record<PrimitiveVariant, string> = {
  bool: "[--mg-current:#DC2626]",
  string: "[--mg-current:#DA5697]",
  int: "[--mg-current:#30F3DB]",
  float: "[--mg-current:#00AE75]",
};

export const colour = (type: AnyType): string => {
  if (type instanceof BasePrimitiveType)
    return DataPinTypeColours[type.primitiveVariant()];

  if (type instanceof ListType || type instanceof OptionType)
    return colour(type.inner);

  const value = type.wildcard.value;

  if (value.isSome()) {
    return colour(value.unwrap());
  } else {
    return "[--mg-current:white]";
  }
};
