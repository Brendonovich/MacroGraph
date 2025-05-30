import { Brand } from "effect";

export type DeepWriteable<T> =
  T extends Brand.Brand<any>
    ? T
    : T extends object
      ? { -readonly [P in keyof T]: DeepWriteable<T[P]> }
      : T;
