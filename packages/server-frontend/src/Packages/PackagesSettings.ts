import { HttpClient, HttpClientRequest } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { Effect, Layer, Option } from "effect";
import { GetPackageRpcClient } from "@macrograph/project-ui";

import { ProjectRealtime } from "../Project/Realtime";

export const HttpPackgeRpcClient = Layer.effect(
	GetPackageRpcClient,
	Effect.gen(function* () {
		const realtime = yield* ProjectRealtime;

		const client = yield* HttpClient.HttpClient.pipe(
			Effect.map(
				HttpClient.mapRequest(
					HttpClientRequest.setHeader(
						"Authorization",
						`Bearer ${realtime.token}`,
					),
				),
			),
		);

		return (id, rpcs) => {
			const protocol = RpcClient.layerProtocolHttp({
				url: `/api/package/${id}/rpc`,
			}).pipe(
				Layer.provide([
					RpcSerialization.layerJson,
					Layer.succeed(HttpClient.HttpClient, client),
				]),
			);

			return RpcClient.make(rpcs, { disableTracing: false }).pipe(
				Effect.provide(protocol),
				Effect.map(Option.some),
			) as any;
		};
	}),
);
