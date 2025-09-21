import { SubscribableCache } from "@macrograph/domain";
import { Effect, Stream } from "effect";
import { Credential, Policy } from "@macrograph/server-domain";

import { CloudApi } from "./CloudApi";
import { ServerRegistrationToken } from "./ServerRegistration";
import { ServerPolicy } from "./ServerPolicy";

export class Credentials extends Effect.Service<Credentials>()("Credentials", {
	effect: Effect.gen(function* () {
		const registrationToken = yield* ServerRegistrationToken;
		const cloud = yield* CloudApi;

		const credentialsCache = yield* SubscribableCache.make({
			capacity: 1,
			timeToLive: "1 minute",
			lookup: Effect.gen(function* () {
				if (!(yield* cloud.hasToken))
					return yield* new Credential.NoRegistrationError();
				return yield* cloud.client.getCredentials();
			}),
		});

		yield* registrationToken.ref.changes.pipe(
			Stream.runForEach(() =>
				credentialsCache.refresh.pipe(Effect.catchAll(() => Effect.void)),
			),
			Effect.fork,
		);

		return credentialsCache;
	}),
	dependencies: [CloudApi.Default, ServerRegistrationToken.Default],
}) {}

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
				credentials.refresh.pipe(transformCredentialRequest),
		};
	}),
);
