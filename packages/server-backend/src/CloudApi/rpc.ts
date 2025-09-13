import { CloudAuth, Policy } from "@macrograph/server-domain";
import { Effect } from "effect";

import {
	ServerRegistration,
	ServerRegistrationPolicy,
} from "../ServerRegistration";

export const CloudRpcsLive = CloudAuth.Rpcs.toLayer(
	Effect.gen(function* () {
		const serverRegistration = yield* ServerRegistration;
		const policy = yield* ServerRegistrationPolicy;

		return {
			StartServerRegistration: () =>
				Effect.gen(function* () {
					const mailbox = yield* serverRegistration.start.pipe(
						Policy.withPolicy(policy.isOwner),
					);

					return mailbox;
				}),
			RemoveServerRegistration: () =>
				serverRegistration.remove.pipe(Policy.withPolicy(policy.isOwner)),
			GetServerRegistration: () =>
				serverRegistration.get.pipe(Policy.withPolicy(policy.isOwner)),
		};
	}),
);
