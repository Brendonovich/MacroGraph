import { AnyType, TypeVariant } from ".";
import { BaseType } from "./any";

export class ListType<T extends AnyType = AnyType, TOut = any> extends BaseType<
  TOut[]
> {
  constructor(public inner: T) {
    super();
  }

  default(): TOut[] {
    return [];
  }

  variant(): TypeVariant {
    return "list";
  }

  canConnect(a: BaseType): boolean {
    return a instanceof ListType && this.inner.canConnect(a.inner);
  }
}
