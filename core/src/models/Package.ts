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
import { ExecInput, ExecOutput } from "./IO";

export interface PackageArgs {
  name: string;
  core: Core;
}

export class Package<TEvents extends EventsMap = EventsMap> {
  name: string;
  schemas: NodeSchema<TEvents>[] = [];
  core: Core;

  constructor(args: PackageArgs) {
    this.name = args.name;
    this.core = args.core;

    return createMutable(this);
  }

  createNonEventSchema<TState extends object, TIO>(
    schema: Omit<NonEventNodeSchema<TState, TIO>, "package">
  ) {
    const altered: NonEventNodeSchema<
      TState,
      { custom: TIO; default?: { in: ExecInput; out: ExecOutput } }
    > = {
      ...schema,
      generateIO: (t, state) => {
        let defaultIO;

        if (schema.variant === "Exec") {
          defaultIO = {
            in: t.execInput({
              id: "exec",
            }),
            out: t.execOutput({
              id: "exec",
            }),
          };
        }

        const custom = schema.generateIO(t, state);

        return {
          custom,
          default: defaultIO,
        };
      },
      run: async ({ ctx, io }) => {
        await schema.run({ ctx, io: io.custom });

        if (schema.variant === "Exec" && io.default) ctx.exec(io.default.out);
      },
      package: this as any,
    };

    this.schemas.push(altered);

    return this;
  }

  createEventSchema<TEvent extends keyof TEvents, TState extends object, TIO>(
    schema: Omit<EventNodeSchema<TEvents, TEvent, TState, TIO>, "package">
  ) {
    const altered: EventNodeSchema<TEvents, TEvent, TState, TIO> = {
      ...schema,
      package: this as any,
    };

    this.schemas.push(altered);

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
