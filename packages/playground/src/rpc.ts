import { Rpc, RpcGroup, RpcTest } from "@effect/rpc";
import { Credential, Graph, Node, Project } from "@macrograph/project-domain";
import { Effect, Schema } from "effect";

export const Rpcs = RpcGroup.make(
	Rpc.fromTaggedRequest(Project.GetProject),
	Rpc.fromTaggedRequest(Graph.CreateNode),
	Rpc.fromTaggedRequest(Project.GetPackageSettings),
	Rpc.fromTaggedRequest(Node.SetNodePositions),
	Rpc.make("GetCredentials", {
		success: Schema.Array(Credential.Credential),
		error: Schema.Union(Credential.NoRegistrationError),
	}),
	Rpc.make("RefetchCredentials", {
		success: Schema.Array(Credential.Credential),
		error: Schema.Union(Credential.NoRegistrationError),
	}),
);

export class PlaygroundRpc extends Effect.Service<PlaygroundRpc>()(
	"PlaygroundRpc",
	{ scoped: RpcTest.makeClient(Rpcs) },
) {}
