import { Effect, Layer } from "effect";
import { SubscribableCache } from "@macrograph/project-domain/updated";

import { CloudApiClient } from "./CloudApi";

// import { ServerRegistrationToken } from "./ServerRegistration";
// import { ServerPolicy } from "./ServerPolicy";

export const make = Effect.gen(function* () {
	const cloud = yield* CloudApiClient.CloudApiClient;

	return yield* SubscribableCache.make({
		capacity: 1,
		timeToLive: "1 minute",
		lookup: cloud.getCredentials(),
		// Effect.gen(function* () {
		// 	// if (!(yield* cloud.hasToken))
		// 	// 	return yield* new Credential.NoRegistrationError();
		// 	return ;
		// }),
	});
});

export class CredentialsStore extends Effect.Tag("CredentialsStore")<
	CredentialsStore,
	Effect.Effect.Success<typeof make>
>() {}

export const layer = Layer.effect(CredentialsStore, make);
