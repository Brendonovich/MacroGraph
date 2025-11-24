import { Effect } from "effect";

export class NodeRequests extends Effect.Service<NodeRequests>()(
	"NodeRequests",
	{
		effect: Effect.sync(() => {
			return {};
		}),
	},
) {}
