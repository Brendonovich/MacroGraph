import { Effect } from "effect";
import { createSignal } from "solid-js";

export class ConnectedClientsState extends Effect.Service<ConnectedClientsState>()(
	"ConnectedClientsState",
	{
		scoped: Effect.gen(function* () {
			const [count, setCount] = createSignal(0);

			return {
				count,
				updateCount: (newCount: number) => {
					setCount(newCount);
				},
			};
		}),
	},
) {}
