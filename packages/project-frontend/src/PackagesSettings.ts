import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import type { SettingsProps } from "@macrograph/package-sdk/ui";
import { ReactiveMap } from "@solid-primitives/map";
import {
	Context,
	Effect,
	Layer,
	Option,
	PubSub,
	type Scope,
	Stream,
} from "effect";
import type { Component } from "solid-js";

export type PackageSettings = Readonly<{
	rpcClient: RpcClient.RpcClient<any>;
	SettingsUI: Component<SettingsProps<any, any>>;
	notifySettingsChange: Effect.Effect<void>;
	settingsChanges: Effect.Effect<Stream.Stream<void>, never, Scope.Scope>;
}>;

export interface PackageSettingsModule {
	default: import("solid-js").Component<
		import("@macrograph/package-sdk/ui").SettingsProps<any, any>
	>;
	Rpcs: import("@effect/rpc/RpcGroup").RpcGroup<any>;
}

export class GetPackageRpcProtocol extends Context.Tag("GetPackageRpcProtocol")<GetPackageRpcProtocol, (id: string) => Layer.Layer<RpcClient.Protocol>>(){}

// export class GetPackageRpcProtocol extends Effect.Service<GetPackageRpcProtocol>()(
// 	"GetPackageRpcProtocol",
// 	{
// 		sync: () => (id: string) =>
// 			RpcClient.layerProtocolHttp({ url: `/api/package/${id}/rpc` }).pipe(
// 				Layer.provide([RpcSerialization.layerJson, FetchHttpClient.layer]),
// 			),
// 	},
// ) {}

export class PackagesSettings extends Effect.Service<PackagesSettings>()(
	"PackageEngines",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const getProtocol = yield* GetPackageRpcProtocol;

			const packages = new ReactiveMap<string, PackageSettings>();

			return {
				addPackage: Effect.fn(function* (
					id: string,
					module: PackageSettingsModule,
				) {
					const client = yield* RpcClient.make(module.Rpcs, {
						disableTracing: false,
					}).pipe(Effect.provide(getProtocol(id)));

					const changesNotify = yield* PubSub.unbounded<null>();

					packages.set(id, {
						rpcClient: client,
						SettingsUI: module.default,
						notifySettingsChange: changesNotify.offer(null),
						settingsChanges: changesNotify.subscribe.pipe(
							Effect.map(Stream.fromQueue),
						),
					});
				}),
				getPackage: (id: string) => Option.fromNullable(packages.get(id)),
				listPackages: () => Array.from<string>(packages.keys()),
			};
		}),
	},
) {}
