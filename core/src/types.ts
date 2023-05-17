export type TypeVariant = "primitive" | "list" | "map" | "set" | "option";

export abstract class AnyType<TOut = any> {
  abstract default(): TOut;
  abstract variant(): TypeVariant;
  abstract compare(a: AnyType): boolean;
  abstract basePrimitive(): PrimitiveType;
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

  basePrimitive(): PrimitiveType {
    return this.inner.basePrimitive();
  }
}

export type Optional<T> = Some<T> | None<T>;

export abstract class Option<T> {
  map<O>(fn: (v: T) => Promise<O>): Promise<Optional<O>>;
  map<O>(fn: (v: T) => O): Optional<O>;
  map<O>(fn: (v: T) => O | Promise<O>): Optional<O> | Promise<Optional<O>> {
    if (this instanceof None) return this;
    else if (this instanceof Some) {
      const val = fn(this.value);

      if (val instanceof Promise) return val.then((v) => new Some(v));
      else return new Some(val);
    } else throw new Error();
  }

  andThen<O>(fn: (v: T) => Optional<O>): Optional<O> {
    if (this instanceof None) return this;
    else if (this instanceof Some) {
      return fn(this.value);
    } else throw new Error();
  }

  unwrap(): T {
    if (this instanceof Some<T>) return this.value;
    else throw new Error("Attempted to unwrap a None value");
  }

  isSome() {
    return this instanceof Some;
  }

  isNone() {
    return this instanceof None;
  }

  static new<T>(value: T | null): Optional<T> {
    if (value === null) return new None();
    else return new Some(value);
  }
}

export class Some<T> extends Option<T> {
  constructor(public value: T) {
    super();
  }
}

export class None<T> extends Option<T> {}

export class OptionType<
  T extends AnyType<TOut> = AnyType,
  TOut = any
> extends AnyType<Optional<T>> {
  constructor(public inner: T) {
    super();
  }

  default(): Optional<T> {
    return new None();
  }

  variant(): TypeVariant {
    return this.inner.variant();
  }

  compare(a: AnyType<any>): boolean {
    if (!(a instanceof OptionType)) return false;

    return this.inner.compare(a.inner);
  }

  basePrimitive(): PrimitiveType {
    return this.inner.basePrimitive();
  }

  getInner(): AnyType {
    if (this.inner instanceof OptionType) {
      return this.inner.getInner();
    } else return this.inner;
  }
}

export const types = {
  int: () => new IntType(),
  float: () => new FloatType(),
  string: () => new StringType(),
  bool: () => new BoolType(),
  list: <T extends AnyType>(t: T) => new ListType(t),
  option: <T extends AnyType>(t: T) => new OptionType(t),
};
