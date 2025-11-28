import type { Rpc, RpcClient, RpcGroup } from "@effect/rpc";
import { Context, Effect, Option, PubSub, type Scope, Stream } from "effect";
import type { SettingsProps } from "@macrograph/package-sdk/ui";
import { Package } from "@macrograph/project-domain/updated";
import { ReactiveMap } from "@solid-primitives/map";
import type { Component } from "solid-js";

export type PackageClient = Readonly<{
	rpcClient: RpcClient.RpcClient<RpcGroup.Rpcs<Rpc.Any>>;
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

export class GetPackageRpcClient extends Context.Tag("GetPackageRpcClient")<
	GetPackageRpcClient,
	<Rpcs extends Rpc.Any>(
		id: Package.Id,
		rpcs: RpcGroup.RpcGroup<Rpcs>,
	) => Effect.Effect<
		Option.Option<RpcClient.RpcClient<RpcGroup.Rpcs<Rpcs>>>,
		never,
		Scope.Scope
	>
>() {}

export class PackageClients extends Effect.Service<PackageClients>()(
	"PackageClients",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const getClient = yield* GetPackageRpcClient;

			const packages = new ReactiveMap<Package.Id, PackageClient>();

			return {
				registerPackageClient: Effect.fn(function* (
					id: Package.Id,
					module: PackageSettingsModule,
				) {
					const client = yield* getClient(id, module.Rpcs).pipe(
						Effect.flatten,
						Effect.catchTag(
							"NoSuchElementException",
							() => new Package.NotFound({ id }),
						),
					);

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
				getPackage: (id: Package.Id) => Option.fromNullable(packages.get(id)),
				listPackages: () => Array.from<Package.Id>(packages.keys()),
			};
		}),
	},
) {}
