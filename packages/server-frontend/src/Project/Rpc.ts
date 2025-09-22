import { Headers, Socket } from "@effect/platform";
import { BrowserSocket } from "@effect/platform-browser";
import { RpcClient, RpcMiddleware } from "@effect/rpc";
import { Realtime, Rpcs } from "@macrograph/server-domain";
import { RpcsSerialization } from "@macrograph/server-domain";
import { Effect } from "effect";

import { ProjectRealtime } from "./Realtime";

export class ProjectRpc extends Effect.Service<ProjectRpc>()("ProjectRpc", {
	accessors: true,
	scoped: Effect.gen(function* () {
		const realtime = yield* ProjectRealtime;

		const mw = RpcMiddleware.layerClient(
			Realtime.ConnectionRpcMiddleware,
			({ request }) =>
				Effect.succeed({
					...request,
					headers: Headers.set(
						request.headers,
						"realtime-id",
						realtime.id.toString(),
					),
				}),
		);

		return {
			client: yield* RpcClient.make(Rpcs, { disableTracing: false }).pipe(
				Effect.provide(mw),
				Effect.provideService(
					RpcClient.Protocol,
					yield* RpcClient.makeProtocolSocket().pipe(
						Effect.provide(RpcsSerialization),
						Effect.provideService(
							Socket.Socket,
							yield* Socket.makeWebSocket(
								`/api/rpc?token=${encodeURIComponent(realtime.token)}`,
							).pipe(Effect.provide(BrowserSocket.layerWebSocketConstructor)),
						),
					),
				),
			),
		};
	}),
	dependencies: [ProjectRealtime.Default],
}) {}
