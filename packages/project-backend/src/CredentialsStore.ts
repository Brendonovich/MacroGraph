import { Effect } from "effect";
import { SubscribableCache } from "@macrograph/project-domain";

import { CloudApi } from "./CloudApi";

// import { ServerRegistrationToken } from "./ServerRegistration";
// import { ServerPolicy } from "./ServerPolicy";

const make = () =>
	Effect.gen(function* () {
		const cloud = yield* CloudApi;

		return yield* SubscribableCache.make({
			capacity: 1,
			timeToLive: "1 minute",
			lookup: Effect.gen(function* () {
				// if (!(yield* cloud.hasToken))
				// 	return yield* new Credential.NoRegistrationError();
				return yield* cloud.client.getCredentials();
			}),
		});
	});

export class CredentialsStore extends Effect.Tag("CredentialsStore")<
	CredentialsStore,
	Effect.Effect.Success<ReturnType<typeof make>>
>() {}
