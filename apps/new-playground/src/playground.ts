import {
  Rpc,
  RpcClient,
  RpcGroup,
  RpcMessage,
  RpcServer,
  RpcTest,
} from "@effect/rpc";
import { Brand, Context, Data, Option, pipe, Schema } from "effect";
import * as Effect from "effect/Effect";
import { Broadcast, CurrentProject, GraphRpcs, GraphRpcsLayer } from ".";
import { pipeArguments } from "effect/Pipeable";
import { NoSuchElementException } from "effect/Cause";
import { SchemaIdAnnotationId } from "effect/SchemaAST";
import { log } from "effect/Console";
import { YieldWrap } from "effect/Utils";

const server = () => Effect.gen(function* () {});

// E.gen(function* () {
//   const client = yield* RpcTest.makeClient(GraphRpcs);

//   const graph = yield* client.CreateGraph();

//   console.log("graph", graph);
// }).pipe(E.scoped, E.runFork);

class ExecInputRef {
  constructor(public id: string) {}
}

class ExecOutputRef {
  constructor(public id: IOId) {}
}

class DataInputRef<T> {
  constructor(
    public id: IOId,
    public type: T,
  ) {}
}

class DataOutputRef<T> {
  constructor(
    public id: string,
    public type: T,
  ) {}
}

interface IOFunctionContext {
  in: {
    exec: (id: string) => ExecInputRef;
    data: <T extends Schema.Any>(id: string, type: T) => DataInputRef<T>;
  };
  out: {
    exec: (id: string) => ExecOutputRef;
    data: <T extends Schema.Any>(id: string, type: T) => DataOutputRef<T>;
  };
}

type RunFunctionAvailableRequirements =
  | Logger
  | ExecutionContext
  | NodeExecutionContext;

const getInput = <T extends Schema.Schema<any>>(ref: DataInputRef<T>) =>
  Effect.andThen(ExecutionContext, (ctx) => ctx.getInput(ref));

const setOutput = <T extends Schema.Schema<any>>(
  ref: DataOutputRef<T>,
  data: T["Encoded"],
) => Effect.andThen(ExecutionContext, (ctx) => ctx.setOutput(ref, data));

// exported from core
class Logger extends Context.Tag("Logger")<
  Logger,
  { print: (value: string) => Effect.Effect<void> }
>() {}

class EventRef<
  TId extends string = string,
  TData extends Schema.Schema<any> = any,
> {
  constructor(
    public id: TId,
    public data: TData,
  ) {}
}

class Package {
  constructor(
    public readonly id: string,
    public readonly schemas: Map<string, Schema>,
    private readonly events: Map<string, EventRef>,
    public engine?: PackageEngine.PackageEngine,
  ) {}

  getEvent(id: string) {
    return Option.fromNullable(this.events.get(id));
  }
}

class NodeRuntime extends Context.Tag("NodeRuntime")<
  NodeRuntime,
  {
    emitEvent: (
      packageId: string,
      eventId: string,
      data?: any,
    ) => Effect.Effect<void, NoSuchElementException>;
  }
>() {}

namespace PackageEngine {
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

class DuplicateSchemaId extends Data.TaggedError("DuplicateSchemaId") {}

type PackageBuildReturn = {
  engine: PackageEngine.PackageEngine;
};

type EffectGenerator<
  Eff extends Effect.Effect<any, any, any>,
  Ret = void,
> = Generator<YieldWrap<Eff>, Ret, never>;

type SchemaRunGeneratorEffect = Effect.Effect<
  any,
  NoSuchElementException | NotComputationNode,
  RunFunctionAvailableRequirements
>;

type PureSchemaDefinition<TIO = any> = {
  type: "pure";
  io: (ctx: {
    in: Extract<IOFunctionContext["in"], { data: any }>;
    out: Extract<IOFunctionContext["out"], { data: any }>;
  }) => TIO;
  run: (io: TIO) => EffectGenerator<SchemaRunGeneratorEffect>;
};

type PureSchema<TIO = any> = Omit<PureSchemaDefinition<TIO>, "run"> & {
  run: ReturnType<PureSchemaDefinition<TIO>["run"]> extends EffectGenerator<
    infer TEff
  >
    ? (...args: Parameters<PureSchemaDefinition<TIO>["run"]>) => TEff
    : never;
};

type ExecSchemaDefinition<TIO = any> = {
  type: "exec";
  io: (ctx: IOFunctionContext) => TIO;
  run: (
    io: TIO,
  ) => EffectGenerator<SchemaRunGeneratorEffect, ExecOutputRef | void>;
};

type ExecSchema<TIO = any> = Omit<ExecSchemaDefinition<TIO>, "run"> & {
  run: ReturnType<ExecSchemaDefinition<TIO>["run"]> extends EffectGenerator<
    infer TEff
  >
    ? (...args: Parameters<ExecSchemaDefinition<TIO>["run"]>) => TEff
    : never;
};

type EventSchemaDefinition<
  TIO = any,
  TEventData extends Schema.Schema<any> = Schema.Schema<any>,
> = {
  type: "event";
  event: EventRef<string, TEventData>;
  io: (ctx: Omit<IOFunctionContext, "in">) => TIO;
  run: (
    io: TIO,
    data: TEventData["Encoded"],
  ) => EffectGenerator<SchemaRunGeneratorEffect, ExecOutputRef | void>;
};

type EventSchema<
  TIO = any,
  TEventData extends Schema.Schema<any> = Schema.Schema<any>,
> = Omit<EventSchemaDefinition<TIO, TEventData>, "run"> & {
  run: ReturnType<
    EventSchemaDefinition<TIO, TEventData>["run"]
  > extends EffectGenerator<infer TEff, any>
    ? (
        ...args: Parameters<EventSchemaDefinition<TIO, TEventData>["run"]>
      ) => TEff
    : never;
};

type SchemaDefinition<
  TIO = any,
  TEventData extends Schema.Schema<any> = Schema.Schema<any>,
> =
  | ExecSchemaDefinition<TIO>
  | PureSchemaDefinition<TIO>
  | EventSchemaDefinition<TIO, TEventData>;

type Schema<
  TIO = any,
  TEventData extends Schema.Schema<any> = Schema.Schema<any>,
> = ExecSchema<TIO> | PureSchema<TIO> | EventSchema<TIO, TEventData>;

class PackageBuilder {
  private schemas = new Map<string, Schema>();
  private events = new Map<string, EventRef>();

  constructor(public readonly id: string) {}

  schema = <TIO>(id: string, schema: SchemaDefinition<TIO>) => {
    const self = this;
    return Effect.gen(function* () {
      if (self.schemas.has(id)) yield* new DuplicateSchemaId();

      self.schemas.set(id, {
        ...schema,
        run: Effect.fn(schema.run as any),
      } as Schema<TIO>);
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
  toPackage(ret?: PackageBuildReturn): Package {
    return new Package(this.id, this.schemas, this.events, ret?.engine);
  }
}

function definePackage(
  cb: (
    pkg: PackageBuilder,
  ) => Effect.Effect<void | PackageBuildReturn, DuplicateSchemaId>,
) {
  return cb;
}

const utilPackage = definePackage(
  Effect.fn(function* (pkg) {
    const tick = pkg.event("tick", Schema.Number);

    yield* pkg.schema("print", {
      type: "exec",
      io: (c) => ({
        execIn: c.in.exec("exec"),
        execOut: c.out.exec("exec"),
        in: c.in.data("in", Schema.String),
      }),
      run: function* (io) {
        const logger = yield* Logger;
        yield* logger.print(yield* getInput(io.in));

        return io.execOut;
      },
    });

    yield* pkg.schema("ticker", {
      type: "event",
      event: tick,
      io: (c) => ({
        execOut: c.out.exec("exec"),
        tick: c.out.data("tick", Schema.Int),
      }),
      run: function* (io, data) {
        yield* setOutput(io.tick, data);

        return io.execOut;
      },
    });

    yield* pkg.schema("intToString", {
      type: "pure",
      io: (c) => ({
        int: c.in.data("int", Schema.Int),
        str: c.out.data("str", Schema.String),
      }),
      run: function* (io) {
        yield* setOutput(io.str, String(yield* getInput(io.int)));
      },
    });

    return {
      engine: Effect.gen(function* () {
        let i = 0;
        while (true) {
          yield* PackageEngine.emit(tick, i++);
          yield* Effect.sleep(1000);
        }
      }),
    };
  }),
);

type OutputDataMap = Map<NodeId, Record<string, any>>;

class ExecutionContext extends Context.Tag("ExecutionContext")<
  ExecutionContext,
  {
    traceId: string;
    getInput<T extends Schema.Schema<any>>(
      input: DataInputRef<T>,
    ): Effect.Effect<
      T["Encoded"],
      NoSuchElementException | NotComputationNode,
      NodeExecutionContext | RunFunctionAvailableRequirements
    >;
    setOutput<T extends Schema.Schema<any>>(
      output: DataOutputRef<T>,
      data: T,
    ): Effect.Effect<void, never, NodeExecutionContext>;
  }
>() {}

type NodeId = number & Brand.Brand<"NodeId">;
type IOId = string & Brand.Brand<"IOId">;

class NodeExecutionContext extends Context.Tag("NodeExecutionContext")<
  NodeExecutionContext,
  { node: Node }
>() {}

class NotComputationNode extends Data.TaggedError("NotComputationNode") {}

class NotEventNode extends Data.TaggedError("NotEventNode") {}

class SchemaNotFound extends Schema.TaggedError<SchemaNotFound>(
  "SchemaNotFound",
)("SchemaNotFound", {
  pkgId: Schema.String,
  schemaId: Schema.String,
}) {}

class NodeNotFound extends Schema.TaggedError<NodeNotFound>("NodeNotFound")(
  "NodeNotFound",
  { nodeId: Schema.Int },
) {}

type Node = {
  id: NodeId;
  schema: {
    pkgId: string;
    schemaId: string;
  };
  io: any;
};

const program = Effect.gen(function* () {
  let nodeCounter = 69 as NodeId;

  const nodes = new Map<number, Node>();

  const getNode = (id: NodeId) => Option.fromNullable(nodes.get(id));

  const packages = new Map<string, Package>();

  const getPackage = (pkgId: string) =>
    Option.fromNullable(packages.get(pkgId));

  const eventNodes = new Map<EventRef, Set<NodeId>>();

  const getEventNodesForEvent = (event: EventRef) =>
    Option.fromNullable(eventNodes.get(event));

  type SchemaRef = {
    pkgId: string;
    schemaId: string;
  };

  const getSchema = (schemaRef: SchemaRef) =>
    Option.fromNullable(
      packages.get(schemaRef.pkgId)?.schemas.get(schemaRef.schemaId),
    );

  const createNode = (schemaRef: SchemaRef) =>
    Effect.gen(function* () {
      const schema = yield* getSchema(schemaRef);
      const id = nodeCounter++ as NodeId;
      const node = { id, schema: schemaRef, io: schema.io } satisfies Node;
      nodes.set(id, node);

      if (schema.type === "event") {
        let nodes = eventNodes.get(schema.event);
        if (!nodes) {
          nodes = new Set();
          eventNodes.set(schema.event, nodes);
        }

        nodes.add(id);
      }

      return node;
    });

  type IORef = { nodeId: NodeId; ioId: IOId };

  type NodeConnections = {
    in?: Map<IOId, Array<IORef>>;
    out?: Map<IOId, Array<IORef>>;
  };
  const connections = new Map<NodeId, NodeConnections>();

  const upsertNodeConnections = (nodeId: NodeId) =>
    connections.get(nodeId) ??
    (() => {
      const v: NodeConnections = {};
      connections.set(nodeId, v);
      return v;
    })();

  const getInputConnections = (nodeId: NodeId, inputId: IOId) =>
    Option.fromNullable(connections.get(nodeId)?.in?.get(inputId)).pipe(
      Option.getOrElse<Array<IORef>>(() => []),
    );

  const getOutputConnections = (nodeId: NodeId, outputId: IOId) =>
    Option.fromNullable(connections.get(nodeId)?.out?.get(outputId)).pipe(
      Option.getOrElse<Array<IORef>>(() => []),
    );

  const addConnection = Effect.fn(function* (output: IORef, input: IORef) {
    if (Option.isNone(getNode(output.nodeId)))
      return yield* Effect.fail(new NodeNotFound(output));

    let outputNodeConnections = upsertNodeConnections(output.nodeId);

    outputNodeConnections.out ??= new Map();
    let outputNodeInputConnections =
      outputNodeConnections.out.get(output.ioId) ??
      (() => {
        const v: Array<IORef> = [];
        outputNodeConnections.out.set(output.ioId, v);
        return v;
      })();
    outputNodeInputConnections.push(input);

    if (Option.isNone(getNode(input.nodeId)))
      return yield* Effect.fail(new NodeNotFound(input));

    let inputNodeConnections = upsertNodeConnections(input.nodeId);

    inputNodeConnections.in ??= new Map();
    let inputNodeInputConnections =
      inputNodeConnections.in.get(input.ioId) ??
      (() => {
        const v: Array<IORef> = [];
        inputNodeConnections.in.set(input.ioId, v);
        return v;
      })();
    inputNodeInputConnections.push(output);
  });

  const runNode = Effect.fn(function* (nodeId: NodeId) {
    const node = yield* getNode(nodeId);
    const schema = yield* getSchema(node.schema);

    if (schema.type === "event") return yield* new NotComputationNode();

    const io = schema.io({
      out: {
        exec: (id) => new ExecOutputRef(id as IOId),
        data: (id, type) => new DataOutputRef(id, type),
      },
      in: {
        exec: (id) => new ExecInputRef(id),
        data: (id, type) => new DataInputRef(id as IOId, type),
      },
    });

    return yield* schema.run(io).pipe(
      Effect.map((v) => Option.fromNullable(v ?? undefined)),
      Effect.map(Option.map((output) => ({ output, node }))),
      Effect.provide(Context.make(NodeExecutionContext, { node })),
    );
  });

  const connectionForExecOutput = Effect.fn(function* (ref: ExecOutputRef) {
    const { node } = yield* NodeExecutionContext;
    return Option.fromNullable(getOutputConnections(node.id, ref.id)[0]);
  });

  const connectionForDataInput = Effect.fn(function* (ref: DataInputRef<any>) {
    const { node } = yield* NodeExecutionContext;
    return Option.fromNullable(getInputConnections(node.id, ref.id)[0]);
  });

  const runEventNode = Effect.fn(function* (
    eventNode: Node,
    schema: Extract<Schema, { type: "event" }>,
    data: any,
  ) {
    const io = schema.io({
      out: {
        exec: (id) => new ExecOutputRef(id as IOId),
        data: (id, type) => new DataOutputRef(id, type),
      },
    });

    let ret = yield* schema.run(io, data).pipe(
      Effect.map((v) => Option.fromNullable(v ?? undefined)),
      Effect.map(Option.map((output) => ({ output, node: eventNode }))),
      Effect.provide(Context.make(NodeExecutionContext, { node: eventNode })),
    );

    while (Option.isSome(ret)) {
      const { output, node } = ret.value;

      ret = yield* pipe(
        yield* connectionForExecOutput(output).pipe(
          Effect.provide(Context.make(NodeExecutionContext, { node })),
        ),
        Option.andThen((ref) => runNode(ref.nodeId)),
        Effect.transposeOption,
        Effect.map(Option.flatten),
      );
    }
  });

  const executeEventNode = Effect.fn(function* (nodeId: NodeId, data: any) {
    const eventNode = yield* getNode(nodeId);
    const schema = yield* getSchema(eventNode.schema);
    if (schema.type !== "event") return yield* new NotEventNode();

    const outputData: OutputDataMap = new Map();

    const getData = (io: IORef) =>
      Option.fromNullable(outputData.get(io.nodeId)?.[io.ioId]);

    const execCtx = Context.make(ExecutionContext, {
      traceId: Math.random().toString(),
      getInput: (input) =>
        Effect.gen(function* () {
          const connection = yield* connectionForDataInput(input);
          if (Option.isNone(connection)) return "Value";

          const data = getData(connection.value);
          if (Option.isSome(data)) return data.value;

          yield* runNode(connection.value.nodeId).pipe(
            Effect.catchTag("NotComputationNode", () =>
              Effect.die(
                new Error("Cannot get input for a non-computation node"),
              ),
            ),
          );

          return getData(connection.value).pipe(Option.getOrThrow);
        }),
      setOutput: (output, data) =>
        Effect.gen(function* () {
          const { node } = yield* NodeExecutionContext;
          let nodeOutputData = outputData.get(node.id);
          if (!nodeOutputData) {
            nodeOutputData = {};
            outputData.set(node.id, nodeOutputData);
          }
          nodeOutputData[output.id] = data;
        }),
    });

    yield* runEventNode(eventNode, schema, data).pipe(Effect.provide(execCtx));
  });

  const logger = yield* Logger;

  const nodeRuntime = Context.make(NodeRuntime, {
    emitEvent: (pkgId, eventId, data) =>
      Effect.gen(function* () {
        const pkg = yield* getPackage(pkgId);
        const event = yield* pkg.getEvent(eventId);
        const nodeIds = getEventNodesForEvent(event);

        if (Option.isNone(nodeIds)) return;

        for (const nodeId of nodeIds.value) {
          executeEventNode(nodeId, data).pipe(
            Effect.provide(Context.make(Logger, logger)),
            Effect.runFork,
          );
        }
      }),
  });

  const builder = new PackageBuilder("util");
  const ret = yield* utilPackage(builder);

  const pkg = builder.toPackage(ret ?? undefined);

  packages.set(pkg.id, pkg);

  const engineContext = Context.make(PackageEngine.PackageEngineContext, {
    packageId: pkg.id,
  });

  pkg.engine?.pipe(
    Effect.provide(nodeRuntime),
    Effect.provide(engineContext),
    Effect.runFork,
  );

  const RpcsLayer = Rpcs.toLayer({
    CreateNode: Effect.fn(function* (payload) {
      const node = yield* createNode(payload.schema).pipe(
        Effect.mapError(() => new SchemaNotFound(payload.schema)),
      );

      const io = {
        inputs: [] as { id: string; variant: "exec" | "data" }[],
        outputs: [] as { id: string; variant: "exec" | "data" }[],
      };

      node.io({
        out: {
          exec: (id) => {
            io.outputs.push({ id, variant: "exec" });
            return new ExecOutputRef(id as IOId);
          },
          data: (id, type) => {
            io.outputs.push({ id, variant: "data" });
            return new DataOutputRef(id, type);
          },
        },
        in: {
          exec: (id) => {
            io.inputs.push({ id, variant: "exec" });
            return new ExecInputRef(id);
          },
          data: (id, type) => {
            io.inputs.push({ id, variant: "data" });
            return new DataInputRef(id as IOId, type);
          },
        },
      });

      return { id: node.id, io };
    }),
    ConnectIO: Effect.fn(function* (payload) {
      yield* addConnection(payload.output as any, payload.input as any);
    }),
  });

  clientTest.pipe(Effect.provide(RpcsLayer), Effect.scoped, Effect.runFork);
}).pipe(
  Effect.provide(
    Context.make(Logger, {
      print: (v: string) => {
        console.log(v);
        return Effect.succeed(null);
      },
    }),
  ),
);

const SchemaRef = Schema.Struct({
  pkgId: Schema.String,
  schemaId: Schema.String,
});

const IORef = Schema.Struct({
  nodeId: Schema.Int,
  ioId: Schema.String,
});

const IOVariant = Schema.Union(Schema.Literal("exec"), Schema.Literal("data"));

const NodeIO = Schema.Struct({
  inputs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      variant: IOVariant,
      name: Schema.optional(Schema.String),
    }),
  ),
  outputs: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      variant: IOVariant,
      name: Schema.optional(Schema.String),
    }),
  ),
});

const Rpcs = RpcGroup.make(
  Rpc.make("CreateNode", {
    payload: Schema.Struct({
      schema: SchemaRef,
    }),
    success: Schema.Struct({
      id: Schema.Int,
      io: NodeIO,
    }),
    error: Schema.Union(SchemaNotFound),
  }),
  Rpc.make("ConnectIO", {
    payload: Schema.Struct({
      output: IORef,
      input: IORef,
    }),
    error: Schema.Union(NodeNotFound),
  }),
);

const clientTest = Effect.gen(function* () {
  const client = yield* RpcTest.makeClient(Rpcs);

  const tickerNode = yield* client.CreateNode({
    schema: { pkgId: "util", schemaId: "ticker" },
  });

  const printNode = yield* client.CreateNode({
    schema: { pkgId: "util", schemaId: "print" },
  });

  const convertNode = yield* client.CreateNode({
    schema: { pkgId: "util", schemaId: "intToString" },
  });

  yield* client
    .CreateNode({ schema: { pkgId: "", schemaId: "" } })
    .pipe(Effect.mapError(console.log), Effect.ignore);

  yield* client
    .ConnectIO({
      output: { nodeId: -1, ioId: "" },
      input: { nodeId: -1, ioId: "" },
    })
    .pipe(Effect.mapError(console.log), Effect.ignore);

  yield* client.ConnectIO({
    output: { nodeId: tickerNode.id, ioId: "tick" },
    input: { nodeId: convertNode.id, ioId: "int" },
  });

  yield* client.ConnectIO({
    output: { nodeId: convertNode.id, ioId: "str" },
    input: { nodeId: printNode.id, ioId: "in" },
  });

  yield* client.ConnectIO({
    output: {
      nodeId: tickerNode.id,
      ioId: "exec",
    },
    input: {
      nodeId: printNode.id,
      ioId: "exec",
    },
  });
});

program.pipe(Effect.runPromise);
