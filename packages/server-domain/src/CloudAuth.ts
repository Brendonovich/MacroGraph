import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";

import { PolicyDeniedError } from "./Policy";
import { ConnectionRpcMiddleware } from "./Realtime";

export const CloudLoginEvent = Schema.Union(
	Schema.Struct({
		type: Schema.Literal("started"),
		verificationUrlComplete: Schema.String,
	}),
	Schema.Struct({
		type: Schema.Literal("completed"),
	}),
);

export class CloudApiError extends Schema.TaggedError<CloudApiError>(
	"CloudApiError",
)("CloudApiError", {}) {}

export const Rpcs = RpcGroup.make(
	Rpc.make("StartServerRegistration", {
		stream: true,
		success: CloudLoginEvent,
		error: Schema.Union(CloudApiError, PolicyDeniedError),
	}),
	Rpc.make("RemoveServerRegistration", {
		error: Schema.Union(CloudApiError, PolicyDeniedError),
	}),
	Rpc.make("GetServerRegistration", {
		success: Schema.Option(Schema.Struct({ ownerId: Schema.String })),
		error: Schema.Union(CloudApiError, PolicyDeniedError),
	}),
).middleware(ConnectionRpcMiddleware);
