import { Effect } from "effect";
import { GraphId } from "../../domain/Graph/data";
import { NodeId, XY } from "../../domain/Node/data";
import { ProjectRpc } from "./Rpc";
import { ProjectState } from "./State";
import { produce } from "solid-js/store";
import { SchemaRef } from "../../domain/Package/data";
import { IORef, parseIORef } from "../utils";

export class ProjectActions extends Effect.Service<ProjectActions>()(
  "ProjectActions",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const rpc = yield* ProjectRpc.client;
      const { setState, actions } = yield* ProjectState;

      return {
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
            const resp = yield* rpc.CreateNode({
              schema,
              graphId,
              position,
            });

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
          }).pipe(Effect.runPromise),
        ConnectIO: (graphId: GraphId, _one: IORef, _two: IORef) =>
          Effect.gen(function* () {
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
          }).pipe(Effect.runPromise),
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
  },
) {}
