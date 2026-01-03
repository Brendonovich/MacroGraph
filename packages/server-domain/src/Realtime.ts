import { RpcMiddleware } from "@effect/rpc";
import { Context, Schema } from "effect";
import { Actor } from "@macrograph/project-domain";

export const ConnectionId = Schema.Number.pipe(
	Schema.brand("Realtime/ConnectionId"),
);
export type ConnectionId = Schema.Schema.Type<typeof ConnectionId>;

export class Connection extends Context.Tag("RealtimeConnection")<
	Connection,
	{ id: ConnectionId }
>() {}

export class ConnectionRpcMiddleware extends RpcMiddleware.Tag<ConnectionRpcMiddleware>()(
	"ConnectionRpcMiddleware",
	{ provides: Connection, requiredForClient: true },
) {}

export class CurrentActorRpcMiddleware extends RpcMiddleware.Tag<CurrentActorRpcMiddleware>()(
	"CurrentActorRpcMiddleware",
	{ provides: Actor.Current },
) {}
