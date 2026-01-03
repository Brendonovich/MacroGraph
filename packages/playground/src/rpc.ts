import { Rpc, RpcGroup, RpcTest } from "@effect/rpc";
import { Effect, Schema as S } from "effect";
import { Credential, Request } from "@macrograph/project-domain";

export const Rpcs = RpcGroup.make(
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
	Rpc.make("GetCredentials", { success: S.Array(Credential.Credential) }),
	Rpc.make("RefetchCredentials", { success: S.Array(Credential.Credential) }),
);

export class PlaygroundRpc extends Effect.Service<PlaygroundRpc>()(
	"PlaygroundRpc",
	{ scoped: RpcTest.makeClient(Rpcs) },
) {}
