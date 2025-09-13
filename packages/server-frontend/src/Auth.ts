import { Chunk, Effect, Option, Stream, SubscriptionRef } from "effect";

import { ProjectRpc } from "./Project/Rpc";
import { ClientAuth } from "./ClientAuth";

export class AuthActions extends Effect.Service<AuthActions>()("AuthActions", {
	effect: Effect.gen(function* () {
		const rpc = yield* ProjectRpc.client;
		const { jwt } = yield* ClientAuth;

		return {
			login: Effect.gen(function* () {
				const getFlowStatus = yield* rpc
					.ClientLogin()
					.pipe(Stream.toPull, Effect.map(Effect.orDie));

				const status = yield* getFlowStatus.pipe(
					Effect.map(Chunk.get(0)),
					Effect.map(Option.getOrThrow),
				);
				if (status.type !== "started")
					throw new Error("Flow status is not started");

				window.open(status.verificationUrlComplete);

				const complete = yield* getFlowStatus.pipe(
					Effect.map(Chunk.get(0)),
					Effect.map(Option.getOrThrow),
				);

				if (complete.type !== "finished")
					throw new Error("Flow status is not finished");

				yield* SubscriptionRef.set(jwt, Option.some(complete.jwt));
			}).pipe(Effect.scoped),
		};
	}),
	dependencies: [ProjectRpc.Default, ClientAuth.Default],
}) {}
