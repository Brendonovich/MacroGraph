import { SubscribableCache } from "@macrograph/domain";
import { Effect, Stream } from "effect";

import { CloudApiClient } from "./ApiClient";

export class CredentialsCache extends Effect.Service<CredentialsCache>()(
	"CredentialsCache",
	{
		effect: Effect.gen(function* () {
			const cloud = yield* CloudApiClient;

			const credentialsCache = yield* SubscribableCache.make({
				capacity: 1,
				timeToLive: "1 minute",
				lookup: cloud.api.getCredentials(),
			});

			yield* cloud.tokenChanges.pipe(
				Stream.runForEach(() =>
					credentialsCache.refresh.pipe(Effect.catchAll(() => Effect.void)),
				),
				Effect.fork,
			);

			return credentialsCache;
		}),
		dependencies: [CloudApiClient.Default],
	},
) {}
