import { Effect } from "effect";
import { createStore } from "solid-js/store";
import { Node, Graph } from "@macrograph/server-domain";

import { ProjectRpc } from "./Rpc";
import { GraphTwoWayConnections } from "../Graph/Graph";

export class ProjectState extends Effect.Service<ProjectState>()(
  "ProjectState",
  {
    effect: Effect.gen(function* () {
      const rpc = yield* ProjectRpc.client;

      const _data = yield* rpc.GetProject();
      const data = _data as DeepWriteable<typeof _data>;

      const [state, setState] = createStore({
        ...data,
        graphs: Object.entries(data.graphs).reduce(
          (acc, [graphId, graph]) => {
            const connections: GraphTwoWayConnections = {};

            for (const [outNodeId, outNodeConnections] of Object.entries(
              graph.connections,
            )) {
              for (const [outId, outConnections] of Object.entries(
                outNodeConnections,
              )) {
                ((connections[Node.Id.make(Number(outNodeId))] ??= {}).out ??=
                  {})[outId] = outConnections;

                for (const [inNodeId, inId] of outConnections) {
                  (((connections[inNodeId] ??= {}).in ??= {})[inId] ??=
                    []).push([Node.Id.make(Number(outNodeId)), outId]);
                }
              }
            }

            return Object.assign(acc, {
              [graphId]: Object.assign(graph, { connections }),
            });
          },
          {} as Record<
            string,
            Omit<DeepWriteable<Graph.Shape>, "connections"> & {
              connections: GraphTwoWayConnections;
            }
          >,
        ),
        auth: null as null | { id: string; email: string },
      });

      const actions = {
        disconnectIO(
          prev: typeof state,
          args: {
            graphId: Graph.Id;
            nodeId: Node.Id;
            type: "i" | "o";
            ioId: string;
          },
        ) {
          const graph = prev.graphs[args.graphId];
          if (!graph) return;

          const ioConnections =
            graph.connections[args.nodeId]?.[args.type === "i" ? "in" : "out"];
          if (!ioConnections) return;

          const connections = ioConnections[args.ioId];
          if (!connections) return;
          delete ioConnections[args.ioId];

          for (const [oppNodeId, oppIoId] of connections) {
            const oppNodeConnections = graph.connections[oppNodeId];
            const oppConnections =
              oppNodeConnections?.[args.type === "o" ? "in" : "out"]?.[oppIoId];
            if (!oppConnections) continue;

            const index = oppConnections.findIndex(
              ([nodeId, ioId]) => nodeId === args.nodeId && ioId === args.ioId,
            );
            if (index !== -1) oppConnections.splice(index, 1);
          }
        },
        deleteNode(
          prev: typeof state,
          args: {
            graphId: Graph.Id;
            nodeId: Node.Id;
          },
        ) {
          const graph = prev.graphs[args.graphId];
          if (!graph) return;

          const nodeConnections = graph.connections[args.nodeId];

          if (nodeConnections?.in)
            for (const ioId of Object.keys(nodeConnections.in)) {
              actions.disconnectIO(prev, {
                graphId: args.graphId,
                nodeId: args.nodeId,
                type: "i",
                ioId,
              });
            }

          if (nodeConnections?.out)
            for (const ioId of Object.keys(nodeConnections.out ?? {})) {
              actions.disconnectIO(prev, {
                graphId: args.graphId,
                nodeId: args.nodeId,
                type: "o",
                ioId,
              });
            }

          const nodeIndex = graph.nodes.findIndex(
            (node) => node.id === args.nodeId,
          );
          if (nodeIndex === -1) return;
          graph.nodes.splice(nodeIndex, 1);
        },
      };

      return { state, setState, actions };
    }),
    dependencies: [ProjectRpc.Default],
  },
) {}
