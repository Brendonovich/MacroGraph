import type { Connection } from "./Connection";
import type { Primitive } from "./Primitive";
import type { ValueType } from "./ValueType";

export type Input =
  | {
      variant: "Data";
      id: string;
      name: string;
      type: ValueType;
      defaultValue?: Primitive;
      connection?: Connection | null;
    }
  | {
      variant: "Exec";
      id: string;
      name: string;
      connection?: Connection | null;
    };
