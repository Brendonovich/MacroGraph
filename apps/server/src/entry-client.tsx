import {
	Config,
	ConfigProvider,
	Effect,
	Layer,
	ManagedRuntime,
	Option,
} from "effect";
import { Package } from "@macrograph/project-domain";
import { PackageClients } from "@macrograph/project-ui";
import { EffectRuntime, UILive } from "@macrograph/server-frontend";

import "@unocss/reset/tailwind.css";
import "virtual:uno.css";
import { WebSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

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

const TracingLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const env = yield* Config.all({
			otelTraceUrl: Config.string("VITE_OTEL_TRACE_URL").pipe(Config.option),
		});

		const exporterConfig: OTLPExporterNodeConfigBase = {};

		if (Option.isSome(env.otelTraceUrl))
			exporterConfig.url = env.otelTraceUrl.value;

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

const ImportMetaEnvConfig = Layer.setConfigProvider(
	ConfigProvider.fromMap(new Map(Object.entries(import.meta.env))),
);

const runtime = ManagedRuntime.make(
	EffectRuntime.layer.pipe(
		Layer.provide(TracingLive),
		Layer.provide(ImportMetaEnvConfig),
	),
);

Layer.mergeAll(RegisterPackages, UILive(runtime)).pipe(
	Layer.launch,
	runtime.runPromise,
);
