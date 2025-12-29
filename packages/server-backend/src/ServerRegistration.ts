import {
	Cache,
	Console,
	Context,
	Effect,
	Layer,
	Mailbox,
	Option,
	Schedule,
} from "effect";
import { CloudApiClient } from "@macrograph/project-runtime";
import type { RawJWT } from "@macrograph/web-domain";

import { ServerConfig } from "./ServerConfig";

type RegistrationEvent =
	| { type: "started"; verificationUrlComplete: string }
	| { type: "completed" };

export class ServerRegistrationToken extends Context.Tag(
	"@macrograph/server-backend/ServerRegistrationToken",
)<
	ServerRegistrationToken,
	{
		get: Effect.Effect<Option.Option<RawJWT>>;
		set: (v: Option.Option<RawJWT>) => Effect.Effect<void>;
	}
>() {
	static layerServerConfig = Layer.effect(
		ServerRegistrationToken,
		Effect.gen(function* () {
			const serverConfig = yield* ServerConfig.ServerConfig;

			return {
				get: serverConfig.get.pipe(
					Effect.map((c) => c.serverRegistrationToken),
				),
				set: (v: Option.Option<RawJWT>) =>
					serverConfig.update((value) => ({
						...value,
						serverRegistrationToken: v,
					})),
			};
		}),
	);
}

export class ServerRegistration extends Effect.Service<ServerRegistration>()(
	"ServerRegistration",
	{
		effect: Effect.gen(function* () {
			const registrationToken = yield* ServerRegistrationToken;
			const cloud = yield* CloudApiClient.CloudApiClient;

			const registration = yield* Cache.make({
				capacity: 1,
				timeToLive: "1 hour",
				lookup: (_: void) =>
					Effect.gen(function* () {
						const tokenValue = yield* registrationToken.get;
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
				const mailbox = yield* Mailbox.make<RegistrationEvent>();

				yield* Effect.gen(function* () {
					const data = yield* cloud.startServerRegistration();

					yield* Effect.log(`Starting server registration '${data.id}'`);

					yield* mailbox.offer({
						type: "started",
						verificationUrlComplete: data.verification_uri_complete,
					});
					const grant = yield* cloud
						.performServerRegistration({ payload: { id: data.id } })
						.pipe(
							Effect.zipLeft(
								Effect.log(
									`Attempting to perform server registration '${data.id}'`,
								),
							),
							Effect.catchAll((error) => {
								if (error._tag === "ServerRegistrationError")
									return Effect.fail(error);
								console.log(error);
								return Effect.dieMessage(
									`Failed to perform access token grant: ${error}`,
								);
							}),
							Effect.retry({
								schedule: Schedule.fixed(3000),
								while: (error) => error.code === "authorization_pending",
							}),
							Effect.tapError(Console.log),
							Effect.tapDefect(Console.log),
							Effect.orDie,
						);

					yield* Effect.log("Access token grant performed");

					yield* registrationToken.set(Option.some(grant.token));
					yield* registration.refresh();

					yield* mailbox.offer({ type: "completed" });
				}).pipe(Effect.forkScoped);

				return mailbox;
			}).pipe(Effect.withSpan("ServerRegistration.start"));

			return {
				get: registration.get(),
				remove: Effect.gen(function* () {
					yield* registrationToken.set(Option.none());
					yield* registration.refresh();
				}),
				start,
			};
		}),
	},
) {}
