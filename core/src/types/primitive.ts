import { TypeVariant } from ".";
import { BaseType } from "./any";
import { WildcardType } from "./wildcard";

export type PrimitiveVariant = "int" | "float" | "string" | "bool";

export abstract class BasePrimitiveType<TOut = any> extends BaseType<TOut> {
  variant(): TypeVariant {
    return "primitive";
  }

  connectWildcard(_right: WildcardType) {}

  abstract primitiveVariant(): PrimitiveVariant;
}

export class IntType extends BasePrimitiveType<number> {
  default() {
    return 0;
  }

  primitiveVariant(): PrimitiveVariant {
    return "int";
  }

  toString() {
    return "Int";
  }
}

export class FloatType extends BasePrimitiveType<number> {
  default() {
    return 0;
  }

  primitiveVariant(): PrimitiveVariant {
    return "float";
  }

  toString() {
    return "Float";
  }
}

export class StringType extends BasePrimitiveType<string> {
  default() {
    return "";
  }

  primitiveVariant(): PrimitiveVariant {
    return "string";
  }

  toString() {
    return "String";
  }
}

export class BoolType extends BasePrimitiveType<boolean> {
  default() {
    return false;
  }

  primitiveVariant(): PrimitiveVariant {
    return "bool";
  }

  toString() {
    return "Bool";
  }
}

export type PrimitiveType = IntType | FloatType | StringType | BoolType;
