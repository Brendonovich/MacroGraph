import { Effect } from "effect";
import type { Graph, Node } from "@macrograph/project-domain";
import { createStore } from "solid-js/store";

export type PresenceClient = {
	name: string;
	colour: string;
	mouse?: { graph: Graph.Id; x: number; y: number };
	selection?: { graph: Graph.Id; nodes: Node.Id[] };
};

export class PresenceClients extends Effect.Service<PresenceClients>()(
	"PresenceClients",
	{
		scoped: Effect.gen(function* () {
			const [presenceClients, setPresence] = createStore<
				Record<number, PresenceClient>
			>({});

			return {
				presenceClients,
				updatePresence: (data: Record<string, any>) => {
					// Convert string keys to numbers for client IDs
					const convertedData: Record<number, PresenceClient> = {};
					for (const [key, value] of Object.entries(data)) {
						const clientId = Number.isInteger(parseInt(key, 10))
							? parseInt(key, 10)
							: 0;
						if (clientId > 0) {
							convertedData[clientId] = value as PresenceClient;
						}
					}
					setPresence(convertedData);
				},
			};
		}),
	},
) {}
