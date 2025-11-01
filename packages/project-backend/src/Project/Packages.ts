import type { HttpApp } from "@effect/platform";
import { Rpc, RpcGroup } from "@effect/rpc";
import type { Package } from "@macrograph/project-domain";
import { Effect, Layer, type Option, type Queue, type Scope } from "effect";

export type PackageEntry = {
	pkg: Package;
	state: Option.Option<{
		get: Effect.Effect<any>;
		changes: Effect.Effect<Queue.Dequeue<void>, never, Scope.Scope>;
	}>;
	rpcServer: Option.Option<HttpApp.Default<never, Scope.Scope>>;
	rpc: Option.Option<{
		defs: RpcGroup.RpcGroup<Rpc.Any>;
		layer: Layer.Layer<Rpc.ToHandler<Rpc.Any>, never, never>;
	}>;
};

export class ProjectPackages extends Effect.Service<ProjectPackages>()(
	"ProjectPackages",
	{
		effect: Effect.gen(function* () {
			const packages = new Map<string, PackageEntry>();

			return packages;
		}),
	},
) {}
