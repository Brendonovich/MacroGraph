import type { HttpApp } from "@effect/platform";
import type { Package } from "@macrograph/domain";
import { Effect, type Option, type Queue, type Scope } from "effect";

export type PackageEntry = {
	pkg: Package;
	state: Option.Option<{
		get: Effect.Effect<any>;
		changes: Effect.Effect<Queue.Dequeue<void>, never, Scope.Scope>;
	}>;
	rpcServer: Option.Option<HttpApp.Default<never, Scope.Scope>>;
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
