import { CloudAuth, Policy } from "@macrograph/server-domain";
import { Effect, Option } from "effect";

import { ServerRegistration } from "../ServerRegistration";
import { ServerPolicy } from "../ServerPolicy";

export const CloudRpcsLive = CloudAuth.Rpcs.toLayer(
	Effect.gen(function* () {
		const serverRegistration = yield* ServerRegistration;
		const policy = yield* ServerPolicy;

		return {
			StartServerRegistration: () =>
				Effect.gen(function* () {
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
