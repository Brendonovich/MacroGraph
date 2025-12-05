export * as Graph from "@macrograph/project-domain/Graph";
export * as Node from "@macrograph/project-domain/Node";

export * as ClientAuth from "./ClientAuth";
export * as CloudAuth from "./CloudAuth";
export * as Credential from "./Credential";
export * from "./errors";
export * from "./event";
export * from "./Permissions";
export * as Policy from "./Policy";
export * as Presence from "./Presence";
export * as Realtime from "./Realtime";
export * from "./util";

import { Rpc, RpcGroup } from "@effect/rpc";
// import { Graph, Node, Project } from "@macrograph/project-domain";
import { Request } from "@macrograph/project-domain/updated";

import * as ClientAuth from "./ClientAuth";
import * as CloudAuth from "./CloudAuth";
import * as Credential from "./Credential";
import * as Presence from "./Presence";

// const GraphRpcs = RpcGroup.make(
// 	Rpc.fromTaggedRequest(Graph.CreateNode),
// 	Rpc.fromTaggedRequest(Graph.ConnectIO),
// 	Rpc.fromTaggedRequest(Graph.DisconnectIO),
// 	Rpc.fromTaggedRequest(Graph.DeleteSelection),
// );

// const NodeRpcs = RpcGroup.make(Rpc.fromTaggedRequest(Node.SetNodePositions));

// export const ProjectRpcs = RpcGroup.make(
// 	Rpc.fromTaggedRequest(Project.GetProject),
// 	Rpc.fromTaggedRequest(Project.GetPackageSettings),
// );

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
);

export const Rpcs = RequestRpcs.merge(
	// GraphRpcs,
	// NodeRpcs,
	Presence.Rpcs,
	CloudAuth.Rpcs,
	ClientAuth.Rpcs,
	Credential.Rpcs,
);
