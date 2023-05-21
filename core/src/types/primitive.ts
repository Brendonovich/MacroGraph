import { TypeVariant } from ".";
import { AnyType } from "./any";

export type PrimitiveVariant = "int" | "float" | "string" | "bool";

export abstract class PrimitiveType<TOut = any> extends AnyType<TOut> {
  variant(): TypeVariant {
    return "primitive";
  }

  compare(a: AnyType) {
    return (
      a instanceof PrimitiveType &&
      this.primitiveVariant() === a.primitiveVariant()
    );
  }

  basePrimitive(): PrimitiveType {
    return this;
  }

  abstract primitiveVariant(): PrimitiveVariant;
}

export class IntType extends PrimitiveType<number> {
  default() {
    return 0;
  }

  primitiveVariant(): PrimitiveVariant {
    return "int";
  }
}

export class FloatType extends PrimitiveType<number> {
  default() {
    return 0;
  }

  primitiveVariant(): PrimitiveVariant {
    return "float";
  }
}

export class StringType extends PrimitiveType<string> {
  default() {
    return "";
  }

  primitiveVariant(): PrimitiveVariant {
    return "string";
  }
}

export class BoolType extends PrimitiveType<boolean> {
  default() {
    return false;
  }

  primitiveVariant(): PrimitiveVariant {
    return "bool";
  }
}
