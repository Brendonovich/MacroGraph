import { PrimitiveType, TypeVariant } from ".";

export abstract class AnyType<TOut = any> {
  abstract default(): TOut;
  abstract variant(): TypeVariant;
  abstract compare(a: AnyType): boolean;
  abstract basePrimitive(): PrimitiveType;
}
