import { Graph, Node } from "@macrograph/project-domain";
import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";

import * as Realtime from "./Realtime";

export const Rpcs = RpcGroup.make(
	Rpc.make("SetMousePosition", {
		payload: Schema.Struct({
			graph: Graph.Id,
			position: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
		}),
	}),
	Rpc.make("SetSelection", {
		payload: {
			value: Schema.NullOr(
				Schema.Struct({
					graph: Graph.Id,
					nodes: Schema.Array(Node.Id),
				}),
			),
		},
	}),
).middleware(Realtime.ConnectionRpcMiddleware);
