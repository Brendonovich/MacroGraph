import { createMutable } from "solid-js/store";
import { Core } from "./Core";
import { NodeSchema } from "./NodeSchema";

export interface PackageArgs {
  name: string;
  core: Core;
}

export class Package<TEvents extends string> {
  name: string;
  schemas: NodeSchema<TEvents>[] = [];
  core: Core;

  constructor(args: PackageArgs) {
    this.name = args.name;
    this.core = args.core;

    return createMutable(this);
  }

  createSchema(schema: Omit<NodeSchema<TEvents>, "package">) {
    this.schemas.push({
      ...schema,
      generateIO: (t, state) => {
        const generated = schema.generateIO(t, state);

        if (schema.variant === "Exec") {
          t.execInput({
            id: "exec",
            name: "",
          });

          t.execOutput({
            id: "exec",
            name: "",
          });
        }

        return generated;
      },
      package: this,
    });

    return this;
  }

  schema(name: string): NodeSchema<TEvents> | undefined {
    return this.schemas.find((s) => s.name === name);
  }

  emitEvent<T extends TEvents>(event: { name: T; data: any }) {
    this.core.emitEvent(this, event);
  }
}
