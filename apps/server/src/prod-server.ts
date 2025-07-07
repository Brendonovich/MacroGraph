import {
	Headers,
	HttpMiddleware,
	HttpRouter,
	HttpServer,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import { Effect, Layer } from "effect";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { createServer } from "node:http";
import { DepsLive } from "@macrograph/server-backend";

import { ServerEntry } from "./entry-server";

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
			HttpRouter.mountApp("/api", yield* ServerEntry),
			HttpServer.serve(),
		);
	}),
).pipe(
	Layer.provide(NodeHttpServer.layer(createServer, { port: 23456 })),
	Layer.launch,
	Effect.provide(DepsLive),
	Effect.scoped,
	NodeRuntime.runMain,
);
