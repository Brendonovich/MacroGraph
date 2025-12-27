import { Chunk, Effect, Option, Stream } from "effect";

import { ServerRpc } from "./ServerRpc";

export class ServerRegistration extends Effect.Service<ServerRegistration>()(
	"ServerRegistration",
	{
		scoped: Effect.gen(function* () {
			const rpc = yield* ServerRpc.client;

			return {
				start: Effect.gen(function* () {
					const getFlowStatus = yield* rpc
						.StartServerRegistration()
						.pipe(Stream.toPull);

					const status = yield* getFlowStatus.pipe(
						Effect.map(Chunk.get(0)),
						Effect.map(Option.getOrThrow),
					);
					if (status.type !== "started")
						throw new Error("Flow status is not started");

					window.open(status.verificationUrlComplete);

					yield* getFlowStatus.pipe(
						Effect.map(Chunk.get(0)),
						Effect.map(Option.getOrThrow),
					);
				}).pipe(Effect.scoped),
			};
		}),
	},
) {}
