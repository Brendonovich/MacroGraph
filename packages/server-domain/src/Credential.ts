import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { Credential } from "@macrograph/project-domain";

import { PolicyDeniedError } from "./Policy";
import * as Realtime from "./Realtime";

export * from "@macrograph/project-domain/Credential";

export class NoRegistrationError extends Schema.TaggedError<NoRegistrationError>()(
	"NoRegistrationError",
	{},
) {}

export const Rpcs = RpcGroup.make(
	Rpc.make("GetCredentials", {
		success: Schema.Array(Credential.Credential),
		error: Schema.Union(NoRegistrationError, PolicyDeniedError),
	}),
	Rpc.make("RefetchCredentials", {
		success: Schema.Array(Credential.Credential),
		error: Schema.Union(NoRegistrationError, PolicyDeniedError),
	}),
).middleware(Realtime.ConnectionRpcMiddleware);
