import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema as S } from "effect";
import { Resource } from "@macrograph/package-sdk";

import { WebSocketUrl } from "./types";

export class ConnectionFailed extends S.TaggedError<ConnectionFailed>()(
	"ConnectionFailed",
	{ message: S.String },
) {}

export const ClientRpcs = RpcGroup.make(
	Rpc.make("AddWebSocket", {
		payload: S.Struct({
			url: WebSocketUrl,
			name: S.optional(S.String),
			connectOnStartup: S.optional(S.Boolean),
		}),
		error: ConnectionFailed,
	}),
	Rpc.make("RemoveWebSocket", { payload: S.Struct({ url: WebSocketUrl }) }),
	Rpc.make("ConnectWebSocket", {
		payload: S.Struct({ url: WebSocketUrl }),
		error: ConnectionFailed,
	}),
	Rpc.make("DisconnectWebSocket", { payload: S.Struct({ url: WebSocketUrl }) }),
);

export const RuntimeRpcs = RpcGroup.make(
	Rpc.make("SendMessage", {
		payload: S.Struct({ url: WebSocketUrl, data: S.String }),
	}),
);

export class ClientState extends S.Struct({
	connections: S.Array(
		S.Struct({
			name: S.optional(S.String),
			url: WebSocketUrl,
			state: S.Union(
				S.Literal("connected"),
				S.Literal("connecting"),
				S.Literal("disconnected"),
			),
		}),
	),
}) {}

export class WebSocketResource extends Resource.Tag("WebSocket")<WebSocketUrl>({
	name: "WebSocket Connection",
}) {}
