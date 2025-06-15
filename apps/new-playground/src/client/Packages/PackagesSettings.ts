import { RpcClient } from "@effect/rpc";
import { ReactiveMap } from "@solid-primitives/map";
import { Cache, Context, Effect, Layer, Option } from "effect";
import { Component } from "solid-js";

import { SettingsProps } from "../../package-settings-utils";

export class GetPackageRpcProtocol extends Context.Tag("GetPackageRpcProtocol")<
  GetPackageRpcProtocol,
  (id: string) => Layer.Layer<RpcClient.Protocol>
>() {}

export class GetPackageSettings extends Context.Tag("GetPackageSettings")<
  GetPackageSettings,
  (id: string) => Effect.Effect<any, unknown>
>() {}

export type PackageSettings = Readonly<{
  rpcClient: RpcClient.RpcClient<any>;
  SettingsUI: Component<SettingsProps<any, any>>;
  state: Cache.Cache<void, any, unknown>;
}>;

export class PackagesSettings extends Effect.Service<PackagesSettings>()(
  "PackageEngines",
  {
    effect: Effect.gen(function* () {
      const getProtocol = yield* GetPackageRpcProtocol;
      const getSettings = yield* GetPackageSettings;

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
            state: yield* Cache.make({
              capacity: 1,
              lookup: (_: void) => getSettings(id),
              timeToLive: "1 minute",
            }),
          });
        }),
        getPackage: (id: string) => Option.fromNullable(packages.get(id)),
        listPackages: () => Array.from<string>(packages.keys()),
      };
    }),
  },
) {}
