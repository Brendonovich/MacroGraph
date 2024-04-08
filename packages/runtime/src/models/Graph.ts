import { batch } from "solid-js";
import { createMutable } from "solid-js/store";
import { ReactiveMap } from "@solid-primitives/map";
import { z } from "zod";
import { Option } from "@macrograph/option";
import { Disposable } from "@macrograph/typesystem";

import {
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	Pin,
	ScopeInput,
	ScopeOutput,
} from "./IO";
import { pinIsInput, pinIsOutput, pinsCanConnect } from "../utils";
import { Node, NodeArgs } from "./Node";
import { CommentBox, CommentBoxArgs, GetNodeSize } from "./CommentBox";
import { Project } from "./Project";
import { Variable, VariableArgs } from "./Variable";
import { SerializedConnection, SerializedGraph } from "./serialized";

export interface GraphArgs {
	id: number;
	name: string;
	project: Project;
}

export type IORef = `${number}:${"i" | "o"}:${string}`;

export function splitIORef(ref: IORef) {
	const [nodeId, type, ...ioId] = ref.split(":") as [
		string,
		"i" | "o",
		...string[],
	];

	return {
		type,
		nodeId: Number(nodeId),
		ioId: ioId.join(":"),
	};
}

export function makeIORef(io: Pin): IORef {
	return `${io.node.id}:${pinIsInput(io) ? "i" : "o"}:${io.id}`;
}

export type Connections = ReactiveMap<IORef, Array<IORef>>;

export class Graph extends Disposable {
	id: number;
	name: string;
	project: Project;

	nodes = new ReactiveMap<number, Node>();
	commentBoxes = new ReactiveMap<number, CommentBox>();
	variables: Array<Variable> = [];
	connections: Connections = new ReactiveMap();

	private idCounter = 0;

	constructor(args: GraphArgs) {
		super();

		this.id = args.id;
		this.name = args.name;
		this.project = args.project;

		return createMutable(this);
	}

	get core() {
		return this.project.core;
	}

	generateId() {
		return this.idCounter++;
	}

	createNode(args: Omit<NodeArgs, "graph" | "id">) {
		const id = this.generateId();

		const node = new Node({ ...args, id, graph: this });

		this.nodes.set(id, node);

		this.addDisposeListener(() => node.dispose());

		this.project.save();

		return node;
	}

	createCommentBox(args: Omit<CommentBoxArgs, "graph" | "id">) {
		const id = this.generateId();

		const box = new CommentBox({
			...args,
			id,
			graph: this,
		});

		this.commentBoxes.set(id, box);

		this.project.save();

		return box;
	}

	createVariable(args: Omit<VariableArgs, "id" | "owner">) {
		const id = this.generateId();

		this.variables.push(new Variable({ ...args, id, owner: this }));

		this.project.save();

		return id;
	}

	setVariableValue(id: number, value: any) {
		const variable = this.variables.find((v) => v.id === id);
		if (variable) variable.value = value;

		this.project.save();
	}

	removeVariable(id: number) {
		const index = this.variables.findIndex((v) => v.id === id);
		if (index === -1) return;

		const v = this.variables.splice(index, 1);
		v.forEach((v) => v.dispose());
	}

	connectPins(
		output: DataOutput<any> | ExecOutput | ScopeOutput,
		input: DataInput<any> | ExecInput | ScopeInput,
	) {
		const status = (() => {
			if (!pinsCanConnect(output, input)) return false;

			const outRef = makeIORef(output),
				inRef = makeIORef(input);

			if (output instanceof DataOutput && input instanceof DataInput) {
				this.disconnectPin(input);

				const outputConnections =
					this.connections.get(outRef) ??
					(() => {
						const array: Array<IORef> = createMutable([]);
						this.connections.set(outRef, array);
						return array;
					})();
				outputConnections.push(inRef);
			} else if (output instanceof ExecOutput && input instanceof ExecInput) {
				this.disconnectPin(output);

				const outputConnections =
					this.connections.get(outRef) ??
					(() => {
						const array: Array<IORef> = createMutable([]);
						this.connections.set(outRef, array);
						return array;
					})();
				outputConnections.push(inRef);
			} else {
				this.disconnectPin(input);
				this.disconnectPin(output);

				this.connections.set(outRef, createMutable([inRef]));
			}

			return true;
		})();

		this.project.save();

		return status;
	}

	disconnectPin(pin: Pin) {
		const ref = makeIORef(pin);

		if (pinIsOutput(pin)) {
			this.connections.delete(ref);
		} else {
			if (pin instanceof ExecInput) {
				batch(() => {
					pin.connections.forEach((conn) => {
						this.connections.delete(makeIORef(conn));
					});
				});
			} else {
				(
					pin.connection as unknown as Option<DataOutput<any> | ScopeOutput>
				).peek((conn) => {
					const connArray = this.connections.get(makeIORef(conn));
					if (!connArray) return;

					const index = connArray.indexOf(ref);
					if (index === -1) return;

					connArray.splice(index, 1);
				});
			}
		}

		this.project.save();
	}

	deleteNode(node: Node, save = true) {
		node.state.inputs.forEach((i) => this.disconnectPin(i));
		node.state.outputs.forEach((o) => this.disconnectPin(o));

		this.nodes.delete(node.id);
		node.dispose();

		if (save) this.project.save();
	}

	deleteCommentbox(
		box: CommentBox,
		getNodeSize: GetNodeSize,
		deleteNodes = false,
	) {
		batch(() => {
			this.commentBoxes.delete(box.id);

			if (!deleteNodes) return;

			const nodes = box.getNodes(this.nodes.values(), getNodeSize);

			for (const node of nodes) {
				this.deleteNode(node, false);
			}
		});

		this.project.save();
	}

	async rename(name: string) {
		this.name = name;

		this.project.save();
	}

	serialize(): z.infer<typeof SerializedGraph> {
		return {
			id: this.id,
			name: this.name,
			nodeIdCounter: this.idCounter,
			nodes: Object.fromEntries(
				[...this.nodes.entries()].map(([id, node]) => [id, node.serialize()]),
			),
			commentBoxes: [...this.commentBoxes.values()].map((box) =>
				box.serialize(),
			),
			variables: this.variables.map((v) => v.serialize()),
			connections: (() => {
				const serialized: Array<z.infer<typeof SerializedConnection>> = [];

				for (const [refStr, conns] of this.connections) {
					const ref = splitIORef(refStr);

					if (ref.type === "i") continue;

					conns.forEach((conn) => {
						const connRef = splitIORef(conn);

						serialized.push({
							from: {
								node: ref.nodeId,
								output: ref.ioId,
							},
							to: {
								node: connRef.nodeId,
								input: connRef.ioId,
							},
						});
					});
				}

				return serialized;
			})(),
		};
	}

	static deserialize(project: Project, data: z.infer<typeof SerializedGraph>) {
		const graph = new Graph({
			project,
			id: data.id,
			name: data.name,
		});

		graph.idCounter = data.nodeIdCounter;

		graph.variables = data.variables.map((v) => Variable.deserialize(v, graph));

		batch(() => {
			graph.nodes = new ReactiveMap(
				Object.entries(data.nodes)
					.map(([idStr, serializedNode]) => {
						const id = z.coerce.number().parse(idStr);
						const node = Node.deserialize(graph, serializedNode);

						if (node === null) return null;

						return [id, node] as [number, Node];
					})
					.filter(Boolean) as [number, Node][],
			);

			graph.commentBoxes = new ReactiveMap(
				data.commentBoxes.map((box) => {
					const id = box.id ?? graph.generateId();

					return [id, new CommentBox({ ...box, id, graph })];
				}),
			);

			graph.connections = new ReactiveMap();
			deserializeConnections(data.connections, graph.connections);
		});

		for (const node of graph.nodes.values()) {
			const nodeData = data.nodes[node.id]!;

			node.state.inputs.forEach((i) => {
				const defaultValue = nodeData.defaultValues[i.id];

				if (defaultValue === undefined || !(i instanceof DataInput)) return;

				i.defaultValue = defaultValue;
			});
		}

		return graph;
	}
}

export function deserializeConnections(
	connections: Array<z.infer<typeof SerializedConnection>>,
	target: Connections,
	nodeIdMap?: Map<number, number>,
) {
	connections.forEach((conn) => {
		const fromNode = nodeIdMap?.get(conn.from.node) ?? conn.from.node;
		const toNode = nodeIdMap?.get(conn.to.node) ?? conn.to.node;

		const outRef: IORef = `${fromNode}:o:${conn.from.output}`,
			inRef: IORef = `${toNode}:i:${conn.to.input}`;

		const outConns =
			target.get(outRef) ??
			(() => {
				const array: Array<IORef> = createMutable([]);
				target.set(outRef, array);
				return array;
			})();

		outConns.push(inRef);
	});
}
