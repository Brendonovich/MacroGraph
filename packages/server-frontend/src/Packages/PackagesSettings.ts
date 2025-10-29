import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import {
	Effect,
	Layer,
} from "effect";

export class GetPackageRpcProtocol extends Effect.Service<GetPackageRpcProtocol>()(
	"GetPackageRpcProtocol",
	{
		sync: () => (id: string) =>
			RpcClient.layerProtocolHttp({ url: `/api/package/${id}/rpc` }).pipe(
				Layer.provide([RpcSerialization.layerJson, FetchHttpClient.layer]),
			),
	},
) {}
