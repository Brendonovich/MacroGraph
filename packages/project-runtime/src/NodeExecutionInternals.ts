import { Array, Data, Effect, HashMap, Option } from "effect";
import {
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	type Schema,
} from "@macrograph/package-sdk";
import {
	type Graph,
	type Node,
	NodeExecutionContext,
} from "@macrograph/project-domain";

export type PortId = string;

export type ConnectionIndex = {
	/**
	 * Finds the upstream (nodeId, outputId) feeding a given (nodeId, inputId).
	 * If multiple upstream connections exist, the first one encountered wins.
	 */
	incoming(
		toNodeId: Node.Id,
		toInputId: PortId,
	): Option.Option<readonly [Node.Id, PortId]>;

	/** Returns downstream (nodeId, inputId) connections for an output. */
	outgoing(
		fromNodeId: Node.Id,
		fromOutputId: PortId,
	): ReadonlyArray<readonly [Node.Id, PortId]>;
};

const incomingKey = (nodeId: Node.Id, portId: PortId): string =>
	`${String(nodeId)}:${portId}`;
const outgoingKey = (nodeId: Node.Id, portId: PortId): string =>
	`${String(nodeId)}:${portId}`;

export const buildConnectionIndex = (
	connections: Graph.Graph["connections"],
): ConnectionIndex => {
	const incoming = new Map<string, readonly [Node.Id, PortId]>();
	const outgoing = new Map<string, ReadonlyArray<readonly [Node.Id, PortId]>>();

	for (const [fromNodeId, nodeOutputs] of HashMap.entries(connections)) {
		for (const [fromOutputId_, tos] of Object.entries(nodeOutputs)) {
			const fromOutputId = String(fromOutputId_);
			const outK = outgoingKey(fromNodeId, fromOutputId);

			const targets: Array<readonly [Node.Id, PortId]> = [];
			for (const [toNodeId, toInputId_] of tos) {
				const toInputId = String(toInputId_);
				targets.push([toNodeId, toInputId]);

				const inK = incomingKey(toNodeId, toInputId);
				if (!incoming.has(inK)) incoming.set(inK, [fromNodeId, fromOutputId]);
			}

			outgoing.set(outK, targets);
		}
	}

	return {
		incoming(toNodeId, toInputId) {
			return Option.fromNullable(
				incoming.get(incomingKey(toNodeId, String(toInputId))),
			);
		},
		outgoing(fromNodeId, fromOutputId) {
			return outgoing.get(outgoingKey(fromNodeId, String(fromOutputId))) ?? [];
		},
	};
};

export const makeIOShape = <S, E, R>(
	shape: S,
	getInput: (i: DataInput<any>) => Effect.Effect<unknown, E, R>,
	setOutput: (out: DataOutput<any>, v: unknown) => void,
): Effect.Effect<Schema.InferIO<S>, E, R> =>
	Effect.gen(function* () {
		if (shape instanceof Data.Class) {
			if (shape instanceof DataOutput) {
				return (v: unknown) => {
					setOutput(shape, v);
				};
			}

			if (shape instanceof DataInput) return yield* getInput(shape);

			if (shape instanceof ExecOutput) return shape;
			if (shape instanceof ExecInput) return;
		} else if (Array.isArray(shape)) {
			return yield* Effect.forEach(shape, (item) =>
				Effect.gen(function* () {
					if (item) return yield* makeIOShape(item, getInput, setOutput);
				}),
			);
		} else if (shape !== null && typeof shape === "object") {
			const entries = Object.entries(shape);
			const mappedEntries = yield* Effect.forEach(entries, ([k, v]) =>
				Effect.map(makeIOShape(v, getInput, setOutput), (mv) => {
					const pair: readonly [string, unknown] = [k, mv];
					return pair;
				}),
			);
			return Object.fromEntries(mappedEntries);
		}

		return shape as any;
	}).pipe(Effect.map((v) => v as any));

export interface OutputStore {
	get(nodeId: Node.Id, outputId: PortId): Option.Option<unknown>;
	set(nodeId: Node.Id, outputId: PortId, value: unknown): void;
}

export const makeInMemoryOutputStore = (): OutputStore => {
	const map = new Map<string, unknown>();
	const k = (nodeId: Node.Id, outputId: PortId) =>
		`${String(nodeId)}:${outputId}`;
	return {
		get(nodeId, outputId) {
			return Option.fromNullable(map.get(k(nodeId, String(outputId))));
		},
		set(nodeId, outputId, value) {
			map.set(k(nodeId, String(outputId)), value);
		},
	};
};

export type PureNodeEvaluator<E = never, R = never> = (opts: {
	nodeId: Node.Id;
	getInput: (i: DataInput<any>) => Effect.Effect<unknown, E, R>;
	setOutput: (out: DataOutput<any>, v: unknown) => void;
}) => Effect.Effect<void, E, R>;

/**
 * Creates a per-exec-step input resolver.
 *
 * - Pure node outputs are cached for this step only.
 * - Each pure node is evaluated at most once per step.
 */
export const makeExecStepInputResolver = <E, R>(opts: {
	currentNodeId: Node.Id;
	connectionIndex: ConnectionIndex;
	isPureNode: (nodeId: Node.Id) => Effect.Effect<boolean, E, R>;
	evaluatePureNode: PureNodeEvaluator<E, R>;
	execOutputs: OutputStore;
	defaultValue: (i: DataInput<any>) => Effect.Effect<unknown, E, R>;
}) => {
	const pureOutputs = makeInMemoryOutputStore();
	const pureStatus = new Map<string, "running" | "done">();

	const getInputFor = (
		nodeId: Node.Id,
		i: DataInput<any>,
	): Effect.Effect<unknown, E, R> =>
		Effect.gen(function* () {
			const incoming = opts.connectionIndex.incoming(nodeId, String(i.id));
			if (Option.isNone(incoming)) return yield* opts.defaultValue(i);

			const [fromNodeId, fromOutputId] = incoming.value;
			const isPure = yield* opts.isPureNode(fromNodeId);

			if (isPure) {
				const status = pureStatus.get(String(fromNodeId));
				if (status === "running") {
					return yield* Effect.dieMessage(
						`Pure node cycle detected at node ${String(fromNodeId)}`,
					);
				}

				if (status !== "done") {
					pureStatus.set(String(fromNodeId), "running");
					yield* opts.evaluatePureNode({
						nodeId: fromNodeId,
						getInput: (ii) => getInputFor(fromNodeId, ii),
						setOutput: (out, v) =>
							pureOutputs.set(fromNodeId, String(out.id), v),
					});
					pureStatus.set(String(fromNodeId), "done");
				}

				const v = pureOutputs.get(fromNodeId, fromOutputId);
				if (Option.isNone(v)) {
					return yield* Effect.dieMessage(
						`Pure node ${String(fromNodeId)} did not produce output '${fromOutputId}'`,
					);
				}
				return v.value;
			}

			const v = opts.execOutputs.get(fromNodeId, fromOutputId);
			if (Option.isNone(v)) {
				return yield* Effect.dieMessage(
					`Upstream node ${String(fromNodeId)} has no cached output '${fromOutputId}'`,
				);
			}
			return v.value;
		});

	return {
		getInput: (i: DataInput<any>) => getInputFor(opts.currentNodeId, i),
		pureOutputs,
	};
};

/**
 * New-style node runner built on the extracted utilities.
 *
 * - IO inputs are materialized before `run` is evaluated.
 * - NodeExecutionContext is provided for the duration of the run.
 */
export const runNode = <A, E, R, P>(opts: {
	nodeId: Node.Id;
	shape: unknown;
	properties: P;
	getInput: (i: DataInput<any>) => Effect.Effect<unknown, E, R>;
	setOutput: (out: DataOutput<any>, v: unknown) => void;
	run: (ctx: {
		io: unknown;
		properties: P;
	}) => Effect.Effect<A, E, R | NodeExecutionContext>;
}): Effect.Effect<A, E, R> =>
	Effect.gen(function* () {
		const io = yield* makeIOShape(opts.shape, opts.getInput, opts.setOutput);

		return yield* opts
			.run({ io, properties: opts.properties })
			.pipe(
				Effect.provideService(NodeExecutionContext, {
					node: { id: opts.nodeId },
				}),
			);
	}).pipe(
		Effect.withSpan("runNode", { attributes: { "node-id": opts.nodeId } }),
	);
