import type { Option } from "@macrograph/option";
import { Disposable } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";
import { batch } from "solid-js";
import { createMutable } from "solid-js/store";

import { pinIsInput, pinIsOutput, pinsCanConnect } from "../utils";
import {
	CommentBox,
	type CommentBoxArgs,
	type GetNodeSize,
} from "./CommentBox";
import {
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	type Pin,
	type ScopeInput,
	type ScopeOutput,
} from "./IO";
import { Node, type NodeArgs } from "./Node";
import type { Project } from "./Project";
import { Variable, type VariableArgs } from "./Variable";

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

	idCounter = 0;

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

		return box;
	}

	createVariable(args: Omit<VariableArgs, "id" | "owner">) {
		const id = this.generateId();

		this.variables.push(new Variable({ ...args, id, owner: this }));

		return id;
	}

	setVariableValue(id: number, value: any) {
		const variable = this.variables.find((v) => v.id === id);
		if (variable) variable.value = value;
	}

	removeVariable(id: number) {
		const index = this.variables.findIndex((v) => v.id === id);
		if (index === -1) return;

		for (const v of this.variables.splice(index, 1)) {
			v.dispose();
		}
	}

	connectPins(
		output: DataOutput<any> | ExecOutput | ScopeOutput,
		input: DataInput<any> | ExecInput | ScopeInput,
	) {
		const status = (() => {
			if (!pinsCanConnect(output, input)) return false;

			const outRef = makeIORef(output);
			const inRef = makeIORef(input);

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

		return status;
	}

	disconnectPin(pin: Pin) {
		batch(() => {
			const ref = makeIORef(pin);

			if (pinIsOutput(pin)) {
				this.connections.delete(ref);
			} else {
				if (pin instanceof ExecInput) {
					for (const conn of pin.connections) {
						this.connections.delete(makeIORef(conn));
					}
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

			this.project.events.emit("modified");
		});
	}

	deleteNode(node: Node) {
		for (const i of node.state.inputs) {
			this.disconnectPin(i);
		}
		for (const o of node.state.outputs) {
			this.disconnectPin(o);
		}

		this.nodes.delete(node.id);
		node.dispose();
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
				this.deleteNode(node);
			}
		});
	}

	async rename(name: string) {
		this.name = name;
	}
}
