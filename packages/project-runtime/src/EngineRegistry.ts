import { Effect } from "effect";
import type { Package } from "@macrograph/project-domain";

import type { EngineInstance } from "./EngineInstance";

export namespace EngineRegistry {
	export class EngineRegistry extends Effect.Service<EngineRegistry>()(
		"EngineRegistry",
		{
			effect: Effect.gen(function* () {
				return {
					engines: new Map<Package.Id, EngineInstance.EngineInstance>(),
				};
			}),
		},
	) {}
}
