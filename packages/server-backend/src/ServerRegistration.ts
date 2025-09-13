import {
	Cache,
	Effect,
	Mailbox,
	Option,
	Schedule,
	SubscriptionRef,
} from "effect";
import type { RawJWT } from "@macrograph/web-domain";

import { Persistence } from "./Persistence";
import { CloudApi } from "./CloudApi";
import { getRealtimeConnection } from "./Realtime";
import { Policy } from "@macrograph/server-domain";

type RegistrationEvent =
	| {
			type: "started";
			verificationUrlComplete: string;
	  }
	| { type: "completed" };

export class ServerRegistration extends Effect.Service<ServerRegistration>()(
	"ServerRegistration",
	{
		effect: Effect.gen(function* () {
			const persistence = yield* Persistence;
			const cloudApi = yield* CloudApi;

			const tokenRef = yield* SubscriptionRef.make<Option.Option<RawJWT>>(
				Option.fromNullable(persistence.getKey("api")),
			);

			const registration = yield* Cache.make({
				capacity: 1,
				timeToLive: "1 hour",
				lookup: (_: void) =>
					Effect.gen(function* () {
						const token = yield* tokenRef.get;
						if (Option.isNone(token)) return Option.none();

						const apiClient = yield* cloudApi.makeClient(token);

						return yield* apiClient.getServerRegistration().pipe(
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
				const api = yield* cloudApi.makeClient(Option.none());
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

					yield* SubscriptionRef.set(tokenRef, Option.some(grant.token));
					yield* persistence.setKey("api", grant.token);

					yield* registration.refresh();

					yield* mailbox.offer({ type: "completed" });
				}).pipe(Effect.forkScoped);

				return mailbox;
			});

			return {
				get: registration.get(),
				remove: Effect.gen(function* () {
					yield* SubscriptionRef.set(tokenRef, Option.none());
					yield* registration.refresh();
				}),
				start,
			};
		}),
		dependencies: [Persistence.Default, CloudApi.Default],
	},
) {}

export class ServerRegistrationPolicy extends Effect.Service<ServerRegistrationPolicy>()(
	"ServerRegistrationPolicy",
	{
		effect: Effect.gen(function* () {
			const serverRegistration = yield* ServerRegistration;

			return {
				isOwner: Policy.policy(() =>
					Effect.gen(function* () {
						const registration = yield* serverRegistration.get;
						if (Option.isNone(registration)) return true;

						const connectionAuth = yield* getRealtimeConnection.pipe(
							Effect.map(Option.andThen((v) => v.auth)),
						);
						if (
							Option.isSome(connectionAuth) &&
							connectionAuth.value.userId === registration.value.ownerId
						)
							return true;

						return false;
					}),
				),
			};
		}),
		dependencies: [ServerRegistration.Default],
	},
) {}
