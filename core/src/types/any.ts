import { TypeVariant } from ".";

export abstract class BaseType<TOut = any> {
  abstract default(): TOut;
  abstract variant(): TypeVariant;
  abstract canConnect(a: BaseType): boolean;
}
