import { Rpc, RpcGroup, RpcTest } from "@effect/rpc";
import { Credential, Graph, Project } from "@macrograph/project-domain";
import { Effect, Schema } from "effect";

export const Rpcs = RpcGroup.make(
	Rpc.fromTaggedRequest(Project.GetProject),
	Rpc.fromTaggedRequest(Graph.CreateNode),
	Rpc.fromTaggedRequest(Project.GetPackageSettings),
	Rpc.make("GetCredentials", {
		success: Schema.Array(Credential.Credential),
		error: Schema.Union(Credential.NoRegistrationError),
	}),
);

export class PlaygroundRpc extends Effect.Service<PlaygroundRpc>()(
	"PlaygroundRpc",
	{ scoped: RpcTest.makeClient(Rpcs) },
) {}
