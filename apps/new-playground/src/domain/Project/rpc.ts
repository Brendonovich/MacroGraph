import { Rpc, RpcGroup } from "@effect/rpc";
import { Effect, Schema as S, Option } from "effect";

import { Graph } from "../Graph/data";
import { PackageMeta, SchemaMeta } from "../../shared";
import { project } from "../../project";
import { ProjectPackages } from "./Packages";
import { RpcRealtimeMiddleware } from "../Rpc/Middleware";

export const ProjectRpcs = RpcGroup.make(
  Rpc.make("GetProject", {
    success: S.Struct({
      name: S.String,
      graphs: S.Record({ key: S.String, value: Graph }),
      packages: S.Record({ key: S.String, value: PackageMeta }),
    }),
  }),
  Rpc.make("GetPackageSettings", {
    payload: { package: S.String },
    success: S.Any,
  }),
).middleware(RpcRealtimeMiddleware);

export const ProjectRpcsLive = ProjectRpcs.toLayer(
  Effect.gen(function* () {
    const packages = yield* ProjectPackages;

    return {
      GetProject: Effect.fn(function* () {
        return {
          name: project.name,
          graphs: (() => {
            const ret: Record<string, DeepWriteable<Graph>> = {};

            for (const [key, value] of project.graphs.entries()) {
              ret[key] = {
                ...value,
                connections: (() => {
                  const ret: DeepWriteable<Graph["connections"]> = {};
                  if (!value.connections) return ret;

                  for (const [
                    key,
                    nodeConnections,
                  ] of value.connections.entries()) {
                    if (!nodeConnections.out) continue;
                    const outputConns = (ret[key] = {} as (typeof ret)[string]);
                    for (const [
                      key,
                      outputConnections,
                    ] of nodeConnections.out.entries()) {
                      outputConns[key] = outputConnections;
                    }
                  }

                  return ret;
                })(),
              };
            }

            return ret;
          })(),
          packages: [...packages.entries()].reduce(
            (acc, [id, { pkg }]) => {
              acc[id] = {
                schemas: [...pkg.schemas.entries()].reduce(
                  (acc, [id, schema]) => {
                    acc[id] = { id, name: schema.name, type: schema.type };
                    return acc;
                  },
                  {} as Record<string, SchemaMeta>,
                ),
              };
              return acc;
            },
            {} as Record<string, PackageMeta>,
          ),
        };
      }),
      GetPackageSettings: Effect.fn(function* (payload) {
        const pkg = packages.get(payload.package)!;
        return yield* Option.getOrNull(pkg.state)!.get;
      }),
    };
  }),
);
