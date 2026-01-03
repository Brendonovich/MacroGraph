import { it } from "@effect/vitest";
import { Effect, Layer, Stream } from "effect";
import * as PackageSDK from "@macrograph/package-sdk";
import { t } from "@macrograph/package-sdk";
import { IO, Package, Request, Schema } from "@macrograph/project-domain";
import {
	GraphRequests,
	PackageActions,
	ProjectRequests,
	ProjectRuntime,
} from "@macrograph/project-runtime";

const ServicesLive = Layer.mergeAll(
	ProjectRequests.Default,
	GraphRequests.Default,
	PackageActions.Default,
);

const TEST_PKG_ID = "test";
const PRINT_NODE_ID = "print";
const TestPackage = PackageSDK.Package.make({
	name: "Test",
	builder: (ctx) => {
		ctx.schema(PRINT_NODE_ID, {
			name: "Log",
			type: "exec",
			io: (c) => ({ in: c.in.data("in", t.String, { name: "Input" }) }),
			run: function* ({ io }) {
				console.log(`Log: ${yield* PackageSDK.getInput(io.in)}`);
				// const logger = yield* Logger;
				// yield* logger.print(`Log: ${yield* getInput(io.in)}`);

				// return io.execOut;
			},
		});
	},
});

it.layer(ServicesLive)((it) => {
	it.effect("test", () =>
		Effect.gen(function* () {
			const runtime = yield* ProjectRuntime.make();
			const projectRequests = yield* ProjectRequests;
			const graphRequests = yield* GraphRequests;
			const packages = yield* PackageActions;

			yield* Stream.fromPubSub(runtime.events).pipe(
				Stream.runForEach((v) =>
					Effect.sync(() => {
						console.log(v);
					}),
				),
				Effect.fork,
			);

			yield* Effect.gen(function* () {
				yield* packages.loadPackage(TEST_PKG_ID, TestPackage);

				const { graph } = yield* projectRequests.createGraph(
					new Request.CreateGraph({ name: "Test" }),
				);

				const { node: node1 } = yield* graphRequests.createNode(
					new Request.CreateNode({
						graph: graph.id,
						name: "Node",
						position: { x: 10, y: 10 },
						schema: {
							pkg: Package.Id.make(TEST_PKG_ID),
							id: Schema.Id.make(PRINT_NODE_ID),
						},
					}),
				);

				const { node: node2 } = yield* graphRequests.createNode(
					new Request.CreateNode({
						graph: graph.id,
						name: "Node",
						position: { x: 100, y: 10 },
						schema: {
							pkg: Package.Id.make(TEST_PKG_ID),
							id: Schema.Id.make(PRINT_NODE_ID),
						},
					}),
				);

				yield* graphRequests.connectIO(
					new Request.ConnectIO({
						graph: graph.id,
						output: [node1.id, IO.Id.make("out")],
						input: [node2.id, IO.Id.make("in")],
					}),
				);

				yield* graphRequests.setItemPositions(
					new Request.SetItemPositions({
						graph: graph.id,
						items: [[["Node", node1.id], { x: 123, y: 456 }]],
					}),
				);
			}).pipe(Effect.provideService(ProjectRuntime.Current, runtime));
		}),
	);
});
