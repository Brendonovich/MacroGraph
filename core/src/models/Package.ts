import { createMutable } from "solid-js/store";
import { Core } from "./Core";
import {
  EventNodeSchema,
  EventsMap,
  IOBuilder,
  NodeSchema,
  NonEventNodeSchema,
  RunCtx,
} from "./NodeSchema";
import {
  Enum,
  EnumBuilder,
  EnumVariants,
  LazyEnumVariants,
} from "../types/enum";
import {
  LazyStructFields,
  Struct,
  StructBuilder,
  StructFields,
} from "../types/struct";

export interface PackageArgs {
  name: string;
  core: Core;
}

export class Package<TEvents extends EventsMap = EventsMap> {
  name: string;
  schemas: NodeSchema[] = [];
  core: Core;

  constructor(args: PackageArgs) {
    this.name = args.name;
    this.core = args.core;

    return createMutable(this);
  }

  createNonEventSchema(schema: Omit<NonEventNodeSchema, "package">) {
    this.schemas.push({
      ...schema,
      generateIO: (t, state) => {
        if (schema.variant === "Exec") {
          t.execInput({
            id: "exec",
          });

          t.execOutput({
            id: "exec",
          });
        }

        schema.generateIO(t, state);
      },
      run: async (args: { ctx: RunCtx; io: IOBuilder }) => {
        await schema.run(args);

        if (schema.variant === "Exec") args.ctx.exec("exec");
      },
      package: this as any,
    });

    return this;
  }

  createEventSchema<TEvent extends keyof TEvents>(
    schema: Omit<EventNodeSchema<TEvents, TEvent>, "package">
  ) {
    this.schemas.push({
      ...schema,
      package: this,
    } as any);

    return this;
  }

  createEnum<Variants extends EnumVariants>(
    name: string,
    builderFn: (t: EnumBuilder) => Variants | LazyEnumVariants<Variants>
  ) {
    const builder = new EnumBuilder();

    const e = new Enum(name, builderFn(builder));

    return e;
  }

  createStruct<Fields extends StructFields>(
    name: string,
    builderFn: (t: StructBuilder) => Fields | LazyStructFields<Fields>
  ) {
    const builder = new StructBuilder();

    const e = new Struct(name, builderFn(builder));

    return e;
  }

  schema(name: string): NodeSchema<TEvents> | undefined {
    return this.schemas.find((s) => s.name === name);
  }

  emitEvent<TEvent extends keyof TEvents>(event: {
    name: TEvent;
    data: TEvents[TEvent];
  }) {
    this.core.emitEvent(this, event as any);
  }
}
