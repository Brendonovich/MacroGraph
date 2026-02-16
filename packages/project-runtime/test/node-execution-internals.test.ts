import { describe, expect, it } from "@effect/vitest";
import { Effect, HashMap } from "effect";
import { DataInput, DataOutput, t } from "@macrograph/package-sdk";
import {
	type Graph,
	IO,
	Node,
	NodeExecutionContext,
} from "@macrograph/project-domain";

import {
	buildConnectionIndex,
	makeExecStepInputResolver,
	makeInMemoryOutputStore,
	makeIOShape,
	runNode,
} from "../src/NodeExecutionInternals.ts";

describe("NodeExecutionInternals", () => {
	it("buildConnectionIndex: resolves incoming connection", () => {
		const outNodeId = Node.Id.make(1);
		const inNodeId = Node.Id.make(2);
		const outId = IO.Id.make("out");
		const inId = IO.Id.make("in");

		const target: readonly [Node.Id, IO.Id] = [inNodeId, inId];
		const outConns: Graph.NodeOutputConnections = { [outId]: [target] };
		const connections = HashMap.set(HashMap.empty(), outNodeId, outConns);

		const index = buildConnectionIndex(connections);
		const incoming = index.incoming(inNodeId, String(inId));
		expect(incoming._tag).toBe("Some");
		if (incoming._tag === "Some") {
			expect(incoming.value[0]).toBe(outNodeId);
			expect(incoming.value[1]).toBe(String(outId));
		}
	});

	it.effect(
		"materializeIOShape: prefetches inputs and wires outputs",
		Effect.fn(function* () {
			const inPort = new DataInput({ id: "in", type: t.String });
			const outPort = new DataOutput({ id: "out", type: t.String });

			let got: unknown;
			let inputCalls = 0;
			const io = yield* makeIOShape(
				{ in: inPort, out: outPort },
				() => {
					inputCalls++;
					return Effect.succeed("prefetched");
				},
				(_out, v) => {
					got = v;
				},
			);

			expect(inputCalls).toBe(1);
			expect(io.in).toBe("prefetched");
			io.out("written");
			expect(got).toBe("written");
		}),
	);

	it.effect(
		"makeExecStepInputResolver: pure nodes run once per step",
		Effect.fn(function* () {
			const pureNodeId = Node.Id.make(1);
			const execNodeId = Node.Id.make(2);
			const outId = IO.Id.make("out");
			const inId = IO.Id.make("in");

			const target: readonly [Node.Id, IO.Id] = [execNodeId, inId];
			const outConns: Graph.NodeOutputConnections = { [outId]: [target] };
			const connections = HashMap.set(HashMap.empty(), pureNodeId, outConns);
			const connectionIndex = buildConnectionIndex(connections);

			let runs = 0;
			const evaluatePureNode = () => {
				runs++;
				return Effect.sync(() => {});
			};

			const defaultValue = (_i: DataInput<any>) => Effect.succeed("default");
			const execOutputs = makeInMemoryOutputStore();

			const step1 = makeExecStepInputResolver({
				currentNodeId: execNodeId,
				connectionIndex,
				isPureNode: (id) => Effect.succeed(id === pureNodeId),
				evaluatePureNode: ({ setOutput }) => {
					return evaluatePureNode().pipe(
						Effect.tap(() =>
							Effect.sync(() => {
								setOutput(new DataOutput({ id: outId, type: t.String }), "v");
							}),
						),
					);
				},
				execOutputs,
				defaultValue,
			});

			const input = new DataInput({ id: inId, type: t.String });
			const v1 = yield* step1.getInput(input);
			const v2 = yield* step1.getInput(input);
			expect(v1).toBe("v");
			expect(v2).toBe("v");
			expect(runs).toBe(1);

			const step2 = makeExecStepInputResolver({
				currentNodeId: execNodeId,
				connectionIndex,
				isPureNode: (id) => Effect.succeed(id === pureNodeId),
				evaluatePureNode: ({ setOutput }) => {
					return evaluatePureNode().pipe(
						Effect.tap(() =>
							Effect.sync(() => {
								setOutput(new DataOutput({ id: outId, type: t.String }), "v2");
							}),
						),
					);
				},
				execOutputs,
				defaultValue,
			});

			const v3 = yield* step2.getInput(input);
			expect(v3).toBe("v2");
			expect(runs).toBe(2);
		}),
	);

	it.effect(
		"runNode: materializes inputs before running",
		Effect.fn(function* () {
			const nodeId = Node.Id.make(123);
			const inPort = new DataInput({ id: IO.Id.make("in"), type: t.String });
			const outPort = new DataOutput({ id: IO.Id.make("out"), type: t.String });
			const shape = { in: inPort, out: outPort };

			let inputResolved = false;
			let outputValue: unknown;

			const program = runNode({
				nodeId,
				shape,
				properties: {},
				getInput: () =>
					Effect.sync(() => {
						inputResolved = true;
						return "hello";
					}),
				setOutput: (_out, v) => {
					outputValue = v;
				},
				run: ({ io }) =>
					Effect.gen(function* () {
						const ctx = yield* NodeExecutionContext;
						expect(ctx.node.id).toBe(nodeId);
						expect(inputResolved).toBe(true);
						expect((io as any).in).toBe("hello");
						(io as any).out("written");
						return "ok";
					}),
			});

			const res = yield* program;
			expect(res).toBe("ok");
			expect(outputValue).toBe("written");
		}),
	);
});
