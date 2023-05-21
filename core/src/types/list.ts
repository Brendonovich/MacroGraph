import { PrimitiveType, TypeVariant } from ".";
import { AnyType } from "./any";

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
