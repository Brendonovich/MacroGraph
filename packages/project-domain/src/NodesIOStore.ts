import { Effect, HashMap, Ref } from "effect";

import type { GeneratedNodeIO } from "./IO";
import type * as Node from "./Node";

export class NodesIOStore extends Effect.Service<NodesIOStore>()(
	"NodesIOStore",
	{
		effect: Effect.gen(function* () {
			const storeRef = yield* Ref.make(
				HashMap.make<ReadonlyArray<[Node.Id, GeneratedNodeIO]>>(),
			);

			return {
				getForNode: (nodeId: Node.Id) =>
					storeRef.pipe(Effect.map(HashMap.get(nodeId))),
				getAll: Effect.flatten(Effect.succeed(storeRef)),
				setForNode: (nodeId: Node.Id, nodeIO: GeneratedNodeIO) =>
					storeRef.pipe(Ref.update((map) => HashMap.set(map, nodeId, nodeIO))),
			};
		}),
	},
) {}
