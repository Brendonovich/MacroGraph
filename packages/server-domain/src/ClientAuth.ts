import { Rpc, RpcGroup, RpcMiddleware } from "@effect/rpc";
import { Schema } from "effect";

import * as CloudAuth from "./CloudAuth";
import { CurrentUser } from "./Permissions";
import * as Realtime from "./Realtime";

export const EncodedJWT = Schema.String.pipe(
	Schema.brand("ClientAuth/EncodedJWT"),
);
export type EncodedClientAuthJWT = Schema.Schema.Type<typeof EncodedJWT>;

export const CloudLoginEvent = Schema.Union(
	Schema.Struct({
		type: Schema.Literal("started"),
		verificationUrlComplete: Schema.String,
	}),
	Schema.Struct({
		type: Schema.Literal("finished"),
		jwt: EncodedJWT,
	}),
);
export type CloudLoginEvent = Schema.Schema.Type<typeof CloudLoginEvent>;

export const Rpcs = RpcGroup.make(
	Rpc.make("ClientLogin", {
		stream: true,
		success: CloudLoginEvent,
	}),
	Rpc.make("GetUser", {
		success: Schema.OptionFromNullOr(
			Schema.Struct({
				name: Schema.String,
			}),
		),
		error: CloudAuth.CloudApiError,
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
