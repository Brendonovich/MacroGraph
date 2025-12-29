import { Effect, Option } from "effect";
import { Policy } from "@macrograph/project-domain";
import { CloudAuth } from "@macrograph/server-domain";

import { ServerPolicy } from "../ServerPolicy";
import { ServerRegistration } from "../ServerRegistration";

export const CloudRpcsLive = CloudAuth.Rpcs.toLayer(
	Effect.gen(function* () {
		const serverRegistration = yield* ServerRegistration;
		const policy = yield* ServerPolicy;

		return {
			StartServerRegistration: () =>
				Effect.gen(function* () {
					yield* Effect.log("Bruh?");

					if (yield* serverRegistration.get.pipe(Effect.map(Option.isSome)))
						return yield* new Policy.PolicyDeniedError();

					return yield* serverRegistration.start;
				}),
			RemoveServerRegistration: () =>
				serverRegistration.remove.pipe(Policy.withPolicy(policy.isOwner)),
			GetServerRegistration: () =>
				serverRegistration.get.pipe(
					Effect.flatMap(
						Option.match({
							onNone: () => Effect.succeed(Option.none()),
							onSome: (reg) =>
								Effect.succeed(Option.some(reg)).pipe(
									Policy.withPolicy(policy.isOwner),
								),
						}),
					),
				),
		};
	}),
);
