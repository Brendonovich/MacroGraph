import { createMutable } from "solid-js/store";
import { z } from "zod";

import { t } from "../types";
import { SerializedType, deserializeType } from "../types/serialized";

export type VariableArgs = {
  id: number;
  name: string;
  type: t.Any;
  value: any;
};

export const SerializedVariable = z.object({
  id: z.number(),
  name: z.string(),
  value: z.any(),
  type: SerializedType,
});

export class Variable {
  id: number;
  name: string;
  type: t.Any;
  value: any;

  constructor(args: VariableArgs) {
    this.id = args.id;
    this.name = args.name;
    this.type = args.type;
    this.value = args.value;

    return createMutable(this);
  }

  serialize(): z.infer<typeof SerializedVariable> {
    return {
      id: this.id,
      name: this.name,
      value: this.value,
      type: this.type.serialize(),
    };
  }

  static deserialize(data: z.infer<typeof SerializedVariable>) {
    return new Variable({
      id: data.id,
      name: data.name,
      value: data.value,
      type: deserializeType(data.type),
    });
  }
}
