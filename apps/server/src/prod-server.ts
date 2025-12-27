import {
	HttpMiddleware,
	HttpRouter,
	HttpServer,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import {
	NodeContext,
	NodeHttpServer,
	NodeRuntime,
} from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Server, ServerConfigPersistence } from "@macrograph/server-backend";

import { createServer } from "node:http";
import { SharedDepsLive } from "./deps";

Layer.unwrapEffect(
	Effect.gen(function* () {
		return HttpRouter.empty.pipe(
			HttpRouter.all(
				"*",
				Effect.sync(() => HttpServerResponse.empty({ status: 494 })),
			),
			HttpRouter.use(
				HttpMiddleware.make(() =>
					Effect.gen(function* () {
						const httpServerRequest =
							yield* HttpServerRequest.HttpServerRequest;
						let { url } = httpServerRequest;
						if (url === "/") url = "/index.html";

						let response = yield* HttpServerResponse.file(`dist/client${url}`);

						if (url.startsWith("/assets"))
							response = response.pipe(
								HttpServerResponse.setHeader(
									"cache-control",
									"public,immutable,max-age=31536000",
								),
							);

						return response;
					}),
				),
			),
			HttpRouter.mountApp("/api", yield* Server),
			HttpServer.serve(),
		);
	}),
).pipe(
	Layer.provide(Server.Default),
	Layer.provide(SharedDepsLive),
	Layer.provide(ServerConfigPersistence.jsonFile("./server-state.json")),
	Layer.provide(NodeContext.layer),
	Layer.provide(NodeHttpServer.layer(createServer, { port: 23456 })),
	Layer.launch,
	Effect.scoped,
	NodeRuntime.runMain,
);
