export * as ClientAuth from "./ClientAuth";
export * as CloudAuth from "./CloudAuth";
export * as Credential from "./Credential";
export * from "./errors";
export * as ServerEvent from "./event";
export * from "./Permissions";
export * as Presence from "./Presence";
export * as Realtime from "./Realtime";
export * from "./util";

import { Rpc, RpcGroup, RpcSerialization } from "@effect/rpc";
import { Request } from "@macrograph/project-domain";

import * as ClientAuth from "./ClientAuth";
import * as CloudAuth from "./CloudAuth";
import * as Credential from "./Credential";
import * as Presence from "./Presence";
import { CurrentActorRpcMiddleware } from "./Realtime";

export const RequestRpcs = RpcGroup.make(
	Rpc.fromTaggedRequest(Request.GetProject),
	Rpc.fromTaggedRequest(Request.CreateGraph),
	Rpc.fromTaggedRequest(Request.CreateNode),
	Rpc.fromTaggedRequest(Request.ConnectIO),
	Rpc.fromTaggedRequest(Request.DisconnectIO),
	Rpc.fromTaggedRequest(Request.SetItemPositions),
	Rpc.fromTaggedRequest(Request.GetPackageSettings),
	Rpc.fromTaggedRequest(Request.DeleteGraphItems),
	Rpc.fromTaggedRequest(Request.SetNodeProperty),
	Rpc.fromTaggedRequest(Request.CreateResourceConstant),
	Rpc.fromTaggedRequest(Request.UpdateResourceConstant),
	Rpc.fromTaggedRequest(Request.DeleteResourceConstant),
).middleware(CurrentActorRpcMiddleware);

export const Rpcs = RequestRpcs.merge(
	Presence.Rpcs,
	CloudAuth.Rpcs,
	ClientAuth.Rpcs,
	Credential.Rpcs,
);

export const RpcsSerialization = RpcSerialization.layerJson;
