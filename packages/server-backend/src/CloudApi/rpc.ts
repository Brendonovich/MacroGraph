import { CloudAuth } from "@macrograph/server-domain";
import { Effect, Mailbox, Option, Schedule, SubscriptionRef } from "effect";

import { CloudAPIClient } from "./ApiClient";
import { CloudApiAuthState } from "./AuthState";

export const CloudRpcsLive = CloudAuth.Rpcs.toLayer(
	Effect.gen(function* () {
		const { api, token } = yield* CloudAPIClient;
		const authState = yield* CloudApiAuthState;

		return {
			CloudLogin: Effect.fn(function* () {
				const mailbox =
					yield* Mailbox.make<(typeof CloudAuth.CloudLoginEvent)["Type"]>();

				yield* Effect.gen(function* () {
					const data = yield* api
						.createDeviceCodeFlow()
						.pipe(Effect.catchAll(() => new CloudAuth.CloudApiError()));

					yield* mailbox.offer({
						type: "started",
						verificationUrlComplete: data.verification_uri_complete,
					});

					const grant = yield* api
						.performAccessTokenGrant({
							urlParams: {
								device_code: data.device_code,
								grant_type: "urn:ietf:params:oauth:grant-type:device_code",
							},
						})
						.pipe(
							Effect.catchAll((error) => {
								if (error._tag === "DeviceFlowError") return Effect.fail(error);
								return Effect.dieMessage(
									"Failed to perform access token grant",
								);
							}),
							Effect.retry({
								schedule: Schedule.fixed(3000),
								while: (error) => error.code === "authorization_pending",
							}),
							Effect.orDie,
						);

					yield* SubscriptionRef.set(token, Option.some(grant.access_token));

					yield* authState.refetch;

					yield* mailbox.offer({ type: "finished" });
				}).pipe(Effect.forkScoped);

				return mailbox;
			}),
		};
	}),
);
