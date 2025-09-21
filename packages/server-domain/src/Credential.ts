import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { PolicyDeniedError } from "./Policy";
import { Realtime } from ".";

export class Credential extends Schema.Class<Credential>("Credential")({
	providerId: Schema.String,
	providerUserId: Schema.String,
	displayName: Schema.NullOr(Schema.String),
}) {}

export class NoRegistrationError extends Schema.TaggedError<NoRegistrationError>(
	"NoRegistrationError",
)("NoRegistrationError", {}) {}

export const Rpcs = RpcGroup.make(
	Rpc.make("GetCredentials", {
		success: Schema.Array(Credential),
		error: Schema.Union(NoRegistrationError, PolicyDeniedError),
	}),
	Rpc.make("RefetchCredentials", {
		success: Schema.Array(Credential),
		error: Schema.Union(NoRegistrationError, PolicyDeniedError),
	}),
).middleware(Realtime.ConnectionRpcMiddleware);
