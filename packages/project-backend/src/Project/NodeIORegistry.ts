import { Effect } from "effect";

import * as ProjectRuntime from "./ProjectRuntime.ts";

export class NodeIORegistry extends Effect.Service<NodeIORegistry>()(
	"NodeIORegistry",
	{
		effect: Effect.sync(() => {
			const generateNodeIO = Effect.fnUntraced(function* () {
				const runtime = yield* ProjectRuntime.Current;
			});

			return { generateNodeIO };
		}),
	},
) {}
