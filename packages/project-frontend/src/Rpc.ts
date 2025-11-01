import { RpcClient } from "@effect/rpc";
import { Context } from "effect";

export class ProjectRpc extends Context.Tag("ProjectRpc")<
	ProjectRpc,
	RpcClient.RpcClient<never>
>() {}
