import { Context, Data, Effect, Layer, Option, PubSub, Schema } from "effect";

import { NodeRuntime } from "./runtime";
import { NodeSchema, SchemaDefinition } from "./schema";
import { Rpc, RpcGroup } from "@effect/rpc";
import { HandlersContext } from "@effect/rpc/RpcGroup";
import { CREDENTIAL } from "@macrograph/web-api";

export namespace PackageEngine {
  type Requirements = PackageEngineContext | NodeRuntime;

  export class PackageEngineContext extends Context.Tag("PackageEngineContext")<
    PackageEngineContext,
    { packageId: string }
  >() {}

  export type PackageEngine = Effect.Effect<void, never, Requirements>;

  export function emit(
    event: EventRef<any, Schema.Schema<void>>,
  ): Effect.Effect<void, never, Requirements>;
  export function emit<TData extends Schema.Schema<any>>(
    event: EventRef<any, TData>,
    data: TData["Encoded"],
  ): Effect.Effect<void, never, Requirements>;
  export function emit<TData extends Schema.Schema<any>>(
    event: EventRef<any, TData>,
    data?: TData,
  ) {
    return Effect.gen(function* () {
      const { packageId } = yield* PackageEngineContext;
      const runtime = yield* NodeRuntime;

      yield* runtime.emitEvent(packageId, event.id, data);
    });
  }
}

export class EventRef<
  TId extends string = string,
  TData extends Schema.Schema<any> = any,
> {
  constructor(
    public id: TId,
    public data: TData,
  ) {}
}

export class DuplicateSchemaId extends Data.TaggedError("DuplicateSchemaId") {}

export type PackageBuildReturn<
  TRpcGroup extends RpcGroup.RpcGroup<any>,
  TState extends Schema.Schema<any>,
> = {
  engine: PackageEngine.PackageEngine;
  rpc: {
    group: TRpcGroup;
    layer: Layer.Layer<Rpc.ToHandler<RpcGroup.Rpcs<TRpcGroup>>>;
  };
  state: {
    schema: TState;
    get: Effect.Effect<TState["Encoded"]>;
  };
};

export type PackageDefinition<
  TRpcGroup extends RpcGroup.RpcGroup<any>,
  TState extends Schema.Schema<any>,
> = (
  pkg: PackageBuilder,
  ctx: {
    dirtyState: Effect.Effect<void>;
    credentials: Effect.Effect<ReadonlyArray<(typeof CREDENTIAL)["Encoded"]>>;
  },
) => Effect.Effect<
  void | PackageBuildReturn<TRpcGroup, TState>,
  DuplicateSchemaId
>;

export function definePackage<
  TRpcGroup extends RpcGroup.RpcGroup<any>,
  TState extends Schema.Schema<any>,
>(cb: PackageDefinition<TRpcGroup, TState>) {
  return cb;
}

export class PackageBuilder {
  private schemas = new Map<string, NodeSchema>();
  private events = new Map<string, EventRef>();

  constructor(public readonly id: string) {}

  schema = <TIO>(id: string, schema: SchemaDefinition<TIO>) => {
    const self = this;
    return Effect.gen(function* () {
      if (self.schemas.has(id)) yield* new DuplicateSchemaId();

      self.schemas.set(id, {
        ...schema,
        run: Effect.fn(schema.run as any),
      } as NodeSchema<TIO>);
    });
  };

  event<TId extends string>(id: TId): EventRef<TId, Schema.Schema<void>>;
  event<TId extends string, TData extends Schema.Schema<any>>(
    id: TId,
    data: TData,
  ): EventRef<TId, TData>;
  event<TID extends string, TData extends Schema.Schema<any>>(
    id: TID,
    data?: TData,
  ) {
    const ref = new EventRef(id, data ?? Schema.Void);
    this.events.set(id, ref);
    return ref;
  }

  /** @internal */
  toPackage(ret?: PackageBuildReturn<any, any>): Package {
    return new Package(this.id, this.schemas, this.events, ret?.engine);
  }
}

export class Package {
  constructor(
    public readonly id: string,
    public readonly schemas: Map<string, NodeSchema>,
    private readonly events: Map<string, EventRef>,
    public engine?: PackageEngine.PackageEngine,
  ) {}

  getEvent(id: string) {
    return Option.fromNullable(this.events.get(id));
  }
}
