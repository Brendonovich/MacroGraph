import { WebSdk } from "@effect/opentelemetry";
import { Config, ConfigProvider, Effect, Layer, Option } from "effect";
import { Package } from "@macrograph/project-domain";
import { PackageClients } from "@macrograph/project-ui";
import { runtime, UILive } from "@macrograph/server-frontend";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

import "@unocss/reset/tailwind.css";
import "virtual:uno.css";

const TracingLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const env = yield* Config.all({
			axiom: Config.all({
				dataset: Config.string("VITE_AXIOM_DATASET"),
				apiToken: Config.string("VITE_AXIOM_API_TOKEN"),
				domain: Config.string("VITE_AXIOM_DOMAIN"),
			}).pipe(Config.option),
		});

		const exporterConfig: OTLPExporterNodeConfigBase = {};

		const headers: Record<string, string> = {};

		if (Option.isSome(env.axiom)) {
			const axiom = env.axiom.value;
			exporterConfig.url = `https://${axiom.domain}/v1/traces`;
			headers.Authorization = `Bearer ${axiom.apiToken}`;
			headers["X-Axiom-Dataset"] = axiom.dataset;
		}

		exporterConfig.headers = headers;

		return WebSdk.layer(() => ({
			resource: { serviceName: "mg-server-frontend" },
			// Export span data to the console
			spanProcessor: [
				new BatchSpanProcessor(new OTLPTraceExporter(exporterConfig)),
				// new BatchSpanProcessor(new ConsoleSpanExporter()),
			],
		}));
	}),
);

const RegisterPackages = Layer.scopedDiscard(
	Effect.gen(function* () {
		const packageClients = yield* PackageClients;

		const packageMeta = yield* Effect.promise(
			() => import("@macrograph/base-packages/meta"),
		);

		const packageSettings = yield* Effect.promise(
			() => import("@macrograph/base-packages/Settings"),
		);

		for (const [id, getSettings] of Object.entries(packageSettings.default)) {
			yield* packageClients.registerPackageClient(
				Package.Id.make(id),
				yield* Effect.promise(getSettings),
				packageMeta.default[id]!,
			);
		}
	}),
);

const ImportMetaEnvConfig = Layer.setConfigProvider(
	ConfigProvider.fromMap(new Map(Object.entries(import.meta.env))),
);

Layer.mergeAll(RegisterPackages, UILive).pipe(
	Layer.provide(TracingLive),
	Layer.provide(ImportMetaEnvConfig),
	Layer.launch,
	runtime.runPromise,
);
