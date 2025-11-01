import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { GetPackageRpcClient } from "@macrograph/project-frontend";
import { Effect, Layer } from "effect";

export const HttpPackgeRpcClient = Layer.succeed(
	GetPackageRpcClient,
	(id, rpcs) =>
		RpcClient.make(rpcs, { disableTracing: false }).pipe(
			Effect.provide(
				RpcClient.layerProtocolHttp({ url: `/api/package/${id}/rpc` }).pipe(
					Layer.provide([RpcSerialization.layerJson, FetchHttpClient.layer]),
				),
			),
		),
);
