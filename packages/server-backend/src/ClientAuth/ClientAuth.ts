import {
	Data,
	Effect,
	type Mailbox,
	Option,
	type Queue,
	Schedule,
	Schema,
} from "effect";
import { CloudApiClient } from "@macrograph/project-runtime";
import {
	CloudAuth,
	ClientAuth as DClientAuth,
	Realtime,
} from "@macrograph/server-domain";

import { RealtimeConnections } from "../Realtime";
import { ClientAuthJWT, ClientAuthJWTFromEncoded } from "./ClientAuthJWT";

export type ClientAuthEvent =
	| {
			type: "started";
			verificationUrlComplete: string;
	  }
	| {
			type: "finished";
			jwt: DClientAuth.EncodedJWT;
	  };

export class ClientAuthError extends Data.TaggedError("ClientAuthError")<{
	reason: "perform-failed";
	cause: unknown;
}> {}

export class ClientAuth extends Effect.Service<ClientAuth>()(
	"@macrograph/server-backend/ClientAuth",
	{
		effect: Effect.gen(function* () {
			const connections = yield* RealtimeConnections;
			const cloud = yield* CloudApiClient.CloudApiClient;

			const start = Effect.fn("ClientAuth.start")(function* (
				events: Mailbox.Mailbox<ClientAuthEvent>,
			) {
				const connection = yield* Realtime.Connection;

				const data = yield* cloud.createDeviceCodeFlow().pipe(
					Effect.tapError(Effect.log),
					Effect.catchAll(() => new CloudAuth.CloudApiError()),
				);

				yield* events.offer({
					type: "started",
					verificationUrlComplete: data.verification_uri_complete,
				});

				yield* Effect.log(
					`Starting access token grant check for session '${data.device_code}'`,
				);

				const grant = yield* cloud
					.performAccessTokenGrant({
						urlParams: {
							device_code: data.device_code,
							grant_type: "urn:ietf:params:oauth:grant-type:device_code",
						},
					})
					.pipe(
						Effect.retry({
							schedule: Schedule.fixed(3000),
							while: (error) =>
								error._tag === "DeviceFlowError" &&
								error.code === "authorization_pending",
						}),
						Effect.mapError(
							(e) =>
								new ClientAuthError({
									reason: "perform-failed",
									cause: e,
								}),
						),
					);

				yield* Effect.log(
					`Completed access token grant for user '${grant.userId}'`,
				);

				const jwt = new ClientAuthJWT({
					accessToken: grant.access_token,
					refreshToken: grant.refresh_token,
				});

				const encodedJwt = yield* Schema.encode(ClientAuthJWTFromEncoded)(
					jwt,
				).pipe(Effect.map(DClientAuth.EncodedJWT.make));

				const user = yield* cloud.getUser().pipe(
					Effect.catchAll(() => new CloudAuth.CloudApiError()),
					Effect.provideService(
						CloudApiClient.Auth,
						Effect.succeed(
							Option.some({
								clientId: "macrograph-server",
								token: grant.access_token,
							}),
						),
					),
				);

				connections.set(connection.id, {
					auth: Option.map(user, (u) => ({
						userId: u.id,
						email: u.email,
						jwt,
					})),
				});

				yield* events.offer({ type: "finished", jwt: encodedJwt });
			});

			return { start };
		}),
		dependencies: [RealtimeConnections.Default],
	},
) {}
