import { Effect, Layer } from "effect";
import { Package } from "@macrograph/project-domain/updated";
import { PackageClients } from "@macrograph/project-ui";
import { runtime, UILive } from "@macrograph/server-frontend";

import "@unocss/reset/tailwind.css";
import "virtual:uno.css";

const RegisterPackages = Layer.effectDiscard(
	Effect.gen(function* () {
		const packageClients = yield* PackageClients;

		const packageSettings = yield* Effect.promise(
			() => import("@macrograph/base-packages/Settings"),
		);

		for (const [id, getSettings] of Object.entries(packageSettings.default)) {
			yield* packageClients.registerPackageClient(
				Package.Id.make(id),
				yield* Effect.promise(getSettings),
			);
		}
	}),
);

Layer.mergeAll(RegisterPackages, UILive).pipe(Layer.launch, runtime.runPromise);
