import { createMutable } from "solid-js/store";
import { z } from "zod";
import { trackDeep } from "@solid-primitives/deep";

import { t } from "../types";
import { SerializedType, deserializeType } from "../types/serialized";
import { deserializeValue, serializeValue } from "../types/value";
import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
import { Project } from "./Project";
import { Graph } from "./Graph";

export type VariableArgs = {
  id: number;
  name: string;
  type: t.Any;
  value: any;
  owner: Graph | Project;
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
  owner: Graph | Project;

  dispose: () => void;

  constructor(args: VariableArgs) {
    this.id = args.id;
    this.name = args.name;
    this.type = args.type;
    this.value = args.value;
    this.owner = args.owner;

    const self = createMutable(this);

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    runWithOwner(owner, () => {
      createEffect((prevType) => {
        if (prevType && prevType !== self.type)
          self.value = self.type.default();

        return self.type;
      });

      createEffect(
        on(
          () => trackDeep(self.value),
          (value) => {
            console.log(value);
            if (this.owner instanceof Graph) this.owner.project.save();
            else this.owner.save();
          }
        )
      );
    });

    this.dispose = dispose;

    return;
  }

  serialize(): z.infer<typeof SerializedVariable> {
    return {
      id: this.id,
      name: this.name,
      value: serializeValue(this.value, this.type),
      type: this.type.serialize(),
    };
  }

  static deserialize(
    data: z.infer<typeof SerializedVariable>,
    owner: Graph | Project
  ) {
    const type = deserializeType(data.type);

    return new Variable({
      id: data.id,
      name: data.name,
      value: deserializeValue(data.value, type),
      type,
      owner,
    });
  }
}
