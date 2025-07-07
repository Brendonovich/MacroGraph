import { RpcMiddleware } from "@effect/rpc";
import { Context, type Option, Schema, type SubscriptionRef } from "effect";

export const ConnectionId = Schema.Number.pipe(
	Schema.brand("Realtime Client ID"),
);
export type ConnectionId = Schema.Schema.Type<typeof ConnectionId>;

export class Connection extends Context.Tag("RealtimeConnection")<
	Connection,
	{
		id: ConnectionId;
		authJwt: SubscriptionRef.SubscriptionRef<Option.Option<string>>;
	}
>() {}

export class ConnectionRpcMiddleware extends RpcMiddleware.Tag<ConnectionRpcMiddleware>()(
	"Middleware",
	{
		provides: Connection,
		requiredForClient: true,
	},
) {}
