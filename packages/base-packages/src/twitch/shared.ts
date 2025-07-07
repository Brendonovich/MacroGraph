import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema as S } from "effect";

export const RPCS = RpcGroup.make().add(
	Rpc.make("ConnectEventSub", {
		payload: S.Struct({
			accountId: S.String,
		}),
	}),
	Rpc.make("DisconnectEventSub", {
		payload: S.Struct({
			accountId: S.String,
		}),
	}),
);

export const STATE = S.Union(
	S.Struct({
		accounts: S.Array(
			S.Struct({
				id: S.String,
				displayName: S.String,
				eventSubSocket: S.Union(
					S.Struct({
						state: S.Literal("disconnected"),
					}),
					S.Struct({
						state: S.Literal("connecting"),
					}),
					S.Struct({
						state: S.Literal("connected"),
					}),
				),
			}),
		),
	}),
);
