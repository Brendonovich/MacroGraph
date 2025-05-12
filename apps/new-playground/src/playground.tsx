import { Rpc, RpcClient, RpcGroup, RpcTest } from "@effect/rpc";
import {
  Cache,
  Channel,
  Context,
  Layer,
  Match,
  Option,
  pipe,
  Queue,
  Schema,
  Sink,
  Stream,
} from "effect";
import * as Effect from "effect/Effect";
import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { render } from "solid-js/web";
import {
  createSignal,
  For,
  lazy,
  Show,
  startTransition,
  Suspense,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { Api } from "@macrograph/web-api";

import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "./style.css";

import type { NodeSchema } from "./schema";
import { Node } from "./node";
import {
  EventRef,
  PackageEngine,
  Package,
  PackageBuilder,
  PackageDefinition,
  ForceRetryError,
  CredentialsFetchFailed,
} from "./package";
import {
  ExecutionContext,
  Logger,
  NodeExecutionContext,
  NodeRuntime,
} from "./runtime";
import {
  DataInputRef,
  DataOutputRef,
  ExecInputRef,
  ExecOutputRef,
  IOId,
} from "./io";
import {
  NodeNotFound,
  NotComputationNode,
  NotEventNode,
  SchemaNotFound,
} from "./errors";
import { NodeId } from "./node";
import utilPackage from "./util-package";
import obsPackage from "./obs-package";
import twitchPackage from "./twitch-package";
import { GlobalAppState } from "./package-settings-utils";
import { makeLatch } from "effect/Effect";

type OutputDataMap = Map<NodeId, Record<string, any>>;

const API_BEARER_TOKEN = "stwubr3ijbp562jncfpfigb2hq4mkjls2ansjhqf";
const API_URL = "http://localhost:4321";

const [packageState, setPackageState] = createStore<Record<string, any>>({});
const packageRpcClients = new Map<string, RpcClient.RpcClient<any>>();

const packages = new Map<string, Package>();

type EVENTS = {
  type: "auth-changed";
  data: null | { id: string };
};

const program = Effect.gen(function* () {
  const apiClient = yield* HttpApiClient.make(Api, {
    baseUrl: API_URL,
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.bearerToken(API_BEARER_TOKEN),
    ),
  }).pipe(Effect.provide(FetchHttpClient.layer));

  const eventQueue = yield* Queue.unbounded<EVENTS>();

  const userCache = yield* Cache.make({
    capacity: 1,
    timeToLive: "5 minutes",
    lookup: (_: void) => apiClient.getUser(),
  });

  Effect.gen(function* () {
    const user = yield* userCache.get();

    yield* Queue.offer(eventQueue, {
      type: "auth-changed",
      data: user ? { id: user.id } : null,
    });
  }).pipe(Effect.runFork);

  const credentials = yield* Cache.make({
    capacity: 1,
    timeToLive: "1 minute",
    lookup: (_: void) => apiClient.getCredentials(),
  });

  let nodeCounter = 69 as NodeId;

  const nodes = new Map<number, Node>();

  const getNode = (id: NodeId) => Option.fromNullable(nodes.get(id));

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
      return yield* new NodeNotFound(output);

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
      return yield* new NodeNotFound(input);

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
    schema: Extract<NodeSchema, { type: "event" }>,
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

  const addPackage = Effect.fn(function* (
    name: string,
    def: PackageDefinition<any, any>,
  ) {
    const dirtyState = Effect.gen(function* () {
      if (!ret) return;
      ret.state.get.pipe(
        Effect.tap((v) => setPackageState(name, reconcile(v))),
        Effect.runFork,
      );
    });

    const credentialLatch = yield* makeLatch();
    yield* credentialLatch.open;

    const getCredentials = credentialLatch.whenOpen(credentials.get());

    const builder = new PackageBuilder(name);
    const ret = yield* def(builder, {
      dirtyState,
      credentials: getCredentials.pipe(
        Effect.catchAll(
          (e) => new CredentialsFetchFailed({ message: e.toString() }),
        ),
      ),
      refreshCredential: (id) =>
        Effect.gen(function* () {
          yield* credentialLatch.close;

          yield* apiClient
            .refreshCredential({
              path: {
                providerId: name,
                providerUserId: id,
              },
            })
            .pipe(Effect.catchAll(Effect.die));
          yield* credentials.refresh().pipe(Effect.catchAll(Effect.die));

          return yield* new ForceRetryError();
        }).pipe(Effect.ensuring(credentialLatch.open)),
    });

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

    yield* dirtyState;
    if (ret)
      packageRpcClients.set(
        name,
        yield* RpcTest.makeClient(ret.rpc.group).pipe(
          Effect.provide(ret.rpc.layer),
        ),
      );
  });

  yield* addPackage("util", utilPackage);
  yield* addPackage("twitch", twitchPackage);
  yield* addPackage("obs", obsPackage);

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

  const fetchClient = yield* HttpClient.HttpClient.pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.map(
      HttpClient.mapRequest((a) => {
        console.log(a);
        return a;
      }),
    ),
  );

  const eventStream = Stream.fromQueue(eventQueue);

  render(() => {
    const [globalState, setGlobalState] = createStore<GlobalAppState>({
      auth: {
        state: "logged-out",
        login: Effect.gen(function* () {
          console.log("LOGIN");
        }),
      },
    });

    const [selected, setSelected] = createSignal<string | null>("twitch");

    const tagType = Match.discriminator("type");
    eventStream.pipe(
      Stream.runForEach(
        Effect.fn(function* (event) {
          Match.value(event).pipe(
            tagType("auth-changed", ({ data }) => {
              setGlobalState(
                "auth",
                data
                  ? { state: "logged-in", userId: data.id }
                  : {
                      state: "logged-out",
                      login: Effect.gen(function* () {
                        console.log("LOGIN");
                      }),
                    },
              );
            }),
            Match.exhaustive,
          );
        }),
      ),
      Effect.runFork,
    );

    return (
      <div class="flex flex-row divide-x divide-gray-5 flex-1">
        <nav class="w-40 text-sm p-2 shrink-0">
          <ul class="space-y-1">
            <For
              each={[...packages.entries()].filter(([_, pkg]) => !!pkg.engine)}
            >
              {([name, pkg]) => (
                <li>
                  <button
                    data-selected={selected() === name}
                    class="block text-left w-full px-2 py-1 outline-none data-[selected='true']:bg-gray-5 data-[selected='false']:hover:bg-gray-4 bg-transparent rounded focus-visible:(outline-(1 yellow-4 offset-0))"
                    onClick={() => startTransition(() => setSelected(name))}
                  >
                    {name}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </nav>
        <div class="max-w-lg w-full flex flex-col items-stretch p-4 gap-4 text-sm">
          <Suspense>
            <Show when={selected()} keyed>
              {(selected) => {
                const PackageSettings = lazy(() =>
                  import("macrograph:package-settings").then((s) =>
                    s.default[selected](),
                  ),
                );

                return (
                  <PackageSettings
                    rpc={packageRpcClients.get(selected)!}
                    state={packageState[selected]}
                    globalState={globalState}
                  />
                );
              }}
            </Show>
          </Suspense>
        </div>
      </div>
    );
  }, document.getElementById("app")!);

  while (true) {
    yield* Effect.yieldNow();
  }
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

program.pipe(Effect.scoped, Effect.runPromise);
