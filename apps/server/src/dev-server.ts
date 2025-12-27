import { HttpServer } from "@effect/platform";
import {
	NodeContext,
	NodeHttpServer,
	NodeRuntime,
} from "@effect/platform-node";
import { Config, Fiber, Layer, Option } from "effect";
import * as Effect from "effect/Effect";
import { CloudApiClient } from "@macrograph/project-runtime";
import { Server, ServerConfigPersistence } from "@macrograph/server-backend";

import { createServer } from "node:http";
import { SharedDepsLive } from "./deps";

const HMRAwareNodeHttpServerLayer = NodeHttpServer.layer(
	() => {
		const server = createServer();

		const fiber = Option.getOrThrow(Fiber.getCurrentFiber());

		if (import.meta.hot) {
			import.meta.hot.accept(() => {
				Fiber.interrupt(fiber).pipe(Effect.runPromise);
				server.closeAllConnections();
				server.close();
			});
		}

		return server;
	},
	{ port: 5678, host: "0.0.0.0" },
);

Layer.scopedDiscard(
	Effect.gen(function* () {
		const server = yield* Server;

		return yield* Layer.launch(
			server.pipe(
				HttpServer.serve(),
				Layer.provide(HMRAwareNodeHttpServerLayer),
			),
		);
	}),
).pipe(
	Layer.provide(Server.Default),
	Layer.provide(SharedDepsLive),
	Layer.provide(
		ServerConfigPersistence.jsonFile("./node_modules/server-state.json"),
	),
	Layer.effect(
		CloudApiClient.BaseUrl,
		Config.string("MG_CLOUD_BASE_URL").pipe(
			Config.withDefault("http://localhost:4321"),
		),
	),
	Layer.provide(NodeContext.layer),
	Layer.launch,
	Effect.scoped,
	NodeRuntime.runMain,
);
