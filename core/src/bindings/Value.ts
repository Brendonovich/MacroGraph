import type { List } from "./List";
import type { Primitive } from "./Primitive";

export type Value = { type: "primitive", value: Primitive } | { type: "list", value: List };