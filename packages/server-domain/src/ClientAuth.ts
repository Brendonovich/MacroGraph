import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";

import * as Realtime from "./Realtime";

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
