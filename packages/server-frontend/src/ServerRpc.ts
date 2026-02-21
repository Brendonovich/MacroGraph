import { Headers, Socket } from "@effect/platform";
import { BrowserSocket } from "@effect/platform-browser";
import { RpcClient, RpcMiddleware } from "@effect/rpc";
import { Effect, Layer } from "effect";
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

		const socket = yield* Socket.makeWebSocket(
			Effect.sync(() => `/api/rpc?token=${encodeURIComponent(realtime.token)}`),
		).pipe(
			Effect.provide(BrowserSocket.layerWebSocketConstructor),
			Effect.map(Layer.succeed(Socket.Socket)),
		);

		const protocol = yield* RpcClient.makeProtocolSocket().pipe(
			Effect.provide(Layer.merge(RpcsSerialization, socket)),
			Effect.map(Layer.succeed(RpcClient.Protocol)),
		);

		const client = yield* RpcClient.make(Rpcs, { disableTracing: false }).pipe(
			Effect.provide(Layer.merge(mw, protocol)),
		);

		return { client };
	}),
	dependencies: [ProjectRealtime.Default],
}) {}
