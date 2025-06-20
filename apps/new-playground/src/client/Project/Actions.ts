import { Data, Effect, SubscriptionRef } from "effect";
import { createStore, produce } from "solid-js/store";

import { GraphId } from "../../domain/Graph/data";
import { NodeId, XY } from "../../domain/Node/data";
import { ProjectRpc } from "./Rpc";
import { ProjectState } from "./State";
import { SchemaRef } from "../../domain/Package/data";
import { IORef, parseIORef } from "../utils";
import { Rpcs } from "../../rpc";
import { Rpc, RpcGroup } from "@effect/rpc";
import { createEffect } from "solid-js";

export class ProjectActions extends Effect.Service<ProjectActions>()(
  "ProjectActions",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const rpc = yield* ProjectRpc.client;
      const { setState, actions } = yield* ProjectState;

      type RpcToObject<T> =
        T extends Rpc.Rpc<infer Name, infer Payload, any, any, any>
          ? { name: Name; payload: Payload["Type"] }
          : never;
      type C = RpcGroup.Rpcs<typeof Rpcs>;
      type T = Array<RpcToObject<C>>;

      const [pending, setPending] = createStore<T>([]);

      createEffect(() => {
        console.log([...pending]);
      });

      const withPending = <T extends RpcToObject<C>>(
        name: T["name"],
        payload: T["payload"],
      ) => {
        setPending(
          produce((draft) => {
            draft.push({ name, payload });
          }),
        );

        const pendingEntry = pending[pending.length - 1];

        return <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          Effect.ensuring(
            effect,
            Effect.sync(() => {
              const index = pending.findIndex((e) => e === pendingEntry);
              setPending(
                produce((draft) => {
                  if (index !== -1) draft.splice(index, 1);
                }),
              );
            }),
          );
      };

      return {
        pending,
        SetNodePositions: (
          graphId: GraphId,
          positions: Array<[NodeId, (typeof XY)["Type"]]>,
          ephemeral = true,
        ) => {
          rpc.SetNodePositions({ graphId, positions }).pipe(Effect.runPromise);
          setState(
            produce((data) => {
              const graph = data.graphs[graphId];
              if (!graph) return;
              for (const [nodeId, position] of positions) {
                const node = graph.nodes.find((n) => n.id === nodeId);
                if (node) node.position = position;
              }
            }),
          );
        },
        CreateNode: (
          graphId: GraphId,
          schema: SchemaRef,
          position: [number, number],
        ) =>
          Effect.gen(function* () {
            const resp = yield* rpc.CreateNode({ schema, graphId, position });

            setState(
              produce((data) => {
                data.graphs[graphId]?.nodes.push({
                  schema,
                  id: resp.id,
                  position: { x: position[0], y: position[1] },
                  inputs: resp.io.inputs as DeepWriteable<
                    typeof resp.io.inputs
                  >,
                  outputs: resp.io.outputs as DeepWriteable<
                    typeof resp.io.outputs
                  >,
                });
              }),
            );
          }).pipe(
            withPending("CreateNode", { graphId, schema, position }),
            Effect.runPromise,
          ),
        ConnectIO: (graphId: GraphId, _one: IORef, _two: IORef) => {
          const one = parseIORef(_one);
          const two = parseIORef(_two);

          let output, input;

          if (one.type === "o" && two.type === "i") {
            output = { nodeId: one.nodeId, ioId: one.id };
            input = { nodeId: two.nodeId, ioId: two.id };
          } else if (one.type === "i" && two.type === "o") {
            output = { nodeId: two.nodeId, ioId: two.id };
            input = { nodeId: one.nodeId, ioId: one.id };
          } else return;

          return Effect.gen(function* () {
            yield* rpc.ConnectIO({ graphId, output, input });

            setState(
              produce((data) => {
                const connections = data.graphs[graphId]?.connections;
                if (!connections) return;

                const outNodeConnections = ((connections[output.nodeId] ??=
                  {}).out ??= {});
                const outConnections = (outNodeConnections[output.ioId] ??= []);
                outConnections.push([input.nodeId, input.ioId]);

                const inNodeConnections = ((connections[input.nodeId] ??=
                  {}).in ??= {});
                const inConnections = (inNodeConnections[input.ioId] ??= []);
                inConnections.push([output.nodeId, output.ioId]);
              }),
            );
          }).pipe(
            withPending("ConnectIO", { graphId, output, input }),
            Effect.runPromise,
          );
        },
        DisconnectIO: (graphId: GraphId, _io: IORef) =>
          Effect.gen(function* () {
            const io = parseIORef(_io);

            yield* rpc.DisconnectIO({
              graphId,
              io: { nodeId: io.nodeId, ioId: io.id, type: io.type },
            });

            setState(
              produce((data) => {
                const connections = data.graphs[graphId]?.connections;
                if (!connections) return;

                const conns =
                  io.type === "i"
                    ? connections[io.nodeId]?.in
                    : connections[io.nodeId]?.out;

                if (!conns) return;

                const ioConnections = conns[io.id];
                delete conns[io.id];
                if (!ioConnections) return;

                for (const ioConnection of ioConnections) {
                  const [nodeId, ioId] = ioConnection;

                  const oppNodeConnections =
                    io.type === "i"
                      ? connections[nodeId]?.out
                      : connections[nodeId]?.in;
                  if (!oppNodeConnections) continue;

                  const oppConnections = oppNodeConnections[ioId];
                  if (!oppConnections) continue;

                  const index = oppConnections.findIndex(
                    ([nodeId, inId]) => nodeId === io.nodeId && inId === io.id,
                  );
                  if (index !== -1) oppConnections.splice(index, 1);
                  if (oppConnections.length < 1)
                    delete oppNodeConnections[ioId];
                }
              }),
            );
          }).pipe(Effect.runPromise),
        DeleteSelection: (graphId: GraphId, selection: Array<NodeId>) =>
          Effect.gen(function* () {
            yield* rpc.DeleteSelection({ graph: graphId, selection });

            setState(
              produce((prev) => {
                for (const nodeId of selection) {
                  actions.deleteNode(prev, { graphId, nodeId });
                }
              }),
            );
          }).pipe(Effect.runPromise),
      };
    }),
    dependencies: [ProjectRpc.Default, ProjectState.Default],
  },
) {}
