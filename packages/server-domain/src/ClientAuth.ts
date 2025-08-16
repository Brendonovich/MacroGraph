import { Rpc, RpcGroup, RpcMiddleware } from "@effect/rpc";
import { Schema } from "effect";

import * as Realtime from "./Realtime";
import { CurrentUser } from "./Permissions";

export const CloudLoginEvent = Schema.Union(
	Schema.Struct({
		type: Schema.Literal("started"),
		verificationUrlComplete: Schema.String,
	}),
	Schema.Struct({
		type: Schema.Literal("finished"),
		jwt: Schema.String,
	}),
);
export type CloudLoginEvent = Schema.Schema.Type<typeof CloudLoginEvent>;

export const Rpcs = RpcGroup.make(
	Rpc.make("ClientLogin", {
		stream: true,
		success: CloudLoginEvent,
	}),
	Rpc.make("Identify", {
		payload: Schema.Struct({
			jwt: Schema.String,
		}),
	}),
).middleware(Realtime.ConnectionRpcMiddleware);

export class UnauthenticatedError extends Schema.TaggedError<UnauthenticatedError>()(
	"UnauthenticatedError",
	{},
) {}

export class ClientAuthRpcMiddleware extends RpcMiddleware.Tag<ClientAuthRpcMiddleware>()(
	"ClientAuthRpcMiddleware",
	{ provides: CurrentUser, failure: UnauthenticatedError },
) {}
