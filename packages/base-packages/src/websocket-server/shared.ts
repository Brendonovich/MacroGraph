import { Rpc, RpcGroup } from "@effect/rpc";
import { Context, type Effect, Schema as S } from "effect";
import { Resource } from "@macrograph/package-sdk";

import { ClientId, Host, Port, ServerId } from "./types";

export class ServerStartError extends S.TaggedError<ServerStartError>()(
	"ServerStartError",
	{ message: S.String },
) {}

export const ClientRpcs = RpcGroup.make(
	Rpc.make("StartServer", {
		payload: S.Struct({
			port: Port,
			host: S.optional(Host),
			displayName: S.optional(S.String),
		}),
		error: ServerStartError,
	}),
	Rpc.make("StopServer", { payload: S.Struct({ port: Port }) }),
	Rpc.make("RemoveServer", { payload: S.Struct({ port: Port }) }),
);

export const RuntimeRpcs = RpcGroup.make(
	Rpc.make("SendMessage", {
		payload: S.Struct({
			port: Port,
			client: S.optional(ClientId),
			data: S.String,
		}),
	}),
);

// Resource for each WebSocket server
export class ServerResource extends Resource.Tag("WebSocketServer")<Port>({
	name: "WebSocket Server",
}) {}

// Context tag for accessing runtime RPCs
export class WebSocketServerRpcs extends Context.Tag("WebSocketServerRpcs")<
	WebSocketServerRpcs,
	{
		SendMessage: ({
			port,
			client,
			data,
		}: {
			port: Port;
			client?: ClientId;
			data: string;
		}) => Effect.Effect<void>;
	}
>() {}

export class ClientState extends S.Struct({
	servers: S.Array(
		S.Struct({
			id: ServerId,
			port: Port,
			host: Host,
			displayName: S.optional(S.String),
			clientCount: S.Number,
			state: S.Union(
				S.Literal("running"),
				S.Literal("stopped"),
				S.Literal("error"),
			),
		}),
	),
}) {}
