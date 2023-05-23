import { TypeVariant } from ".";

export abstract class BaseType<TOut = any> {
  abstract default(): TOut;
  abstract variant(): TypeVariant;
  abstract toString(): string;
}
