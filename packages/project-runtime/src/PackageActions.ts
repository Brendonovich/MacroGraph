import { Effect, RequestResolver } from "effect";
import { Package, type Request } from "@macrograph/project-domain";

import { EngineRegistry } from "./EngineRegistry.ts";
import { NodeExecution } from "./NodeExecution.ts";

export class PackageActions extends Effect.Service<PackageActions>()(
	"PackageActions",
	{
		effect: Effect.gen(function* () {
			const GetPackageEngineStateResolver = RequestResolver.fromEffect(
				(r: Request.GetPackageEngineState) =>
					Effect.gen(function* () {
						const { engines } = yield* EngineRegistry.EngineRegistry;

						const getState = engines.get(r.package)?.state;
						yield* Effect.log({ engines });
						if (!getState)
							return yield* new Package.NotFound({ id: r.package });

						return yield* getState.get;
					}),
			).pipe(
				RequestResolver.contextFromServices(EngineRegistry.EngineRegistry),
			);

			return { GetPackageEngineStateResolver };
		}),
		dependencies: [NodeExecution.Default],
	},
) {}
