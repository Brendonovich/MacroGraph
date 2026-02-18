import { Effect } from "effect";
import { LookupRef } from "@macrograph/project-domain";

import { CloudApiClient } from "./CloudApi";

export class CredentialsStore extends Effect.Service<CredentialsStore>()(
	"@macrograph/project-runtime/CredentialsStore",
	{
		scoped: Effect.gen(function* () {
			const cloud = yield* CloudApiClient.CloudApiClient;

			const ref = yield* LookupRef.make(
				Effect.zipRight(Effect.log("getCredentials"), cloud.getCredentials()),
			);

			return ref;
		}),
	},
) {}
