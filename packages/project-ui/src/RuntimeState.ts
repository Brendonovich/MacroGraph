import { Effect } from "effect";
import type { Package, Resource } from "@macrograph/project-domain";
import { createStore } from "solid-js/store";

export class RuntimeState extends Effect.Service<RuntimeState>()(
	"RuntimeState",
	{
		scoped: Effect.gen(function* () {
			const [state, setState] = createStore<{
				packageResources: Record<
					Package.Id,
					Record<string, Array<Resource.ResourceValue>>
				>;
			}>({ packageResources: {} });

			return { state, setState };
		}),
	},
) {}
