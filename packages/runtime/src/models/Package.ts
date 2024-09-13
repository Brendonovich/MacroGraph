import {
  type BaseType,
  Enum,
  EnumBuilder,
  type EnumVariants,
  type LazyEnumVariants,
  type LazyStructFields,
  Struct,
  StructBuilder,
  type StructFields,
  type t,
} from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";
import { createLazyMemo } from "@solid-primitives/memo";
import { type Component, lazy } from "solid-js";
import type { Simplify } from "type-fest";

import type { Core } from "./Core";
import type { ExecInput, ExecOutput } from "./IO";
import type {
  CreateSchema,
  EventNodeSchema,
  EventsMap,
  NodeSchema,
  NonEventNodeSchema,
  PropertyDef,
  RunProps,
  Schema,
  SchemaProperties,
} from "./NodeSchema";

export interface PackageArgs<TCtx> {
  name: string;
  ctx?: TCtx;
  SettingsUI?: Parameters<typeof lazy<Component<TCtx>>>[0];
}

export class Package<TEvents extends EventsMap = EventsMap, TCtx = any> {
  name: string;
  schemas = new ReactiveMap<string, NodeSchema<TEvents>>();
  core?: Core;
  ctx?: TCtx;
  SettingsUI?: ReturnType<typeof lazy>;

  structs = new Map<string, Struct>();
  enums = new Map<string, Enum>();
  resources = new Set<ResourceType<any, any>>();

  constructor(args: PackageArgs<TCtx>) {
    this.name = args.name;
    this.ctx = args.ctx;
    this.SettingsUI = args.SettingsUI ? lazy(args.SettingsUI) : undefined;
  }

  createNonEventSchema<TIO, TProperties extends Record<string, PropertyDef>>(
    schema: Omit<
      NonEventNodeSchema<TIO, TProperties>,
      "package" | "properties"
    > & {
      properties?: TProperties;
    },
  ) {
    const altered: NonEventNodeSchema<
      { custom: TIO; default?: { in: ExecInput; out: ExecOutput } },
      TProperties
    > = {
      ...schema,
      properties: Object.entries(schema.properties ?? {}).reduce(
        (acc: any, [id, property]: any) => {
          acc[id] = {
            id,
            ...property,
          };

          return acc;
        },
        {} as SchemaProperties<TProperties>,
      ),
      createIO: (ctx) => {
        let defaultIO: any;

        if (schema.variant === "Exec") {
          defaultIO = {
            in: ctx.io.execInput({ id: "exec" }),
            out: ctx.io.execOutput({ id: "exec" }),
          };
        }

        const custom = schema.createIO(ctx);

        return {
          custom,
          default: defaultIO,
        };
      },
      run: async (args) => {
        await schema.run({ ...args, io: args.io.custom });

        if (schema.variant === "Exec" && args.io.default)
          args.ctx.exec(args.io.default.out);
      },
      package: this as any,
    };

    this.schemas.set(altered.name, altered as any);

    return this;
  }

  createEventSchema<
    TEvent extends keyof TEvents,
    TIO,
    TProperties extends Record<string, PropertyDef>,
  >(
    schema: Omit<
      EventNodeSchema<TEvents, TEvent, TIO, TProperties>,
      "package" | "properties"
    > & {
      properties?: TProperties;
    },
  ) {
    const altered: EventNodeSchema<TEvents, TEvent, TIO, TProperties> = {
      ...schema,
      properties: Object.entries(schema.properties ?? {}).reduce(
        (acc: any, [id, property]: any) => {
          acc[id] = {
            id,
            ...property,
          };

          return acc;
        },
        {} as SchemaProperties<TProperties>,
      ),
      package: this as any,
    };

    this.schemas.set(altered.name, altered as any);

    return this;
  }

  createSchema<TProperties extends Record<string, PropertyDef>, TIO, TFire>(
    schema: Simplify<CreateSchema<TProperties, TIO, TFire>>,
  ) {
    type IO = { custom: TIO; default?: { in: ExecInput; out: ExecOutput } };

    const altered: Schema<TProperties, IO, TFire> = {
      ...schema,
      properties: Object.entries(schema.properties ?? {}).reduce(
        (acc: any, [id, property]: any) => {
          acc[id] = {
            id,
            ...property,
          };

          return acc;
        },
        {} as SchemaProperties<any>,
      ),
      createIO: (ctx) => {
        let defaultIO: any;

        if (schema.type === "exec") {
          defaultIO = {
            in: ctx.io.execInput({ id: "exec" }),
            out: ctx.io.execOutput({ id: "exec" }),
          };
        }

        const custom = schema.createIO(ctx);

        return {
          custom,
          default: defaultIO,
        };
      },
      run: async (props: RunProps<TProperties, IO>) => {
        await schema.run({ ...(props as any), io: props.io.custom });

        if (schema.type === "exec" && props.io.default)
          props.ctx.exec(props.io.default.out);
      },
      package: this as any,
    };

    this.schemas.set(altered.name, altered as any);

    return this;
  }

  schema(name: string): NodeSchema<TEvents> | undefined {
    for (const schema of this.schemas.values()) {
      if (schema.name === name) return schema;
    }
  }

  resource(name: string): ResourceType<any, any> | undefined {
    for (const resource of this.resources) {
      if (resource.name === name) return resource;
    }
  }

  emitEvent<TEvent extends keyof TEvents>(event: {
    name: TEvent;
    data: TEvents[TEvent];
  }) {
    this.core?.emitEvent(this, event as any);
  }

  registerType(type: Enum<any> | Struct<any>) {
    if (type instanceof Enum) this.enums.set(type.name, type);
    else this.structs.set(type.name, type);

    type.source = { variant: "package", package: this.name };

    return type;
  }

  registerResourceType<T extends ResourceType<any, any>>(resource: T) {
    this.resources.add(resource);
    resource.package = this;
  }

  createEnum<Variants extends EnumVariants>(
    name: string,
    builderFn: (t: EnumBuilder) => Variants | LazyEnumVariants<Variants>,
  ) {
    const builder = new EnumBuilder();

    const e = new Enum(name, builderFn(builder));

    this.registerType(e);

    return e;
  }

  createStruct<Fields extends StructFields>(
    name: string,
    builderFn: (t: StructBuilder) => Fields | LazyStructFields<Fields>,
  ) {
    const builder = new StructBuilder();

    const s = new Struct(name, builderFn(builder));

    this.registerType(s);

    return s;
  }
}

export type Events<TEventsMap extends EventsMap = EventsMap> =
  TEventsMap extends EventsMap<infer TName>
    ? { name: TName; data: EventsMap[TName] }
    : never;
export type OnEvent<TEventsMap extends EventsMap = EventsMap> = (
  _: Events<TEventsMap>,
) => void;

export type ResourceType<
  TValue,
  TPkg extends Package<any, any> = Package<any, any>,
> = { name: string; package: TPkg } & (
  | {
      sources: (
        pkg: TPkg,
      ) => Array<{ id: string; display: string; value: TValue }>;
    }
  | { type: BaseType<TValue> }
);

export type inferResourceTypeValue<T> =
  T extends ResourceType<infer TValue, any>
    ? T extends { source: any }
      ? TValue
      : T extends { type: BaseType }
        ? t.infer<T["type"]>
        : never
    : never;

type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

export function createResourceType<
  TValue,
  TPkg extends Package<any, any> = Package<any, any>,
>(args: DistributiveOmit<ResourceType<TValue, TPkg>, "package">) {
  const type = args as ResourceType<TValue, TPkg>;

  if ("sources" in type) {
    const oldSources = type.sources;
    type.sources = createLazyMemo(() => oldSources(type.package));
  }

  return type;
}

export function createEnum<Variants extends EnumVariants>(
  name: string,
  builderFn: (t: EnumBuilder) => Variants | LazyEnumVariants<Variants>,
) {
  const builder = new EnumBuilder();

  return new Enum(name, builderFn(builder));
}

export function createStruct<Fields extends StructFields>(
  name: string,
  builderFn: (t: StructBuilder) => Fields | LazyStructFields<Fields>,
) {
  const builder = new StructBuilder();

  return new Struct(name, builderFn(builder));
}
