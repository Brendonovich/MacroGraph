import { it } from "@effect/vitest";
import { Effect, HashMap, Option } from "effect";
import * as PackageSDK from "@macrograph/package-sdk";
import {
	Graph,
	IO,
	Node,
	NodesIOStore,
	Package,
	Project,
	Schema,
} from "@macrograph/project-domain";
import { expect } from "vitest";

import { EngineRegistry } from "../src/EngineRegistry.ts";
import { ProjectRuntime } from "../src/ProjectRuntime.ts";

it.effect(
	"runs pure nodes once per exec step",
	Effect.fn(function* () {
		let pureRuns = 0;
		const execRuns: Array<string> = [];

		const TestPackage = PackageSDK.Package.define<PackageSDK.PackageEngine.Any>(
			{ name: "Test" },
		)
			.addSchema("event", {
				name: "Event",
				type: "event",
				event: (e) => Option.some(e),
				io: (c) => c.out.data("out", PackageSDK.t.String),
				run: ({ io }) => {
					io("event");
				},
			})
			.addSchema("pure", {
				name: "Pure",
				type: "pure",
				io: (c) => ({ out: c.out.data("out", PackageSDK.t.String) }),
				run: ({ io }) => {
					pureRuns++;
					io.out("pure");
				},
			})
			.addSchema("exec", {
				name: "Exec",
				type: "exec",
				io: (c) => ({
					in: {
						a: c.in.data("a", PackageSDK.t.String),
						b: c.in.data("b", PackageSDK.t.String),
					},
					out: c.out.data("out", PackageSDK.t.String),
				}),
				run: function* ({ io }) {
					execRuns.push(`${io.in.a}|${io.in.b}`);
					io.out(`${io.in.a}:${io.in.b}`);
				},
			});

		const pkgId = Package.Id.make("test");
		const eventSchemaId = Schema.Id.make("event");
		const pureSchemaId = Schema.Id.make("pure");
		const execSchemaId = Schema.Id.make("exec");

		const eventNode: Node.Node = {
			id: Node.Id.make(1),
			name: "Event",
			schema: { pkg: pkgId, id: eventSchemaId },
			position: { x: 0, y: 0 },
		};
		const pureNode: Node.Node = {
			id: Node.Id.make(2),
			name: "Pure",
			schema: { pkg: pkgId, id: pureSchemaId },
			position: { x: 10, y: 0 },
		};
		const execNode1: Node.Node = {
			id: Node.Id.make(3),
			name: "Exec 1",
			schema: { pkg: pkgId, id: execSchemaId },
			position: { x: 20, y: 0 },
		};
		const execNode2: Node.Node = {
			id: Node.Id.make(4),
			name: "Exec 2",
			schema: { pkg: pkgId, id: execSchemaId },
			position: { x: 30, y: 0 },
		};

		const execPort = IO.Id.make("exec");
		const pureOut = IO.Id.make("out");
		const execInA = IO.Id.make("a");
		const execInB = IO.Id.make("b");

		const graph = new Graph.Graph({
			id: Graph.Id.make(1),
			name: "Graph",
			nodes: HashMap.fromIterable([
				[eventNode.id, eventNode],
				[pureNode.id, pureNode],
				[execNode1.id, execNode1],
				[execNode2.id, execNode2],
			]),
			connections: HashMap.fromIterable([
				[eventNode.id, { [execPort]: [[execNode1.id, execPort]] }],
				[execNode1.id, { [execPort]: [[execNode2.id, execPort]] }],
				[
					pureNode.id,
					{
						[pureOut]: [
							[execNode1.id, execInA],
							[execNode1.id, execInB],
							[execNode2.id, execInA],
							[execNode2.id, execInB],
						],
					},
				],
			]),
			comments: HashMap.empty(),
		});

		const project = new Project.Project({
			name: "Project",
			graphs: HashMap.fromIterable([[graph.id, graph]]),
			constants: HashMap.empty(),
			nextGraphId: Graph.Id.make(2),
			nextNodeId: Node.Id.make(5),
		});

		const runtime = yield* ProjectRuntime.make();
		yield* runtime.loadPackage(pkgId, TestPackage);

		const eventSchema = TestPackage.schemas.get("event");
		const pureSchema = TestPackage.schemas.get("pure");
		const execSchema = TestPackage.schemas.get("exec");
		if (!eventSchema || !pureSchema || !execSchema) {
			throw new Error("Test package schemas missing");
		}

		const result = yield* ProjectRuntime.handleEvent(pkgId, { tick: 1 })
			.pipe(Effect.flatMap(Effect.all))
			.pipe(
				Effect.provide(NodesIOStore.Default),
				Effect.provideService(ProjectRuntime.CurrentProject, project),
				Effect.provideService(ProjectRuntime.ProjectRuntime, runtime),
				Effect.provide(EngineRegistry.EngineRegistry.Default),
			);

		expect(result).not.toBe(false);
		expect(execRuns.length).toBe(2);
		expect(execRuns).toEqual(["pure|pure", "pure|pure"]);
		expect(pureRuns).toBe(2);
	}),
);
