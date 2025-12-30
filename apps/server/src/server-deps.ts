import { NodeSdk } from "@effect/opentelemetry";
import { FetchHttpClient } from "@effect/platform";
import { Config, Effect, Layer, Option } from "effect";
import { CloudApiClient } from "@macrograph/project-runtime";
import {
	ServerConfig,
	ServerRegistrationToken,
} from "@macrograph/server-backend";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

export class ServerEnv extends Effect.Service<ServerEnv>()(
	"@macrograph/server/ServerEnv",
	{
		effect: Config.all({
			cloudBaseUrl: Config.string("MG_CLOUD_BASE_URL").pipe(
				Config.withDefault("https://www.macrograph.app"),
			),
			axiom: Config.all({
				dataset: Config.string("AXIOM_DATASET"),
				apiToken: Config.string("AXIOM_API_TOKEN"),
				domain: Config.string("AXIOM_DOMAIN"),
			}).pipe(Config.option),
		}),
	},
) {}

const NodeSdkLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const env = yield* ServerEnv;

		const exporterConfig: OTLPExporterNodeConfigBase = {};
		const headers: Record<string, string> = {};

		if (Option.isSome(env.axiom)) {
			const axiom = env.axiom.value;
			exporterConfig.url = `https://${axiom.domain}/v1/traces`;
			headers.Authorization = `Bearer ${axiom.apiToken}`;
			headers["X-Axiom-Dataset"] = axiom.dataset;
		}

		exporterConfig.headers = headers;

		return NodeSdk.layer(() => ({
			resource: { serviceName: "mg-server-backend" },
			// Export span data to the console
			spanProcessor: [
				new BatchSpanProcessor(new OTLPTraceExporter(exporterConfig)),
				// new BatchSpanProcessor(new ConsoleSpanExporter()),
			],
		}));
	}),
);

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
			Layer.effect(
				CloudApiClient.BaseUrl,
				Effect.map(ServerEnv, (e) => e.cloudBaseUrl),
			),
			FetchHttpClient.layer,
			ServerRegistrationToken.layerServerConfig.pipe(
				Layer.provide(ServerConfig.ServerConfig.Default),
			),
		),
	),
);
