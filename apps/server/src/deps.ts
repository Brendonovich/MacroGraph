import { NodeSdk } from "@effect/opentelemetry";
import { FetchHttpClient } from "@effect/platform";
import { Effect, Layer, Option } from "effect";
import { CloudApiClient } from "@macrograph/project-runtime";
import {
	ServerConfig,
	ServerRegistrationToken,
} from "@macrograph/server-backend";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

const NodeSdkLive = NodeSdk.layer(() => ({
	resource: { serviceName: "mg-server-backend" },
	// Export span data to the console
	spanProcessor: [
		new BatchSpanProcessor(new OTLPTraceExporter()),
		// new BatchSpanProcessor(new ConsoleSpanExporter()),
	],
}));

const CloudApiClientAuth = Layer.effect(
	CloudApiClient.Auth,
	Effect.gen(function* () {
		const serverToken = yield* ServerRegistrationToken;

		// @effect-diagnostics-next-line returnEffectInGen:off
		return serverToken.get.pipe(
			Effect.map(
				Option.map((token) => ({ clientId: "macrograph-server", token })),
			),
		);
	}),
);

export const SharedDepsLive = CloudApiClient.layer().pipe(
	Layer.provide(CloudApiClientAuth),
	Layer.provideMerge(
		Layer.mergeAll(
			NodeSdkLive,
			FetchHttpClient.layer,
			Layer.succeed(CloudApiClient.BaseUrl, "http://localhost:4321"),
			ServerRegistrationToken.layerServerConfig.pipe(
				Layer.provide(ServerConfig.ServerConfig.Default),
			),
		),
	),
);
