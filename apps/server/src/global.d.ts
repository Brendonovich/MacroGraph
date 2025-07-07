declare type DeepWriteable<T> = T extends import("effect").Brand.Brand<any>
  ? T
  : T extends object
    ? { -readonly [P in keyof T]: DeepWriteable<T[P]> }
    : T;
