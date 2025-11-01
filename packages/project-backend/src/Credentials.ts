import { Credential, SubscribableCache } from "@macrograph/project-domain";
import { Effect, Stream } from "effect";

import { CloudApi } from "./CloudApi";
// import { ServerRegistrationToken } from "./ServerRegistration";
// import { ServerPolicy } from "./ServerPolicy";

export class Credentials extends Effect.Service<Credentials>()("Credentials", {
	effect: Effect.gen(function* () {
		// const registrationToken = yield* ServerRegistrationToken;
		const cloud = yield* CloudApi;

		const credentialsCache = yield* SubscribableCache.make({
			capacity: 1,
			timeToLive: "1 minute",
			lookup: Effect.gen(function* () {
				// if (!(yield* cloud.hasToken))
				// 	return yield* new Credential.NoRegistrationError();
				return yield* cloud.client.getCredentials();
			}),
		});

		// yield* registrationToken.ref.changes.pipe(
		// 	Stream.runForEach(() =>
		// 		credentialsCache.refresh.pipe(Effect.catchAll(() => Effect.void)),
		// 	),
		// 	Effect.fork,
		// );

		return credentialsCache;
	}),
	dependencies: [CloudApi.Default /* ServerRegistrationToken.Default */],
}) {}
