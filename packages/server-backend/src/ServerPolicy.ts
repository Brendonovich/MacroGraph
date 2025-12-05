import { Effect, Option } from "effect";
import { Policy } from "@macrograph/server-domain";

import { getRealtimeConnection } from "./Realtime";
import { ServerRegistration } from "./ServerRegistration";

export class ServerPolicy extends Effect.Service<ServerPolicy>()(
	"ServerPolicy",
	{
		effect: Effect.gen(function* () {
			const serverRegistration = yield* ServerRegistration;

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
			};
		}),
		dependencies: [ServerRegistration.Default],
	},
) {}
