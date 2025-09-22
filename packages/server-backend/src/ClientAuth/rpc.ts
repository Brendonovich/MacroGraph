import { ClientAuth, CloudAuth, Realtime } from "@macrograph/server-domain";
import { Effect, Mailbox, Option, Schedule, Schema } from "effect";

import { ClientAuthJWT, ClientAuthJWTFromEncoded } from "./ClientAuthJWT";
import { getRealtimeConnection, RealtimeConnections } from "../Realtime";
import { CloudApi, CloudApiToken } from "../CloudApi";

export const ClientAuthRpcsLive = ClientAuth.Rpcs.toLayer(
	Effect.gen(function* () {
		const connections = yield* RealtimeConnections;
		const cloud = yield* CloudApi;

		return {
			ClientLogin: Effect.fn(function* () {
				const connection = yield* Realtime.Connection;
				const mailbox = yield* Mailbox.make<ClientAuth.CloudLoginEvent>();

				yield* Effect.gen(function* () {
					const data = yield* cloud.client
						.createDeviceCodeFlow()
						.pipe(Effect.catchAll(() => new CloudAuth.CloudApiError()));

					yield* mailbox.offer({
						type: "started",
						verificationUrlComplete: data.verification_uri_complete,
					});

					yield* Effect.log(
						`Starting access token grant check for session '${data.device_code}'`,
					);

					const grant = yield* cloud.client
						.performAccessTokenGrant({
							urlParams: {
								device_code: data.device_code,
								grant_type: "urn:ietf:params:oauth:grant-type:device_code",
							},
						})
						.pipe(
							Effect.catchAll((error) => {
								if (error._tag === "DeviceFlowError") return Effect.fail(error);
								return mailbox.end.pipe(
									Effect.zipRight(
										Effect.dieMessage("Failed to perform access token grant"),
									),
								);
							}),
							Effect.retry({
								schedule: Schedule.fixed(3000),
								while: (error) => error.code === "authorization_pending",
							}),
							Effect.orDie,
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
					).pipe(Effect.map(ClientAuth.EncodedJWT.make));

					const cloudApi = yield* cloud.makeClient.pipe(
						Effect.provide(
							CloudApiToken.makeContext(Option.some(grant.access_token)),
						),
					);

					const user = yield* cloudApi
						.getUser()
						.pipe(Effect.catchAll(() => new CloudAuth.CloudApiError()));

					connections.set(connection.id, {
						auth: Option.map(user, (u) => ({
							userId: u.id,
							email: u.email,
							jwt,
						})),
					});

					yield* mailbox.offer({ type: "finished", jwt: encodedJwt });
				}).pipe(Effect.forkScoped);

				return mailbox;
			}),
			GetUser: Effect.fn(function* () {
				const connection = yield* getRealtimeConnection;
				const connectionAuth = Option.andThen(connection, (c) => c.auth);

				if (Option.isNone(connectionAuth)) return Option.none();

				const cloudApi = yield* cloud.makeClient.pipe(
					Effect.provide(
						CloudApiToken.makeContext(
							Option.some(connectionAuth.value.jwt.accessToken),
						),
					),
				);

				return yield* cloudApi.getUser().pipe(
					Effect.catchAll(() => new CloudAuth.CloudApiError()),
					Effect.map(Option.map((u) => ({ name: u.email.split("@")[0]! }))),
				);
			}),
		};
	}),
);
