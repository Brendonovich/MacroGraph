import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { Effect, Layer, Option } from "effect";
import { GetPackageRpcClient } from "@macrograph/project-ui";

export const HttpPackgeRpcClient = Layer.succeed(
	GetPackageRpcClient,
	(id, rpcs) =>
		RpcClient.make(rpcs, { disableTracing: false }).pipe(
			Effect.provide(
				RpcClient.layerProtocolHttp({ url: `/api/package/${id}/rpc` }).pipe(
					Layer.provide([RpcSerialization.layerJson, FetchHttpClient.layer]),
				),
			),
			Effect.map(Option.some),
		) as any,
);
