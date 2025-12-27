import { Effect } from "effect";
import { Policy } from "@macrograph/project-domain";
import { CredentialsStore } from "@macrograph/project-runtime";
import { Credential } from "@macrograph/server-domain";

import { ServerPolicy } from "./ServerPolicy";

export const CredentialsRpcsLive = Credential.Rpcs.toLayer(
	Effect.gen(function* () {
		const credentials = yield* CredentialsStore.CredentialsStore;
		const serverPolicy = yield* ServerPolicy;

		const transformCredentialRequest = (e: typeof credentials.get) =>
			e.pipe(
				Policy.withPolicy(serverPolicy.isOwner),
				Effect.catchIf(
					(v) => !(v._tag === "PolicyDenied"),
					() => Effect.die(null),
				),
				Effect.map((v) =>
					v.map(
						(v) =>
							new Credential.Credential({
								providerId: v.provider,
								providerUserId: v.id,
								displayName: v.displayName,
							}),
					),
				),
			);

		return {
			GetCredentials: () => credentials.get.pipe(transformCredentialRequest),
			RefetchCredentials: () =>
				credentials.refresh.pipe(
					Effect.zipRight(credentials.get),
					transformCredentialRequest,
				),
		};
	}),
);
