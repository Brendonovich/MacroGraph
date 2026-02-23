import { Config, Effect, Option } from "effect";
import { Policy } from "@macrograph/project-domain";

import { getRealtimeConnection } from "./Realtime";
import { ServerRegistration } from "./ServerRegistration";

export class ServerPolicy extends Effect.Service<ServerPolicy>()(
	"ServerPolicy",
	{
		effect: Effect.gen(function* () {
			const serverRegistration = yield* ServerRegistration;

			const adminEnvs = yield* Config.array(Config.string("MG_ADMIN_IDS")).pipe(
				Config.option,
			);

			return {
				isOwner: Policy.policy(() =>
					Effect.gen(function* () {
						const registration = yield* serverRegistration.get;
						if (Option.isNone(registration)) return false;

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
				isAdmin: Policy.policy(() =>
					Effect.gen(function* () {
						const registration = yield* serverRegistration.get;
						if (Option.isNone(registration)) return false;

						const connectionAuth = yield* getRealtimeConnection.pipe(
							Effect.map(Option.andThen((v) => v.auth)),
						);
						if (Option.isSome(connectionAuth)) {
							if (Option.isSome(registration))
								return (
									connectionAuth.value.userId === registration.value.ownerId
								);

							if (Option.isSome(adminEnvs))
								return adminEnvs.value.includes(connectionAuth.value.userId);
						}

						return false;
					}),
				),
			};
		}),
		dependencies: [ServerRegistration.Default],
	},
) {}
