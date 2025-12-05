import {
	Cache,
	Effect,
	Mailbox,
	Option,
	Schedule,
	SubscriptionRef,
} from "effect";
import { CloudApiClient } from "@macrograph/project-runtime";
import type { RawJWT } from "@macrograph/web-domain";

import { Persistence } from "./Persistence";

type RegistrationEvent =
	| { type: "started"; verificationUrlComplete: string }
	| { type: "completed" };

export class ServerRegistrationToken extends Effect.Service<ServerRegistrationToken>()(
	"ServerRegistrationToken",
	{
		effect: Effect.gen(function* () {
			const persistence = yield* Persistence;
			const ref = yield* SubscriptionRef.make<Option.Option<RawJWT>>(
				Option.fromNullable(persistence.getKey("api")),
			);

			return {
				ref,
				set: (v: Option.Option<RawJWT>) =>
					Effect.gen(function* () {
						if (Option.isSome(v))
							yield* persistence
								.setKey("api", v.value)
								.pipe(Effect.catchAll(() => Effect.void));
						else
							yield* persistence
								.setKey("api", null)
								.pipe(Effect.catchAll(() => Effect.void));

						yield* SubscriptionRef.set(ref, v);
					}),
			};
		}),
		dependencies: [Persistence.Default],
	},
) {}

export class ServerRegistration extends Effect.Service<ServerRegistration>()(
	"ServerRegistration",
	{
		effect: Effect.gen(function* () {
			const cloud = yield* CloudApiClient.CloudApiClient;
			const token = yield* ServerRegistrationToken;

			const registration = yield* Cache.make({
				capacity: 1,
				timeToLive: "1 hour",
				lookup: (_: void) =>
					Effect.gen(function* () {
						const tokenValue = yield* token.ref.get;
						if (Option.isNone(tokenValue)) return Option.none();

						return yield* cloud.getServerRegistration().pipe(
							Effect.map(Option.some),
							Effect.catchAll((e) =>
								Effect.gen(function* () {
									yield* Effect.logError(
										"Failed to fetch server registration",
										e,
									);

									return Option.none();
								}),
							),
						);
					}),
			});

			const start = Effect.gen(function* () {
				const api = yield* CloudApiClient.make();
				const mailbox = yield* Mailbox.make<RegistrationEvent>();

				yield* Effect.gen(function* () {
					const data = yield* api.startServerRegistration();

					yield* Effect.log(
						`Starting server registration with id '${data.id}'`,
					);

					yield* mailbox.offer({
						type: "started",
						verificationUrlComplete: data.verification_uri_complete,
					});
					const grant = yield* api
						.performServerRegistration({ payload: { id: data.id } })
						.pipe(
							Effect.catchAll((error) => {
								if (error._tag === "ServerRegistrationError")
									return Effect.fail(error);
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

					yield* Effect.log("Access token grant performed");

					yield* token.set(Option.some(grant.token));
					yield* registration.refresh();

					yield* mailbox.offer({ type: "completed" });
				}).pipe(Effect.forkScoped);

				return mailbox;
			});

			return {
				get: registration.get(),
				remove: Effect.gen(function* () {
					yield* token.set(Option.none());
					yield* registration.refresh();
				}),
				start,
			};
		}),
		dependencies: [ServerRegistrationToken.Default],
	},
) {}
