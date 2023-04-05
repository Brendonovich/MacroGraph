import type { ValueType } from "./ValueType";

export type Output =
  | { variant: "Data"; id: string; name: string; type: ValueType }
  | { variant: "Exec"; id: string; name: string };
