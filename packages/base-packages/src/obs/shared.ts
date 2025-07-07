import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema as S } from "effect";

export class ConnectionFailed extends S.TaggedError<ConnectionFailed>()(
	"ConnectionFailed",
	{},
) {}

export const RPCS = RpcGroup.make().add(
	Rpc.make("AddSocket", {
		payload: S.Struct({
			address: S.String,
			password: S.optional(S.String),
		}),
		error: ConnectionFailed,
	}),
	Rpc.make("RemoveSocket", {
		payload: S.Struct({ address: S.String }),
	}),
	Rpc.make("DisconnectSocket", {
		payload: S.Struct({ address: S.String }),
	}),
	Rpc.make("ConnectSocket", {
		payload: S.Struct({
			address: S.String,
			password: S.optional(S.String),
		}),
		error: ConnectionFailed,
	}),
);

export const STATE = S.Struct({
	connections: S.Array(
		S.Struct({
			address: S.String,
			password: S.optional(S.String),
			state: S.Union(
				S.Literal("connected"),
				S.Literal("connecting"),
				S.Literal("disconnected"),
			),
		}),
	),
});
