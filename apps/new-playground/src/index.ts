import * as S from "effect/Schema";
import { Rpc, RpcGroup } from "@effect/rpc";
import { Context, Effect as E, PubSub } from "effect";

export class CurrentProject extends Context.Tag("Project")<
  CurrentProject,
  Project
>() {}

interface Graph {
  name: string;
  nodes: Map<number, Node>;
}

interface Project {
  meta: {
    name: string;
    graphIdCounter: number;
  };
  graphs: Map<number, Graph>;
}

export class Broadcast extends Context.Tag("Broadcast")<
  Broadcast,
  {
    // send: (msg: any) => E.Effect<void>;
    pubsub: PubSub.PubSub<any>;
  }
>() {}

class GraphNotFound extends S.TaggedError<GraphNotFound>("GraphNotFound")(
  "GraphNotFound",
  { graphId: S.Number },
) {}

export const GraphRpcs = RpcGroup.make(
  Rpc.make("CreateGraph", {
    success: S.Struct({ id: S.Int }),
  }),
  Rpc.make("UpdateGraph", {
    payload: S.Struct({
      graphId: S.Int,
      data: S.partial(S.Struct({ name: S.String })),
    }),
    error: GraphNotFound,
  }),
  Rpc.make("DeleteGraph", {
    payload: S.Struct({ graphId: S.Int }),
    error: GraphNotFound,
  }),
);

export const GraphRpcsLayer = GraphRpcs.toLayer({
  CreateGraph: () =>
    E.gen(function* () {
      const project = yield* CurrentProject;

      const graphId = project.meta.graphIdCounter++;

      project.graphs.set(graphId, {
        name: "New Graph",
        nodes: new Map(),
      });

      const broadcast = yield* Broadcast;

      yield* broadcast.pubsub.publish({
        resource: "Graph",
        action: "Create",
        id: graphId,
      });

      return { id: graphId };
    }),
  UpdateGraph: ({ graphId, data }) =>
    E.gen(function* () {
      const project = yield* CurrentProject;

      const graph = yield* E.fromNullable(project.graphs.get(graphId)).pipe(
        E.mapError(() => new GraphNotFound({ graphId })),
      );

      if (data.name !== undefined) graph.name = data.name;

      // TODO: don't broadcast if nothing changes

      const broadcast = yield* Broadcast;

      yield* broadcast.pubsub.publish({
        resource: "Graph",
        action: "Update",
        id: graphId,
        data,
      });
    }),
  DeleteGraph: ({ graphId }) =>
    E.gen(function* () {
      const project = yield* CurrentProject;

      const deleted = project.graphs.delete(graphId);

      if (!deleted) return yield* new GraphNotFound({ graphId });

      const broadcast = yield* Broadcast;

      yield* broadcast.pubsub.publish({
        resource: "Graph",
        action: "Delete",
        id: graphId,
      });
    }),
});
