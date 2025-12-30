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

Layer.mergeAll(RegisterPackages, UILive).pipe(Layer.launch, runtime.runPromise);
