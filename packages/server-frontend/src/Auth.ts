import { Chunk, Effect, Stream, Option, SubscriptionRef } from "effect";
import { ProjectRpc } from "./Project/Rpc";

export class ClientAuth extends Effect.Service<ClientAuth>()("ClientAuth", {
	effect: Effect.gen(function* () {
		const rpc = yield* ProjectRpc.client;

		const jwt = yield* SubscriptionRef.make(Option.none<string>());

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

				yield* rpc.Identify({ jwt: complete.jwt });
			}).pipe(Effect.scoped),
			jwt,
		};
	}),
	dependencies: [ProjectRpc.Default],
}) {}
