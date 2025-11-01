import { PackagesSettings, UI, runtime } from "@macrograph/server-frontend";
import { Effect, Layer } from "effect";

import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";

const ClientLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const packageSettings = yield* Effect.promise(
			() => import("@macrograph/base-packages/Settings"),
		);

		yield* Effect.all(
			Object.entries(packageSettings.default).map(([id, getPkg]) =>
				Effect.gen(function* () {
					const pkg = yield* Effect.promise(getPkg);

					yield* PackagesSettings.addPackage(id, pkg);
				}),
			),
			{ concurrency: 3 },
		);

		return UI.Default;
	}),
);

runtime.runPromise(Layer.launch(ClientLive).pipe(Effect.scoped));
