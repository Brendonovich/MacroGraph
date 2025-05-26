import { expect, it } from "@effect/vitest";

import { RpcTest } from "@effect/rpc";
import { Context, Effect as E } from "effect";

import {
	Broadcast,
	CurrentProject,
	GraphRpcs,
	GraphRpcsLayer,
} from "./index.ts";

const LoggingBroadcast = Context.make(Broadcast, {
	send: (args) =>
		E.sync(() => {
			console.log("broadcast", args);
		}),
});

const TestProject = Context.make(CurrentProject, {
	meta: {
		name: "Test Project",
		graphIdCounter: 0,
	},
	graphs: new Map(),
});

it.effect("runs", () =>
	E.gen(function* () {
		const client = yield* RpcTest.makeClient(GraphRpcs);
		const project = yield* CurrentProject;

		expect(project.graphs.size).toBe(0);

		const { id: graphId } = yield* client.CreateGraph();
		expect(project.graphs.size).toBe(1);

		const graph = project.graphs.get(graphId)!;

		yield* client.UpdateGraph({ graphId, data: { name: "Graph #1" } });
		expect(graph.name).toBe("Graph #1");

		yield* client.DeleteGraph({ graphId });
		expect(project.graphs.size).toBe(0);
	}).pipe(
		E.scoped,
		E.provide(GraphRpcsLayer),
		E.provide(LoggingBroadcast),
		E.provide(TestProject),
	),
);
