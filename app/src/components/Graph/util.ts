import {
  AnyType,
  BasePrimitiveType,
  ListType,
  OptionType,
  PrimitiveVariant,
} from "@macrograph/core";

const DataPinTypeColours: Record<PrimitiveVariant, string> = {
  bool: "text-red-bool",
  string: "text-pink-string",
  int: "text-blue-int",
  float: "text-green-float",
};

export const colour = (type: AnyType): string => {
  if (type instanceof BasePrimitiveType)
    return DataPinTypeColours[type.primitiveVariant()];

  if (type instanceof ListType || type instanceof OptionType)
    return colour(type.inner);

  const value = type.wildcard.valueMemo();

  if (value.isSome()) {
    return colour(value.unwrap());
  } else {
    return "text-white";
  }
};
