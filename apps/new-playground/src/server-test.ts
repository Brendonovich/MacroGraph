import {
	Context,
	Effect as E,
	Exit,
	Layer,
	pipe,
	PubSub,
	Scope,
	Stream,
} from "effect";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import {
	Broadcast,
	CurrentProject,
	GraphRpcs,
	GraphRpcsLayer,
} from "./index.ts";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import * as HttpServer from "@effect/platform/HttpServer";
import { cors } from "hono/cors";
import { appendTrailingSlash } from "hono/trailing-slash";

const createApi = () =>
	E.gen(function* () {
		const broadcast = yield* Broadcast;

		const app = new Hono();

		app.use(cors());
		app.use(appendTrailingSlash());

		app.get("/broadcasts", (c) =>
			E.gen(function* () {
				const scope = yield* Scope.make();
				const queue = yield* broadcast.pubsub.subscribe.pipe(
					Scope.extend(scope),
					E.map(Stream.fromQueue),
				);

				const stream = streamSSE(c, (stream) =>
					E.gen(function* () {
						stream.onAbort(() => Scope.close(scope, Exit.void).pipe(E.runSync));

						yield* Stream.runForEach(queue, (item) =>
							E.promise(() => stream.writeSSE({ data: JSON.stringify(item) })),
						);
					}).pipe(E.runPromise),
				);

				return stream;
			})
				.pipe(E.scoped)
				.pipe(E.runPromise),
		);

		const rpcServer = RpcServer.toWebHandler(GraphRpcs, {
			layer: pipe(
				Layer.mergeAll(
					GraphRpcsLayer,
					RpcSerialization.layerJson,
					HttpServer.layerContext,
				),
				Layer.provide(Layer.succeed(Broadcast, broadcast)),
				Layer.provide(
					Layer.succeed(CurrentProject, {
						meta: { name: "", graphIdCounter: 0 },
						graphs: new Map(),
					}),
				),
			),
		});

		app.all("/rpc/", (c) => rpcServer.handler(c.req.raw));

		return app;
	});

E.gen(function* () {
	const pubsub = yield* PubSub.bounded(1);

	setInterval(() => pubsub.publish("BRUH"), 100);

	const app = yield* createApi().pipe(
		E.provide(Context.make(Broadcast, { pubsub })),
	);

	yield* E.promise(() => Deno.serve(app.fetch).finished);
}).pipe(E.runFork);
