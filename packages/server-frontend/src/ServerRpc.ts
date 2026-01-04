import { Headers, Socket } from "@effect/platform";
import { BrowserSocket } from "@effect/platform-browser";
import { RpcClient, RpcMiddleware } from "@effect/rpc";
import { Effect } from "effect";
import {
	EditorRpcs,
	Realtime,
	RpcsSerialization,
	ServerRpcs,
} from "@macrograph/server-domain";

import { ProjectRealtime } from "./Project/Realtime";

const Rpcs = EditorRpcs.merge(ServerRpcs);

export class ServerRpc extends Effect.Service<ServerRpc>()("ServerRpc", {
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
