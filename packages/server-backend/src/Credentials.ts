import { Effect } from "effect";
import { Credential, Policy } from "@macrograph/server-domain";
import { Credentials } from "@macrograph/project-backend";

import { ServerPolicy } from "./ServerPolicy";

export const CredentialsRpcsLive = Credential.Rpcs.toLayer(
	Effect.gen(function* () {
		const credentials = yield* Credentials;
		const serverPolicy = yield* ServerPolicy;

		const transformCredentialRequest = (e: typeof credentials.get) =>
			e.pipe(
				Policy.withPolicy(serverPolicy.isOwner),
				Effect.catchIf(
					(v) =>
						!(v._tag === "NoRegistrationError" || v._tag === "PolicyDenied"),
					(e) => Effect.die(null),
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
