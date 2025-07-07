import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";

import * as Graph from "./Graph";
import * as Realtime from "./Realtime";
import { PackageMeta } from "./util";

export const Rpcs = RpcGroup.make(
	Rpc.make("GetProject", {
		success: Schema.Struct({
			name: Schema.String,
			graphs: Schema.Record({ key: Schema.String, value: Graph.Shape }),
			packages: Schema.Record({ key: Schema.String, value: PackageMeta }),
		}),
	}),
	Rpc.make("GetPackageSettings", {
		payload: { package: Schema.String },
		success: Schema.Any,
	}),
).middleware(Realtime.ConnectionRpcMiddleware);
