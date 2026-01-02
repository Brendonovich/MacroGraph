import * as HttpApiScalar from "@effect/platform/HttpApiScalar";
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter";
import * as HttpMiddleware from "@effect/platform/HttpMiddleware";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";

import { createServer } from "node:http";
import { HelixApi } from "./index.ts";

const DocsRoute = HttpApiScalar.layerHttpLayerRouter({
	api: HelixApi,
	path: "/",
});

const CorsMiddleware = HttpLayerRouter.middleware(HttpMiddleware.cors());

const AllRoutes = Layer.merge(DocsRoute, CorsMiddleware.layer);

console.log("🚀 Serving Helix API docs at http://localhost:42069");

HttpLayerRouter.serve(AllRoutes).pipe(
	Layer.provide(NodeHttpServer.layer(createServer, { port: 42069 })),
	Layer.launch,
	NodeRuntime.runMain,
);
