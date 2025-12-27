import { NodeSdk } from "@effect/opentelemetry";
import { Layer } from "effect";
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

export const SharedDepsLive = Layer.mergeAll(
	NodeSdkLive,
	Layer.succeed(CloudApiClient.BaseUrl, "http://localhost:4321"),
	ServerRegistrationToken.layerServerConfig.pipe(
		Layer.provide(ServerConfig.ServerConfig.Default),
	),
);
