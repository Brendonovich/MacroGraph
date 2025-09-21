import { createServer } from "node:http";
import { HttpServer } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { DepsLive, Server } from "@macrograph/server-backend";
import { Fiber, Layer, Option } from "effect";
import * as Effect from "effect/Effect";

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

const program = Effect.gen(function* () {
	const server = yield* Server;

	return yield* Layer.launch(
		server.pipe(HttpServer.serve(), Layer.provide(HMRAwareNodeHttpServerLayer)),
	);
});

program.pipe(
	Effect.provide(Server.Default),
	Effect.provide(DepsLive),
	Effect.scoped,
	NodeRuntime.runMain,
);
