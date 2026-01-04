import { Effect, HashMap, Ref } from "effect";
import type { IO, Node } from "@macrograph/project-domain";

export interface NodeIO {
	readonly shape: unknown;
	readonly inputs: Array<IO.InputPort>;
	readonly outputs: Array<IO.OutputPort>;
}

export class NodesIOStore extends Effect.Service<NodesIOStore>()(
	"NodesIOStore",
	{
		effect: Effect.gen(function* () {
			const storeRef = yield* Ref.make(
				HashMap.make<ReadonlyArray<[Node.Id, NodeIO]>>(),
			);

			return {
				getForNode: (nodeId: Node.Id) =>
					storeRef.pipe(Effect.map(HashMap.get(nodeId))),
				getAll: Effect.flatten(Effect.succeed(storeRef)),
				setForNode: (nodeId: Node.Id, nodeIO: NodeIO) =>
					storeRef.pipe(Ref.update((map) => HashMap.set(map, nodeId, nodeIO))),
			};
		}),
	},
) {}
