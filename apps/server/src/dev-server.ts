import { HttpServer } from "@effect/platform";
import {
	NodeContext,
	NodeHttpServer,
	NodeRuntime,
} from "@effect/platform-node";
import { Fiber, Layer, Option } from "effect";
import * as Effect from "effect/Effect";
import { EnginePersistence } from "@macrograph/project-runtime";
import {
	Server,
	ServerConfigPersistence,
	ServerProjectPersistence,
} from "@macrograph/server-backend";

import { createServer } from "node:http";
import { ServerEnv, SharedDepsLive } from "./server-deps";

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
		ServerConfigPersistence.jsonFile(
			"./node_modules/.macrograph/server-state.json",
		),
	),
	Layer.provide(
		ServerProjectPersistence.layerJsonFile(
			"./node_modules/.macrograph/project.json",
		),
	),
	Layer.provide(
		EnginePersistence.layerFileSystem("./node_modules/.macrograph/engines"),
	),
	Layer.provide(Layer.mergeAll(NodeContext.layer, ServerEnv.Default)),
	Layer.launch,
	Effect.scoped,
	NodeRuntime.runMain,
);
