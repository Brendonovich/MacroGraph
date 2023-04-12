import type { ListItem } from "./ListItem";
import type { ListType } from "./ListType";

export interface List { type: ListType, values: Array<ListItem>, }