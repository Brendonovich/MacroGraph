import * as S from "effect/Schema";
import { Rpc, RpcGroup } from "@effect/rpc";
import { Context, Effect as E, Option as O } from "effect";
import { Service } from "effect/Effect";
import { updateService } from "effect/Layer";

namespace Encoded {
  export const PackageRef = S.brand("package-ref")(S.Int);

  export const SchemaRef = S.Struct({
    package: PackageRef,
    schemaId: S.String,
  });

  export const Node = S.Struct({
    name: S.String,
    schema: SchemaRef,
  });

  export const Graph = S.Struct({
    name: S.String,
    nodes: S.Map({ key: S.Int, value: Node }),
  });

  export const Project = S.Struct({
    meta: S.Struct({
      name: S.String,
    }),
    name: S.String,
    packages: S.Map({
      key: S.Int,
      value: S.Struct({
        id: S.String,
        minVersion: S.Int,
      }),
    }),
    graphs: S.Map({ key: S.Int, value: Graph }),
  });
}

namespace Runtime {
  interface Graph {
    nodes: Map<number, Node>;
  }

  interface Project {
    meta: {
      name: string;
      graphIdCounter: number;
    };
    graphs: Map<number, Graph>;
  }

  export interface Runtime {
    project: Project;
    loadedPackages: Map<number, any>;
  }

  type Resources = {
    Graph: { meta: { id: number }; state: { name: string } };
    Node: {
      meta: {
        id: number;
        schema: { packageId: string; schemaId: number };
      };
      state: {
        name: string;
      };
    };
  };

  export function create() {
    return {
      project: {
        meta: { name: "New Project", graphIdCounter: 0 },
        graphs: new Map(),
      },
      loadedPackages: new Map(),
      broadcast: <
        TResource extends keyof Resources,
        TAction extends "Created" | "Updated" | "Deleted",
      >(
        resource: TResource,
        action: TAction,
        data: TAction extends "Created"
          ? Resources[TResource]["state"] & Resources[TResource]["meta"]
          : TAction extends "Updated"
            ? Partial<Resources[TResource]["state"]>
            : Resources[TResource]["meta"],
      ) => {},
    };
  }

  export class Current extends Context.Tag("CurrentRuntime")<
    Current,
    Runtime
  >() {}
}

type GraphState = {
  name: string;
  id: number;
};

const RuntimeRpcs = RpcGroup.make(
  Rpc.make("CreateGraph", {
    success: S.Struct({ id: S.Int }),
    error: S.String,
  }),
);

const b = RuntimeRpcs.toLayer({
  CreateGraph: () =>
    E.gen(function* () {
      const runtime = yield* Runtime.Current;

      const graphId = runtime.project.meta.graphIdCounter++;

      runtime.project.graphs.set(graphId, {
        nodes: new Map(),
      });

      runtime.broadcast("Graph", "Created", {
        id: graphId,
        name: "New Graph",
      });

      return { id: graphId };
    }),
});
