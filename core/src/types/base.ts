import { ZodType } from "zod";
import { TypeVariant } from ".";

export abstract class BaseType<TOut = any> {
  abstract default(): TOut;
  abstract variant(): TypeVariant;
  abstract toString(): string;
  abstract asZodType(): ZodType<TOut>;
}
