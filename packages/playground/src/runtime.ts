import { type Rpc, type RpcClient, RpcTest } from "@effect/rpc";
import { ProjectPackages } from "@macrograph/project-backend";
import {
	GetPackageRpcClient,
	PackageClients,
} from "@macrograph/project-frontend";
import {
	Effect,
	Layer,
	type ManagedRuntime,
	Match,
	Option,
	Stream,
} from "effect";
import { createContext, useContext } from "solid-js";

import { BackendLayers, PlaygroundBackend } from "./backend";
import { FrontendLayers } from "./frontend";

export class PlaygroundRealtime extends Effect.Service<PlaygroundRealtime>()(
	"PlaygroundRealtime",
	{
		scoped: Effect.gen(function* () {
			const { eventStream } = yield* PlaygroundBackend;
			const pkgClients = yield* PackageClients;

			const tagType = Match.discriminator("type");

			yield* eventStream.pipe(
				Stream.runForEach((data) => {
					return Match.value(data).pipe(
						tagType("packageStateChanged", (data) =>
							pkgClients.getPackage(data.package).pipe(
								Option.map((pkg) => pkg.notifySettingsChange),
								Effect.transposeOption,
							),
						),
						Match.orElse(() => Effect.void),
					);
				}),
				Effect.forkScoped,
			);

			return {};
		}),
		dependencies: [PlaygroundBackend.Default, PackageClients.Default],
	},
) {}

export const RuntimeLayers = Layer.empty.pipe(
	Layer.merge(PlaygroundRealtime.Default),
	Layer.merge(FrontendLayers),
	Layer.provideMerge(BackendLayers),
	Layer.provideMerge(
		Layer.unwrapEffect(
			Effect.gen(function* () {
				const packages = yield* ProjectPackages;

				const clients = new Map<string, RpcClient.RpcClient<Rpc.Any>>();

				return Layer.succeed(
					GetPackageRpcClient,
					Effect.fnUntraced(function* (id, _rpcs) {
						if (clients.get(id)) return clients.get(id)!;

						const pkg = packages.get(id)?.rpc ?? Option.none();

						if (Option.isNone(pkg)) throw new Error("Pacakge not found");

						const client = yield* RpcTest.makeClient(pkg.value.defs).pipe(
							Effect.provide(pkg.value.layer),
						);

						clients.set(id, client);

						return client;
					}),
				);
			}),
		),
	),
	Layer.provideMerge(ProjectPackages.Default),
	Layer.provideMerge(Layer.scope),
);

export type EffectRuntime = ManagedRuntime.ManagedRuntime<
	Layer.Layer.Success<typeof RuntimeLayers>,
	Layer.Layer.Error<typeof RuntimeLayers>
>;

export const EffectRuntimeContext = createContext<EffectRuntime>();

export function useEffectRuntime() {
	const ctx = useContext(EffectRuntimeContext);
	if (!ctx)
		throw new Error(
			"useEffectRuntime must be used within EffectRuntimeContext.Provider",
		);

	return ctx;
}

export function useService<T>(
	service: Effect.Effect<
		T,
		never,
		ManagedRuntime.ManagedRuntime.Context<EffectRuntime>
	>,
) {
	const runtime = useEffectRuntime();

	return runtime.runSync(service);
}
