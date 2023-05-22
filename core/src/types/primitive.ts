import { TypeVariant } from ".";
import { BaseType } from "./any";
import { WildcardType } from "./wildcard";

export type PrimitiveVariant = "int" | "float" | "string" | "bool";

export abstract class BasePrimitiveType<TOut = any> extends BaseType<TOut> {
  variant(): TypeVariant {
    return "primitive";
  }

  canConnect(a: BaseType) {
    return (
      a instanceof WildcardType ||
      (a instanceof BasePrimitiveType &&
        this.primitiveVariant() === a.primitiveVariant())
    );
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
}

export class FloatType extends BasePrimitiveType<number> {
  default() {
    return 0;
  }

  primitiveVariant(): PrimitiveVariant {
    return "float";
  }
}

export class StringType extends BasePrimitiveType<string> {
  default() {
    return "";
  }

  primitiveVariant(): PrimitiveVariant {
    return "string";
  }
}

export class BoolType extends BasePrimitiveType<boolean> {
  default() {
    return false;
  }

  primitiveVariant(): PrimitiveVariant {
    return "bool";
  }
}

export type PrimitiveType = IntType | FloatType | StringType | BoolType;
