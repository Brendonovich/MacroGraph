import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { Credential, Policy } from "@macrograph/project-domain";

import * as Realtime from "./Realtime";

export * from "@macrograph/project-domain/Credential";

export class NoRegistrationError extends Schema.TaggedError<NoRegistrationError>()(
	"NoRegistrationError",
	{},
) {}

export const Rpcs = RpcGroup.make(
	Rpc.make("GetCredentials", {
		success: Schema.Array(Credential.Credential),
		error: Schema.Union(NoRegistrationError, Policy.PolicyDeniedError),
	}),
	Rpc.make("RefetchCredentials", {
		success: Schema.Array(Credential.Credential),
		error: Schema.Union(NoRegistrationError, Policy.PolicyDeniedError),
	}),
).middleware(Realtime.ConnectionRpcMiddleware);
