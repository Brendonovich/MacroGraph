import type { ClipboardItem } from "@macrograph/clipboard";
import type { Option } from "@macrograph/option";
import {
	type Core,
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	type IORef,
	type InputPin,
	type NodeSchema,
	type OutputPin,
	type ResourceType,
	ScopeInput,
	ScopeOutput,
	type Variable,
	type XY,
	makeIORef,
	pinConnections,
	pinIsOutput,
	splitIORef,
} from "@macrograph/runtime";
import {
	deserializeCommentBox,
	deserializeConnections,
	deserializeCustomEvent,
	deserializeCustomEventField,
	deserializeCustomStruct,
	deserializeCustomStructField,
	deserializeGraph,
	deserializeNode,
	deserializeVariable,
	serde,
	serializeCommentBox,
	serializeCustomEvent,
	serializeCustomEventField,
	serializeCustomStruct,
	serializeCustomStructField,
	serializeGraph,
	serializeNode,
	serializeVariable,
} from "@macrograph/runtime-serde";
import { type PrimitiveType, t } from "@macrograph/typesystem";
import { batch } from "solid-js";
import { createMutable } from "solid-js/store";
import * as v from "valibot";

type HistoryEntry<T> = T extends object ? T : never;
type PrepareOptions = { ephemeral?: boolean };
type HistoryAction<R, P, I = void> = {
	prepare(core: Core, input: I, opts?: PrepareOptions): R;
	perform(core: Core, entry: HistoryEntry<R>): P;
	rewind(core: Core, entry: HistoryEntry<R>): void;
};

function historyAction<E, P, I = void>(args: HistoryAction<E, P, I>) {
	return args;
}

export type VariableLocation =
	| { location: "project" }
	| { location: "graph"; graphId: number };

export type SelectionItem = { type: "node" | "commentBox"; id: number };
export type GraphItemPositionInput = {
	itemId: number;
	itemVariant: "node" | "commentBox";
	position: XY;
	from?: XY;
};
export type CreateNodeInput = {
	graphId: number;
	schema: NodeSchema;
	position: XY;
	connection?: {
		fromPinId: string;
		to: {
			nodeId: number;
			variant: "o" | "i";
			pinId: string;
		};
	};
};

const historyActions = {
	createGraph: historyAction({
		prepare(core) {
			return { id: core.project.generateGraphId() };
		},
		perform(core, entry) {
			return core.project.createGraph({ id: entry.id });
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.id);
			if (!graph) return;

			core.project.graphs.delete(entry.id);
			graph.dispose();
		},
	}),
	setGraphName: historyAction({
		prepare(core, input: { graphId: number; name: string }) {
			const graph = core.project.graphs.get(input.graphId);
			if (!graph) return;

			return {
				...input,
				prev: graph.name,
			};
		},
		perform(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			graph.name = entry.name;
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			graph.name = entry.prev;
		},
	}),
	deleteGraph: historyAction({
		prepare(core, input: { graphId: number }) {
			const graph = core.project.graphs.get(input.graphId);
			if (!graph) return;

			return {
				graphId: input.graphId,
				data: serializeGraph(graph),
			};
		},
		perform(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			core.project.graphs.delete(entry.graphId);
			graph.dispose();
		},
		rewind(core, entry) {
			const graph = deserializeGraph(
				core.project,
				v.parse(serde.Graph, entry.data),
			);
			core.project.graphs.set(graph.id, graph);
		},
	}),
	createNode: historyAction({
		prepare(core, input: CreateNodeInput) {
			const graph = core.project.graphs.get(input.graphId);
			if (!graph) return;

			return { ...input, nodeId: graph.generateId() };
		},
		perform(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			const node = graph.createNode({
				id: entry.nodeId,
				schema: entry.schema,
				position: entry.position,
			});

			const { connection } = entry;
			if (connection) {
				let output: OutputPin | undefined;
				let input: InputPin | undefined;

				const connectionNode = graph.nodes.get(connection.to.nodeId);
				if (connectionNode) {
					if (connection.to.variant === "o") {
						output = connectionNode.output(connection.to.pinId);
						input = node.input(connection.fromPinId);
					} else {
						output = node.output(connection.fromPinId);
						input = connectionNode.input(connection.to.pinId);
					}
				}

				if (output && input) graph.connectPins(output, input);
			}

			return node;
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			const node = graph.nodes.get(entry.nodeId);
			if (!node) return;

			graph.deleteNode(node);
		},
	}),
	setNodeProperty: historyAction({
		prepare(
			core,
			input: {
				graphId: number;
				nodeId: number;
				propertyId: string;
				value: any;
			},
		) {
			const node = core.project.graphs
				.get(input.graphId)
				?.nodes.get(input.nodeId);
			if (!node) return;

			return {
				graphId: input.graphId,
				nodeId: input.nodeId,
				propertyId: input.propertyId,
				prev: node.state.properties[input.propertyId],
				value: input.value,
			};
		},
		perform(core, entry) {
			const node = core.project.graphs
				.get(entry.graphId)
				?.nodes.get(entry.nodeId);
			if (!node) return;

			node.setProperty(entry.propertyId, entry.value);
		},
		rewind(core, entry) {
			const node = core.project.graphs
				.get(entry.graphId)
				?.nodes.get(entry.nodeId);
			if (!node) return;

			node.setProperty(entry.propertyId, entry.prev);
		},
	}),
	setNodeName: historyAction({
		prepare(
			core,
			input: {
				graphId: number;
				nodeId: number;
				name: string;
			},
		) {
			const node = core.project.graphs
				.get(input.graphId)
				?.nodes.get(input.nodeId);
			if (!node) return;

			return { ...input, prev: node.state.name };
		},
		perform(core, entry) {
			const node = core.project.graphs
				.get(entry.graphId)
				?.nodes.get(entry.nodeId);
			if (!node) return;

			node.state.name = entry.name;
		},
		rewind(core, entry) {
			const node = core.project.graphs
				.get(entry.graphId)
				?.nodes.get(entry.nodeId);
			if (!node) return;

			node.state.name = entry.prev;
		},
	}),
	setNodeFoldPins: historyAction({
		prepare(
			core,
			input: {
				graphId: number;
				nodeId: number;
				foldPins: boolean;
			},
		) {
			const node = core.project.graphs
				.get(input.graphId)
				?.nodes.get(input.nodeId);
			if (!node) return;

			return { ...input, prev: node.state.foldPins };
		},
		perform(core, entry) {
			const node = core.project.graphs
				.get(entry.graphId)
				?.nodes.get(entry.nodeId);
			if (!node) return;

			node.state.foldPins = entry.foldPins;
		},
		rewind(core, entry) {
			const node = core.project.graphs
				.get(entry.graphId)
				?.nodes.get(entry.nodeId);
			if (!node) return;

			node.state.foldPins = entry.prev;
		},
	}),
	createCommentBox: historyAction({
		prepare(core, input: { graphId: number; position: XY }) {
			const graph = core.project.graphs.get(input.graphId);
			if (!graph) return;

			return {
				graphId: input.graphId,
				commentBoxId: graph.generateId(),
				position: input.position,
			};
		},
		perform(core, entry) {
			return core.project.graphs.get(entry.graphId)?.createCommentBox({
				id: entry.commentBoxId,
				position: entry.position,
				size: { x: 400, y: 200 },
				text: "Comment",
			});
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			const box = graph.commentBoxes.get(entry.commentBoxId);
			if (!box) return;

			graph.deleteCommentbox(box);
		},
	}),
	setCommentBoxTint: historyAction({
		prepare(
			core,
			input: { graphId: number; boxId: number; tint: string; prev?: string },
		) {
			const box = core.project.graphs
				.get(input.graphId)
				?.commentBoxes.get(input.boxId);
			if (!box) return;

			return {
				...input,
				prev: input.prev ?? box.tint,
			};
		},
		perform(core, entry) {
			const box = core.project.graphs
				.get(entry.graphId)
				?.commentBoxes.get(entry.boxId);
			if (!box) return;

			box.tint = entry.tint;
		},
		rewind(core, entry) {
			const box = core.project.graphs
				.get(entry.graphId)
				?.commentBoxes.get(entry.boxId);
			if (!box) return;

			box.tint = entry.prev;
		},
	}),
	setCommentBoxText: historyAction({
		prepare(core, input: { graphId: number; boxId: number; text: string }) {
			const box = core.project.graphs
				.get(input.graphId)
				?.commentBoxes.get(input.boxId);
			if (!box) return;

			return {
				...input,
				prev: box.text,
			};
		},
		perform(core, entry) {
			const box = core.project.graphs
				.get(entry.graphId)
				?.commentBoxes.get(entry.boxId);
			if (!box) return;

			box.text = entry.text;
		},
		rewind(core, entry) {
			const box = core.project.graphs
				.get(entry.graphId)
				?.commentBoxes.get(entry.boxId);
			if (!box) return;

			box.text = entry.prev;
		},
	}),
	setCommentBoxBounds: historyAction({
		prepare(
			core,
			input: {
				graphId: number;
				boxId: number;
				position: XY;
				size: XY;
				prev?: { position: XY; size: XY };
			},
		) {
			const box = core.project.graphs
				.get(input.graphId)
				?.commentBoxes.get(input.boxId);
			if (!box) return;

			return {
				...input,
				prev: input.prev ?? {
					position: { ...box.position },
					size: { ...box.size },
				},
			};
		},
		perform(core, entry) {
			const box = core.project.graphs
				.get(entry.graphId)
				?.commentBoxes.get(entry.boxId);
			if (!box) return;

			box.size = { ...entry.size };
			box.position = { ...entry.position };
		},
		rewind(core, entry) {
			const box = core.project.graphs
				.get(entry.graphId)
				?.commentBoxes.get(entry.boxId);
			if (!box) return;

			box.size = { ...entry.prev.size };
			box.position = { ...entry.prev.position };
		},
	}),
	setGraphItemPositions: historyAction({
		prepare(
			_,
			input: {
				graphId: number;
				items: Array<GraphItemPositionInput>;
			},
		) {
			return input;
		},
		perform(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			for (const item of entry.items) {
				if (item.itemVariant === "node") {
					const node = graph.nodes.get(item.itemId);
					if (!node) continue;

					node.state.position = { ...item.position };
				} else {
					const box = graph.commentBoxes.get(item.itemId);
					if (!box) continue;

					box.position = { ...item.position };
				}
			}
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			for (const item of entry.items) {
				if (!item.from) continue;

				if (item.itemVariant === "node") {
					const node = graph.nodes.get(item.itemId);
					if (!node) continue;

					node.state.position = { ...item.from };
				} else {
					const box = graph.commentBoxes.get(item.itemId);
					if (!box) continue;

					box.position = { ...item.from };
				}
			}
		},
	}),
	deleteGraphItems: historyAction({
		prepare(
			core,
			input: {
				graphId: number;
				items: Array<SelectionItem>;
			},
		) {
			type Entry = {
				graphId: number;
				nodes: Array<v.InferInput<typeof serde.Node>>;
				connections: Array<v.InferInput<typeof serde.Connection>>;
				commentBoxes: Array<v.InferInput<typeof serde.CommentBox>>;
			};

			const { graphId, items } = input;
			const graph = core.project.graphs.get(graphId);
			if (!graph) return;

			const entry: Entry = {
				graphId,
				nodes: [],
				connections: [],
				commentBoxes: [],
			};

			for (const { type, id } of items) {
				if (type === "node") {
					const node = graph.nodes.get(id);
					if (!node) continue;

					for (const output of node.io.outputs) {
						const ref = makeIORef(output);

						const connections = graph.connections.get(ref);
						if (!connections) continue;

						for (const connectionRef of connections) {
							const outputData = splitIORef(ref);
							const inputData = splitIORef(connectionRef);

							entry.connections.push({
								from: { node: outputData.nodeId, output: outputData.ioId },
								to: { node: inputData.nodeId, input: inputData.ioId },
							});
						}
					}

					for (const input of node.io.inputs) {
						if (input instanceof ExecInput) {
							for (const connOutput of input.connections) {
								if (
									items.some(
										(i) => i.type === "node" && i.id === connOutput.node.id,
									)
								)
									continue;

								entry.connections.push({
									from: { node: connOutput.node.id, output: connOutput.id },
									to: { node: input.node.id, input: input.id },
								});
							}
						} else if (
							input instanceof DataInput ||
							input instanceof ScopeInput
						) {
							(input.connection as Option<DataOutput<any> | ScopeOutput>).peek(
								(connOutput) => {
									if (
										items.some(
											(i) => i.type === "node" && i.id === connOutput.node.id,
										)
									)
										return;

									entry.connections.push({
										from: { node: connOutput.node.id, output: connOutput.id },
										to: { node: input.node.id, input: input.id },
									});
								},
							);
						}
					}

					entry.nodes.push(serializeNode(node));
				} else {
					const box = graph.commentBoxes.get(id);
					if (!box) continue;

					entry.commentBoxes.push(serializeCommentBox(box));
				}
			}

			return entry;
		},
		perform(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			for (const nodeData of entry.nodes) {
				const node = graph.nodes.get(nodeData.id);
				if (!node) continue;

				graph.deleteNode(node);
			}

			for (const boxData of entry.commentBoxes) {
				if (boxData.id === undefined) continue;
				const box = graph.commentBoxes.get(boxData.id);
				if (!box) continue;

				graph.deleteCommentbox(box);
			}
			console.log("delete");
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			for (const nodeData of entry.nodes.reverse()) {
				const node = deserializeNode(graph, v.parse(serde.Node, nodeData));
				if (!node) continue;

				graph.nodes.set(node.id, node);
			}

			for (const boxData of entry.commentBoxes.reverse()) {
				const box = deserializeCommentBox(
					graph,
					v.parse(serde.CommentBox, boxData),
				);
				if (!box) continue;

				graph.commentBoxes.set(box.id, box);
			}

			const connections = v.parse(v.array(serde.Connection), entry.connections);
			deserializeConnections(connections, graph.connections);
		},
	}),
	connectIO: historyAction({
		prepare(
			core,
			input: {
				graphId: number;
				out: { nodeId: number; pinId: string };
				in: { nodeId: number; pinId: string };
			},
		) {
			const graph = core.project.graphs.get(input.graphId);
			if (!graph) return;

			const outPin = graph.nodes.get(input.out.nodeId)?.output(input.out.pinId);
			const inPin = graph.nodes.get(input.in.nodeId)?.input(input.in.pinId);
			if (!outPin || !inPin) return;

			const prevConnections: Array<v.InferInput<typeof serde.Connection>> = [];

			if (outPin instanceof DataOutput && inPin instanceof DataInput) {
				inPin.connection.peek((out) => {
					prevConnections.push({
						from: { node: out.node.id, output: out.id },
						to: { node: inPin.node.id, input: inPin.id },
					});
				});
			} else if (outPin instanceof ExecOutput && inPin instanceof ExecInput) {
				outPin.connection().peek((inPin) => {
					prevConnections.push({
						from: { node: outPin.node.id, output: outPin.id },
						to: { node: inPin.node.id, input: inPin.id },
					});
				});
			} else if (outPin instanceof ScopeOutput && inPin instanceof ScopeInput) {
				outPin.connection().peek((inPin) => {
					prevConnections.push({
						from: { node: outPin.node.id, output: outPin.id },
						to: { node: inPin.node.id, input: inPin.id },
					});
				});
				inPin.connection.peek((out) => {
					prevConnections.push({
						from: { node: out.node.id, output: out.id },
						to: { node: inPin.node.id, input: inPin.id },
					});
				});
			} else return;

			return { ...input, prevConnections };
		},
		perform(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			const outNode = graph.nodes.get(entry.out.nodeId);
			const inNode = graph.nodes.get(entry.in.nodeId);
			if (!outNode || !inNode) return;

			const outPin = outNode.output(entry.out.pinId);
			const inPin = inNode.input(entry.in.pinId);
			if (!outPin || !inPin) return;

			graph.connectPins(outPin, inPin);
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			const outNode = graph.nodes.get(entry.out.nodeId);
			const inNode = graph.nodes.get(entry.in.nodeId);
			if (!outNode || !inNode) return;

			const outPin = outNode.output(entry.out.pinId);
			const inPin = inNode.input(entry.in.pinId);
			if (!outPin || !inPin) return;

			const outConnections = graph.connections.get(makeIORef(outPin));
			if (!outConnections) return;

			const index = outConnections.findIndex((ref) => ref === makeIORef(inPin));
			outConnections.splice(index, 1);

			const prevConnections = v.parse(
				v.array(serde.Connection),
				entry.prevConnections,
			);
			for (const prev of prevConnections) {
				const fromNode = graph.nodes.get(prev.from.node);
				const toNode = graph.nodes.get(prev.to.node);
				if (!fromNode || !toNode) continue;

				const fromPin = fromNode.output(prev.from.output);
				const toPin = toNode.input(prev.to.input);
				if (!fromPin || !toPin) continue;

				graph.connectPins(fromPin, toPin);
			}
		},
	}),
	disconnectIO: historyAction({
		prepare(
			core,
			input: {
				graphId: number;
				ioRef: IORef;
			},
		) {
			const graph = core.project.graphs.get(input.graphId);
			if (!graph) return;

			const io = splitIORef(input.ioRef);

			const node = graph.nodes.get(io.nodeId);
			if (!node) return;

			const pin = io.type === "i" ? node.input(io.ioId) : node.output(io.ioId);
			if (!pin) return;

			return { ...input, prevConnections: pinConnections(pin) };
		},
		perform(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			const io = splitIORef(entry.ioRef);

			const node = graph.nodes.get(io.nodeId);
			if (!node) return;

			const pin = io.type === "i" ? node.input(io.ioId) : node.output(io.ioId);
			if (!pin) return;

			graph.disconnectPin(pin);
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			const io = splitIORef(entry.ioRef);

			const node = graph.nodes.get(io.nodeId);
			if (!node) return;

			const pin = io.type === "i" ? node.input(io.ioId) : node.output(io.ioId);
			if (!pin) return;

			if (pinIsOutput(pin)) {
				for (const prev of entry.prevConnections) {
					const input = graph.nodes
						.get(prev.nodeId)
						?.io.inputs.find((i) => i.id === prev.id);
					if (!input) continue;

					graph.connectPins(pin, input);
				}
			} else {
				for (const prev of entry.prevConnections) {
					const output = graph.nodes
						.get(prev.nodeId)
						?.io.outputs.find((o) => o.id === prev.id);
					if (!output) continue;

					graph.connectPins(output, pin);
				}
			}
		},
	}),
	createCustomStruct: historyAction({
		prepare(core) {
			return { id: core.project.generateCustomTypeId() };
		},
		perform(core, entry) {
			core.project.createCustomStruct(entry);
		},
		rewind(core, entry) {
			core.project.customStructs.delete(entry.id);
		},
	}),
	setCustomStructName: historyAction({
		prepare(core, input: { structId: number; name: string }) {
			const struct = core.project.customStructs.get(input.structId);
			if (!struct) return;

			return { ...input, prev: struct.name };
		},
		perform(core, entry) {
			const struct = core.project.customStructs.get(entry.structId);
			if (!struct) return;

			struct.name = entry.name;
		},
		rewind(core, entry) {
			const struct = core.project.customStructs.get(entry.structId);
			if (!struct) return;

			struct.name = entry.prev;
		},
	}),
	deleteCustomStruct: historyAction({
		prepare(core, input: { structId: number }) {
			const struct = core.project.customStructs.get(input.structId);
			if (!struct) return;

			const data = serializeCustomStruct(struct);

			return { ...input, data };
		},
		perform(core, entry) {
			core.project.customStructs.delete(entry.structId);
		},
		rewind(core, entry) {
			const struct = deserializeCustomStruct(
				core.project,
				v.parse(serde.CustomStruct, entry.data),
			);

			core.project.customStructs.set(entry.structId, struct);
		},
	}),
	createCustomStructField: historyAction({
		prepare(core, input: { structId: number }) {
			const struct = core.project.customStructs.get(input.structId);
			if (!struct) return;

			return { ...input, id: struct.fieldIdCounter++ };
		},
		perform(core, entry) {
			const struct = core.project.customStructs.get(entry.structId);
			if (!struct) return;

			return struct.createField({ id: entry.id });
		},
		rewind(core, entry) {
			const struct = core.project.customStructs.get(entry.structId);
			if (!struct) return;

			struct.removeField(entry.id.toString());
		},
	}),
	setCustomStructFieldName: historyAction({
		prepare(core, input: { structId: number; fieldId: string; name: string }) {
			const field = core.project.customStructs.get(input.structId)?.fields[
				input.fieldId
			];
			if (!field) return;

			return { ...input, prev: field.name };
		},
		perform(core, entry) {
			const field = core.project.customStructs.get(entry.structId)?.fields[
				entry.fieldId
			];
			if (!field) return;

			field.name = entry.name;
		},
		rewind(core, entry) {
			const field = core.project.customStructs.get(entry.structId)?.fields[
				entry.fieldId
			];
			if (!field) return;

			field.name = entry.prev;
		},
	}),
	setCustomStructFieldType: historyAction({
		prepare(core, input: { structId: number; fieldId: string; type: t.Any }) {
			const field = core.project.customStructs.get(input.structId)?.fields[
				input.fieldId
			];
			if (!field) return;

			return { ...input, prev: field.type };
		},
		perform(core, entry) {
			const struct = core.project.customStructs.get(entry.structId);
			if (!struct) return;

			struct.editFieldType(entry.fieldId, entry.type);
		},
		rewind(core, entry) {
			const struct = core.project.customStructs.get(entry.structId);
			if (!struct) return;

			struct.editFieldType(entry.fieldId, entry.prev);
		},
	}),
	deleteCustomStructField: historyAction({
		prepare(core, input: { structId: number; fieldId: string }) {
			const field = core.project.customStructs.get(input.structId)?.fields[
				input.fieldId
			];
			if (!field) return;

			return { ...input, data: serializeCustomStructField(field) };
		},
		perform(core, entry) {
			const struct = core.project.customStructs.get(entry.structId);
			if (!struct) return;

			struct.removeField(entry.fieldId);
		},
		rewind(core, entry) {
			const struct = core.project.customStructs.get(entry.structId);
			if (!struct) return;

			deserializeCustomStructField(
				struct,
				v.parse(serde.CustomStructField, entry.data),
			);
		},
	}),
	createCustomEvent: historyAction({
		prepare(core) {
			return { id: core.project.customEventIdCounter++ };
		},
		perform(core, entry) {
			core.project.createCustomEvent({ id: entry.id });
		},
		rewind(core, entry) {
			core.project.customEvents.delete(entry.id);
		},
	}),
	setCustomEventName: historyAction({
		prepare(core, input: { eventId: number; name: string }) {
			const event = core.project.customEvents.get(input.eventId);
			if (!event) return;

			return { ...input, prev: event.name };
		},
		perform(core, entry) {
			const event = core.project.customEvents.get(entry.eventId);
			if (!event) return;

			event.name = entry.name;
		},
		rewind(core, entry) {
			const event = core.project.customEvents.get(entry.eventId);
			if (!event) return;

			event.name = entry.prev;
		},
	}),
	deleteCustomEvent: historyAction({
		prepare(core, input: { eventId: number }) {
			const event = core.project.customEvents.get(input.eventId);
			if (!event) return;

			const data = serializeCustomEvent(event);

			return { ...input, data };
		},
		perform(core, entry) {
			core.project.customEvents.delete(entry.eventId);
		},
		rewind(core, entry) {
			const struct = deserializeCustomEvent(
				core.project,
				v.parse(serde.CustomEvent, entry.data),
			);

			core.project.customEvents.set(entry.eventId, struct);
		},
	}),
	createCustomEventField: historyAction({
		prepare(core, input: { eventId: number }) {
			const event = core.project.customEvents.get(input.eventId);
			if (!event) return;

			return { ...input, id: event.fieldIdCounter++ };
		},
		perform(core, entry) {
			const event = core.project.customEvents.get(entry.eventId);
			if (!event) return;

			return event.createField({ id: entry.id });
		},
		rewind(core, entry) {
			const event = core.project.customEvents.get(entry.eventId);
			if (!event) return;

			event.deleteField(entry.id);
		},
	}),
	setCustomEventFieldName: historyAction({
		prepare(core, input: { eventId: number; fieldId: number; name: string }) {
			const field = core.project.customEvents
				.get(input.eventId)
				?.field(input.fieldId);
			if (!field) return;

			return { ...input, prev: field.name };
		},
		perform(core, entry) {
			const event = core.project.customEvents.get(entry.eventId);
			if (!event) return;

			event.editFieldName(entry.fieldId, entry.name);
		},
		rewind(core, entry) {
			const event = core.project.customEvents.get(entry.eventId);
			if (!event) return;

			event.editFieldName(entry.fieldId, entry.prev);
		},
	}),
	setCustomEventFieldType: historyAction({
		prepare(
			core,
			input: { eventId: number; fieldId: number; type: PrimitiveType },
		) {
			const field = core.project.customEvents
				.get(input.eventId)
				?.field(input.fieldId);
			if (!field) return;

			return { ...input, prev: field.type };
		},
		perform(core, entry) {
			const struct = core.project.customEvents.get(entry.eventId);
			if (!struct) return;

			struct.editFieldType(entry.fieldId, entry.type);
		},
		rewind(core, entry) {
			const struct = core.project.customEvents.get(entry.eventId);
			if (!struct) return;

			struct.editFieldType(entry.fieldId, entry.prev as any);
		},
	}),
	deleteCustomEventField: historyAction({
		prepare(core, input: { eventId: number; fieldId: number }) {
			const field = core.project.customEvents
				.get(input.eventId)
				?.fields.find((f) => f.id === input.fieldId);
			if (!field) return;

			return { ...input, data: serializeCustomEventField(field) };
		},
		perform(core, entry) {
			const event = core.project.customEvents.get(entry.eventId);
			if (!event) return;

			event.deleteField(entry.fieldId);
		},
		rewind(core, entry) {
			const event = core.project.customEvents.get(entry.eventId);
			if (!event) return;

			deserializeCustomEventField(
				event,
				v.parse(serde.CustomEventField, entry.data),
			);
		},
	}),
	createVariable: historyAction({
		prepare(core, input: VariableLocation) {
			if (input.location === "project")
				return {
					...input,
					id: core.project.generateId(),
				};

			const graph = core.project.graphs.get(input.graphId);
			if (!graph) return;

			return {
				...input,
				id: graph.generateId(),
			};
		},
		perform(core, entry) {
			if (entry.location === "project") {
				core.project.createVariable({
					id: entry.id,
					name: `Variable ${core.project.variables.length + 1}`,
					value: "",
					type: t.string(),
				});
			} else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				graph.createVariable({
					id: entry.id,
					name: `Variable ${graph.variables.length + 1}`,
					value: "",
					type: t.string(),
				});
			}
		},
		rewind(core, entry) {
			if (entry.location === "project") core.project.removeVariable(entry.id);
			else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				graph.removeVariable(entry.id);
			}
		},
	}),
	setVariableName: historyAction({
		prepare(
			core,
			input: VariableLocation & { variableId: number; name: string },
		) {
			let variable: Variable | undefined;

			if (input.location === "project") {
				variable = core.project.variables.find(
					(v) => v.id === input.variableId,
				);
			} else {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				variable = graph.variables.find((v) => v.id === input.variableId);
			}

			if (!variable) return;

			return { ...input, prev: variable.name };
		},
		perform(core, entry) {
			let variable: Variable | undefined;

			if (entry.location === "project") {
				variable = core.project.variables.find(
					(v) => v.id === entry.variableId,
				);
			} else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				variable = graph.variables.find((v) => v.id === entry.variableId);
			}

			if (!variable) return;

			variable.name = entry.name;
		},
		rewind(core, entry) {
			let variable: Variable | undefined;

			if (entry.location === "project") {
				variable = core.project.variables.find(
					(v) => v.id === entry.variableId,
				);
			} else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				variable = graph.variables.find((v) => v.id === entry.variableId);
			}

			if (!variable) return;

			variable.name = entry.prev;
		},
	}),
	setVariableValue: historyAction({
		prepare(
			core,
			input: VariableLocation & { variableId: number; value: any },
		) {
			let variable: Variable | undefined;

			if (input.location === "project") {
				variable = core.project.variables.find(
					(v) => v.id === input.variableId,
				);
			} else {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				variable = graph.variables.find((v) => v.id === input.variableId);
			}

			if (!variable) return;

			return { ...input, prev: variable.value };
		},
		perform(core, entry) {
			let variable: Variable | undefined;

			if (entry.location === "project") {
				variable = core.project.variables.find(
					(v) => v.id === entry.variableId,
				);
			} else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				variable = graph.variables.find((v) => v.id === entry.variableId);
			}

			if (!variable) return;

			variable.value = entry.value;
		},
		rewind(core, entry) {
			let variable: Variable | undefined;

			if (entry.location === "project") {
				variable = core.project.variables.find(
					(v) => v.id === entry.variableId,
				);
			} else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				variable = graph.variables.find((v) => v.id === entry.variableId);
			}

			if (!variable) return;

			variable.value = entry.value;
		},
	}),
	setVariableType: historyAction({
		prepare(
			core,
			input: VariableLocation & { variableId: number; type: t.Any },
		) {
			let variable: Variable | undefined;

			if (input.location === "project") {
				variable = core.project.variables.find(
					(v) => v.id === input.variableId,
				);
			} else {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				variable = graph.variables.find((v) => v.id === input.variableId);
			}

			if (!variable) return;

			return { ...input, prev: variable.type, prevValue: variable.value };
		},
		perform(core, entry) {
			let variable: Variable | undefined;

			if (entry.location === "project") {
				variable = core.project.variables.find(
					(v) => v.id === entry.variableId,
				);
			} else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				variable = graph.variables.find((v) => v.id === entry.variableId);
			}

			if (!variable) return;

			variable.type = entry.type;
			variable.value = entry.type.default();
		},
		rewind(core, entry) {
			let variable: Variable | undefined;

			if (entry.location === "project") {
				variable = core.project.variables.find(
					(v) => v.id === entry.variableId,
				);
			} else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				variable = graph.variables.find((v) => v.id === entry.variableId);
			}

			if (!variable) return;

			variable.type = entry.prev;
			variable.value = entry.prevValue;
		},
	}),
	deleteVariable: historyAction({
		prepare(core, input: VariableLocation & { variableId: number }) {
			let variable: Variable | undefined;
			let index: number | undefined;

			if (input.location === "project") {
				const i = core.project.variables.findIndex(
					(v) => v.id === input.variableId,
				);
				if (i === -1) return;
				index = i;
				variable = core.project.variables[i]!;
			} else {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				const i = graph.variables.findIndex((v) => v.id === input.variableId);
				if (i === -1) return;
				index = i;
				variable = graph.variables[i]!;
			}

			if (!variable) return;

			return { ...input, index, data: serializeVariable(variable) };
		},
		perform(core, entry) {
			if (entry.location === "project")
				core.project.removeVariable(entry.variableId);
			else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				graph.removeVariable(entry.variableId);
			}
		},
		rewind(core, entry) {
			if (entry.location === "project") {
				const variable = deserializeVariable(
					v.parse(serde.Variable, entry.data),
					core.project,
				);

				core.project.variables.splice(entry.index, 0, variable);
			} else {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				const variable = deserializeVariable(
					v.parse(serde.Variable, entry.data),
					graph,
				);

				graph.variables.splice(entry.index, 0, variable);
			}
		},
	}),
	createResource: historyAction({
		prepare(core, input: { type: ResourceType<any, any> }) {
			return { ...input, id: core.project.idCounter++ };
		},
		perform(core, entry) {
			return core.project.createResource({
				id: entry.id,
				type: entry.type,
				name: "New Resource",
			});
		},
		rewind(core, entry) {
			const resource = core.project.resources.get(entry.type);
			if (!resource) return;

			const itemIndex = resource.items.findIndex((i) => i.id === entry.id);
			if (itemIndex === -1) return;

			resource.items.splice(itemIndex, 1);

			if (resource.items.length) core.project.resources.delete(entry.type);
		},
	}),
	setResourceTypeDefault: historyAction({
		prepare(core, input: { defaultId: number; type: ResourceType<any, any> }) {
			const resource = core.project.resources.get(input.type);
			if (!resource) return;

			return { ...input, prev: resource.default };
		},
		perform(core, entry) {
			const resource = core.project.resources.get(entry.type);
			if (!resource) return;

			resource.default = entry.defaultId;
		},
		rewind(core, entry) {
			const resource = core.project.resources.get(entry.type);
			if (!resource) return;

			resource.default = entry.prev;
		},
	}),
	setResourceName: historyAction({
		prepare(
			core,
			input: {
				type: ResourceType<any, any>;
				resourceId: number;
				name: string;
			},
		) {
			const item = core.project.resources
				.get(input.type)
				?.items.find((i) => i.id === input.resourceId);
			if (!item) return;

			return { ...input, prev: item.name };
		},
		perform(core, entry) {
			const item = core.project.resources
				.get(entry.type)
				?.items.find((i) => i.id === entry.resourceId);
			if (!item) return;

			item.name = entry.name;
		},
		rewind(core, entry) {
			const item = core.project.resources
				.get(entry.type)
				?.items.find((i) => i.id === entry.resourceId);
			if (!item) return;

			item.name = entry.prev;
		},
	}),
	setResourceValue: historyAction({
		prepare(
			core,
			input: { type: ResourceType<any, any>; resourceId: number } & (
				| { sourceId: string }
				| { value: string }
			),
		) {
			const item = core.project.resources
				.get(input.type)
				?.items.find((i) => i.id === input.resourceId);
			if (!item) return;

			if ("value" in input && "value" in item)
				return { ...input, prevValue: item.value };
			if ("sourceId" in item && "sourceId" in input)
				return { ...input, prevSourceId: input.sourceId };
		},
		perform(core, entry) {
			const item = core.project.resources
				.get(entry.type)
				?.items.find((i) => i.id === entry.resourceId);
			if (!item) return;

			if ("value" in entry && "value" in item) item.value = entry.value;
			else if ("sourceId" in item && "sourceId" in entry)
				item.sourceId = entry.sourceId;
		},
		rewind(core, entry) {
			const item = core.project.resources
				.get(entry.type)
				?.items.find((i) => i.id === entry.resourceId);
			if (!item) return;

			if ("value" in entry && "value" in item) item.value = entry.prevValue;
			else if ("sourceId" in item && "sourceId" in entry)
				item.sourceId = entry.prevSourceId;
		},
	}),
	deleteResource: historyAction({
		prepare(core, input: { type: ResourceType<any, any>; resourceId: number }) {
			const resource = core.project.resources.get(input.type);
			if (!resource) return;

			const itemIndex = resource?.items.findIndex(
				(i) => i.id === input.resourceId,
			);
			if (itemIndex === -1) return;
			const item = resource.items[itemIndex]!;

			return {
				...input,
				index: itemIndex,
				data: { ...item },
				default: resource.default,
			};
		},
		perform(core, entry) {
			const resource = core.project.resources.get(entry.type);
			if (!resource) return;

			resource.items.splice(entry.index, 1);

			if (!resource.items.length) core.project.resources.delete(entry.type);
		},
		rewind(core, entry) {
			if (!core.project.resources.has(entry.type)) {
				core.project.resources.set(
					entry.type,
					createMutable({
						default: entry.default,
						items: [],
					}),
				);
			}

			const resource = core.project.resources.get(entry.type)!;

			resource.items.splice(entry.index, 0, { ...entry.data });
		},
	}),
	pasteGraphSelection: historyAction({
		prepare(
			core,
			{
				selection,
				...input
			}: {
				graphId: number;
				mousePosition: XY;
				selection: Extract<
					v.InferOutput<typeof ClipboardItem>,
					{ type: "selection" }
				>;
			},
		) {
			const graph = core.project.graphs.get(input.graphId);
			if (!graph) return;

			const nodeIdMap = new Map<number, number>();

			for (const nodeData of selection.nodes) {
				const id = graph.generateId();
				nodeIdMap.set(nodeData.id, id);
				nodeData.id = id;
				nodeData.position = {
					x: input.mousePosition.x + nodeData.position.x - selection.origin.x,
					y: input.mousePosition.y + nodeData.position.y - selection.origin.y,
				};
			}

			for (const box of selection.commentBoxes) {
				box.id = graph.generateId();
				box.position = {
					x: input.mousePosition.x + box.position.x - selection.origin.x,
					y: input.mousePosition.y + box.position.y - selection.origin.y,
				};
			}

			return { ...input, ...selection, nodeIdMap };
		},
		perform(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			batch(() => {
				for (const nodeData of entry.nodes) {
					const node = deserializeNode(graph, nodeData);
					if (!node) throw new Error("Failed to deserialize node");

					graph.nodes.set(node.id, node);
				}

				for (const box of entry.commentBoxes) {
					const commentBox = deserializeCommentBox(graph, box);
					if (!commentBox) throw new Error("Failed to deserialize comment box");

					graph.commentBoxes.set(commentBox.id, commentBox);
				}

				deserializeConnections(
					entry.connections,
					graph.connections,
					entry.nodeIdMap,
				);
			});
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.graphId);
			if (!graph) return;

			for (const nodeData of entry.nodes) {
				const node = graph.nodes.get(nodeData.id);
				if (!node) continue;

				graph.deleteNode(node);
			}

			for (const boxData of entry.commentBoxes) {
				if (boxData.id === undefined) continue;
				const box = graph.commentBoxes.get(boxData.id);
				if (!box) continue;

				graph.deleteCommentbox(box);
			}
		},
	}),
	pasteGraph: historyAction({
		prepare(core, data: v.InferOutput<typeof serde.Graph>) {
			const graphId = core.project.generateGraphId();

			data.id = graphId;

			return { data, graphId };
		},
		perform(core, entry) {
			const graph = deserializeGraph(core.project, entry.data);
			if (!graph) return;

			core.project.graphs.set(graph.id, graph);
		},
		rewind(core, entry) {
			const graph = core.project.graphs.get(entry.data.id);
			if (!graph) return;

			core.project.graphs.delete(entry.data.id);
			graph.dispose();
		},
	}),
};

type HistoryActions = typeof historyActions;
type HistoryActionKey = keyof HistoryActions;
type HistoryEntryData<T extends HistoryActionKey = HistoryActionKey> = {
	type: T;
	entry: HistoryActionEntry<T>;
};
export type HistoryActionEntry<T extends HistoryActionKey = HistoryActionKey> =
	(typeof historyActions)[T] extends HistoryAction<infer E, any, any>
		? HistoryEntry<E>
		: never;

export function createActionsExecutor(core: Core, save: () => void) {
	const history: Array<HistoryEntryData> = [];

	let nextHistoryIndex = 0;

	function addHistoryEntry(entry: HistoryEntryData) {
		history.splice(nextHistoryIndex, history.length - nextHistoryIndex, entry);
		nextHistoryIndex++;
	}

	function undo() {
		nextHistoryIndex = Math.max(0, nextHistoryIndex - 1);
		const entry = history[nextHistoryIndex];
		if (!entry) return;

		historyActions[entry.type].rewind(core, entry.entry as any);

		save();
	}

	function redo() {
		const entry = history[nextHistoryIndex];
		nextHistoryIndex = Math.min(history.length, nextHistoryIndex + 1);
		if (!entry) return;

		historyActions[entry.type].perform(core, entry.entry as any);

		save();
	}

	function execute<T extends HistoryActionKey>(
		type: T,
		...args: HistoryActions[T] extends HistoryAction<any, any, infer I>
			? I extends void
				? []
				: [I] | [I, { ephemeral?: boolean }]
			: []
	): HistoryActions[T] extends HistoryAction<any, infer P, any> ? P : never {
		const action = historyActions[type];

		const entry = action.prepare(core, args[0] as any, args[1]);
		if (!entry) return undefined as any;

		const result = action.perform(core, entry as any) as any;

		if (!args[1]?.ephemeral) {
			addHistoryEntry({ type, entry });
			save();
		}

		return result;
	}

	return { undo, redo, execute, history };
}
