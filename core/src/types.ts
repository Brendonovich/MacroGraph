export type TypeVariant = "primitive" | "list" | "map" | "set";

export abstract class AnyType<TOut = any> {
  abstract default(): TOut;
  abstract variant(): TypeVariant;
  abstract compare(a: AnyType): boolean;
}

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

export class ListType<
  T extends AnyType<TOut> = AnyType,
  TOut = any
> extends AnyType<TOut[]> {
  constructor(public inner: T) {
    super();
  }

  default(): TOut[] {
    return [];
  }

  variant(): TypeVariant {
    return "list";
  }

  compare(a: AnyType): boolean {
    return a instanceof ListType && this.inner.compare(a.inner);
  }
}

export const types = {
  int: () => new IntType(),
  float: () => new FloatType(),
  string: () => new StringType(),
  bool: () => new BoolType(),
  list: <T extends AnyType<any>>(t: T) => new ListType(t),
};
