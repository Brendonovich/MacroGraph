import { createMutable } from "solid-js/store";
import { Core } from "./Core";
import { NodeSchema } from "./NodeSchema";

export interface PackageArgs {
  name: string;
  core: Core;
}

export class Package {
  name: string;
  schemas: NodeSchema[] = [];
  core: Core;

  constructor(args: PackageArgs) {
    this.name = args.name;
    this.core = args.core;

    return createMutable(this);
  }

  createSchema(schema: NodeSchema) {
    this.schemas.push({
      ...schema,
      generate(builder, state) {
        if (schema.variant === "Exec") {
          builder.addExecInput({
            id: "exec",
            name: "",
          });

          builder.addExecOutput({
            id: "exec",
            name: "",
          });
        }

        schema.generate(builder, state);
      },
    });

    return this;
  }

  schema(name: string) {
    return this.schemas.find((s) => s.name === name);
  }
}
