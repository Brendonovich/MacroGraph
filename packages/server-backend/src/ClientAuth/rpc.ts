import { Effect, Mailbox, Option } from "effect";
import { CloudApiClient } from "@macrograph/project-runtime";
import {
	CloudAuth,
	ClientAuth as DClientAuth,
} from "@macrograph/server-domain";

import { getRealtimeConnection } from "../Realtime";
import { ClientAuth } from "./ClientAuth";

export const ClientAuthRpcsLive = DClientAuth.Rpcs.toLayer(
	Effect.gen(function* () {
		const cloud = yield* CloudApiClient.CloudApiClient;
		const clientAuth = yield* ClientAuth;

		return {
			ClientLogin: Effect.fn(function* () {
				const mailbox = yield* Mailbox.make<DClientAuth.CloudLoginEvent>();

				yield* clientAuth
					.start(mailbox)
					.pipe(Effect.ensuring(mailbox.end), Effect.forkScoped);

				return mailbox;
			}),
			GetUser: Effect.fn(function* () {
				const connection = yield* getRealtimeConnection;
				const connectionAuth = Option.andThen(connection, (c) => c.auth);

				if (Option.isNone(connectionAuth)) return Option.none();

				return yield* cloud.getUser().pipe(
					Effect.catchAll(() => new CloudAuth.CloudApiError()),
					Effect.map(Option.map((u) => ({ name: u.email.split("@")[0]! }))),
					Effect.provideService(
						CloudApiClient.Auth,
						Effect.succeed(
							Option.some({
								clientId: "macrograph-server",
								token: connectionAuth.value.jwt.accessToken,
							}),
						),
					),
				);
			}),
		};
	}),
);
