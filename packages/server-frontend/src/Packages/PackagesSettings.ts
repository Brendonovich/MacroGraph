import { RpcClient, RpcSerialization } from "@effect/rpc";
import { ReactiveMap } from "@solid-primitives/map";
import { Context, Effect, Layer, Option } from "effect";
import { Component } from "solid-js";
import { FetchHttpClient } from "@effect/platform";
import type { SettingsProps } from "@macrograph/package-sdk/ui";
import { SubscribableCache } from "@macrograph/domain";

import { ProjectRpc } from "../Project/Rpc";

export class GetPackageRpcProtocol extends Effect.Service<GetPackageRpcProtocol>()(
  "GetPackageRpcProtocol",
  {
    sync: () => (id: string) =>
      RpcClient.layerProtocolHttp({ url: `/api/package/${id}/rpc` }).pipe(
        Layer.provide([RpcSerialization.layerJson, FetchHttpClient.layer]),
      ),
  },
) {}

export class GetPackageSettings extends Context.Tag("GetPackageSettings")<
  GetPackageSettings,
  (id: string) => Effect.Effect<any, unknown>
>() {}

export type PackageSettings = Readonly<{
  rpcClient: RpcClient.RpcClient<any>;
  SettingsUI: Component<SettingsProps<any, any>>;
  state: SubscribableCache.SubscribableCache<void, any>;
}>;

export interface PackageSettingsModule {
  default: import("solid-js").Component<
    import("@macrograph/package-sdk/ui").SettingsProps<any, any>
  >;
  Rpcs: import("@effect/rpc/RpcGroup").RpcGroup<any>;
}

export class PackagesSettings extends Effect.Service<PackagesSettings>()(
  "PackageEngines",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const getProtocol = yield* GetPackageRpcProtocol;
      const rpc = yield* ProjectRpc.client;

      const packages = new ReactiveMap<string, PackageSettings>();

      return {
        addPackage: Effect.fn(function* (
          id: string,
          module: PackageSettingsModule,
        ) {
          const client = yield* RpcClient.make(module.Rpcs, {
            disableTracing: true,
          }).pipe(Effect.provide(getProtocol(id)));

          packages.set(id, {
            rpcClient: client,
            SettingsUI: module.default,
            state: yield* SubscribableCache.make({
              capacity: 1,
              lookup: rpc.GetPackageSettings({ package: id }),
              timeToLive: 0,
            }),
          });
        }),
        getPackage: (id: string) => Option.fromNullable(packages.get(id)),
        listPackages: () => Array.from<string>(packages.keys()),
      };
    }),
    dependencies: [ProjectRpc.Default, GetPackageRpcProtocol.Default],
  },
) {}
