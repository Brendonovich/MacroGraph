import type { ListType } from "./ListType";
import type { PrimitiveType } from "./PrimitiveType";

export type ValueType = { variant: "primitive", value: PrimitiveType } | { variant: "list", value: ListType };