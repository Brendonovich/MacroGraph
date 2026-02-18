import { Effect, Layer } from "effect";
import { LookupRef } from "@macrograph/project-domain";

import { CloudApiClient } from "./CloudApi";

export const make = Effect.gen(function* () {
	const cloud = yield* CloudApiClient.CloudApiClient;

	return yield* LookupRef.make(cloud.getCredentials());
});

export class CredentialsStore extends Effect.Tag("CredentialsStore")<
	CredentialsStore,
	Effect.Effect.Success<typeof make>
>() {}

export const layer = Layer.scoped(CredentialsStore, make);
