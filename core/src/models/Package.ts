import { Core } from "./Core";
import {
  EventNodeSchema,
  EventsMap,
  NodeSchema,
  NonEventNodeSchema,
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
import { ReactiveSet } from "@solid-primitives/set";
import { Component, type lazy } from "solid-js";

export interface PackageArgs<TCtx> {
  name: string;
  ctx?: TCtx;
  settingsUI?: Parameters<typeof lazy<Component<TCtx>>>[0];
}

export class Package<TEvents extends EventsMap = EventsMap, TCtx = any> {
  name: string;
  schemas = new ReactiveSet<NodeSchema<TEvents>>();
  core?: Core;
  ctx?: TCtx;
  settingsUI?: Parameters<typeof lazy>[0];

  constructor(args: PackageArgs<TCtx>) {
    this.name = args.name;
    this.ctx = args.ctx;
    this.settingsUI = args.settingsUI;
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

    this.schemas.add(altered);

    return this;
  }

  createEventSchema<TEvent extends keyof TEvents, TState extends object, TIO>(
    schema: Omit<EventNodeSchema<TEvents, TEvent, TState, TIO>, "package">
  ) {
    const altered: EventNodeSchema<TEvents, TEvent, TState, TIO> = {
      ...schema,
      package: this as any,
    };

    this.schemas.add(altered);

    return this;
  }

  schema(name: string): NodeSchema<TEvents> | undefined {
    for (const schema of this.schemas) {
      if (schema.name === name) return schema;
    }
  }

  emitEvent<TEvent extends keyof TEvents>(event: {
    name: TEvent;
    data: TEvents[TEvent];
  }) {
    this.core?.emitEvent(this, event as any);
  }

  registerType(_: Enum<any> | Struct<any>) {}
}

export function createEnum<Variants extends EnumVariants>(
  name: string,
  builderFn: (t: EnumBuilder) => Variants | LazyEnumVariants<Variants>
) {
  const builder = new EnumBuilder();

  const e = new Enum(name, builderFn(builder));

  return e;
}

export function createStruct<Fields extends StructFields>(
  name: string,
  builderFn: (t: StructBuilder) => Fields | LazyStructFields<Fields>
) {
  const builder = new StructBuilder();

  const e = new Struct(name, builderFn(builder));

  return e;
}

export type OnEvent = (_: { name: string; data: any }) => void;
