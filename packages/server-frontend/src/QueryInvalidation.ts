import { Effect } from "effect";
import { QueryClient } from "@tanstack/solid-query";

export class TSQueryClient extends Effect.Service<TSQueryClient>()(
	"TSQueryClient",
	{
		sync: () => {
			const client = new QueryClient({
				defaultOptions: { queries: { retry: false } },
			});

			return client;
		},
	},
) {}

export class QueryInvalidation extends Effect.Service<QueryInvalidation>()(
	"QueryInvalidation",
	{
		effect: Effect.gen(function* () {
			const queryClient = yield* TSQueryClient;

			return {
				invalidateUser: () => {
					queryClient.invalidateQueries({ queryKey: ["user"] });
				},
			};
		}),
		dependencies: [TSQueryClient.Default],
	},
) {}
