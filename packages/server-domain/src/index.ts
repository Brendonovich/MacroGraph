export * as Graph from "@macrograph/project-domain/Graph";
export * as Node from "@macrograph/project-domain/Node";
export * as Realtime from "./Realtime";
export * as Presence from "./Presence";
export * as ClientAuth from "./ClientAuth";
export * as CloudAuth from "./CloudAuth";
export * as Policy from "./Policy";
export * as Credential from "./Credential";

export * from "./util";
export * from "./errors";
export * from "./event";
export * from "./Permissions";

import { Graph, Node, Project } from "@macrograph/project-domain";

import * as ClientAuth from "./ClientAuth";
import * as CloudAuth from "./CloudAuth";
import * as Presence from "./Presence";
import * as Credential from "./Credential";
import { Rpc, RpcGroup } from "@effect/rpc";

const GraphRpcs = RpcGroup.make(
	Rpc.fromTaggedRequest(Graph.CreateNode),
	Rpc.fromTaggedRequest(Graph.ConnectIO),
	Rpc.fromTaggedRequest(Graph.DisconnectIO),
	Rpc.fromTaggedRequest(Graph.DeleteSelection),
);

const NodeRpcs = RpcGroup.make(Rpc.fromTaggedRequest(Node.SetNodePositions));

export const ProjectRpcs = RpcGroup.make(
	Rpc.fromTaggedRequest(Project.GetProject),
	Rpc.fromTaggedRequest(Project.GetPackageSettings),
);

export const Rpcs = ProjectRpcs.merge(
	GraphRpcs,
	NodeRpcs,
	Presence.Rpcs,
	CloudAuth.Rpcs,
	ClientAuth.Rpcs,
	Credential.Rpcs,
);
