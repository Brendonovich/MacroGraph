import { abort, historyAction } from "@macrograph/action-history";
import type { ClipboardItem } from "@macrograph/clipboard";
import type { Option } from "@macrograph/option";
import {
	type Core,
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	type InputPin,
	type IORef,
	makeIORef,
	type NodeSchema,
	type OutputPin,
	pinConnections,
	pinIsOutput,
	type ResourceType,
	ScopeInput,
	ScopeOutput,
	splitIORef,
	type Variable,
	type XY,
} from "@macrograph/runtime";
import {
	createDeferrer,
	deserializeCommentBox,
	deserializeConnections,
	deserializeCustomEnum,
	deserializeCustomEnumVariant,
	deserializeCustomEvent,
	deserializeCustomStruct,
	deserializeField,
	deserializeGraph,
	deserializeNode,
	deserializeVariable,
	serde,
	serializeCommentBox,
	serializeCustomEnum,
	serializeCustomEnumVariant,
	serializeCustomEvent,
	serializeCustomEventField,
	serializeCustomStruct,
	serializeCustomStructField,
	serializeField,
	serializeGraph,
	serializeNode,
	serializeVariable,
} from "@macrograph/runtime-serde";
import { type PrimitiveType, t } from "@macrograph/typesystem-old";
import { batch } from "solid-js";
import { createMutable } from "solid-js/store";
import * as v from "valibot";

import type {
	SelectedItemID,
	// makeGraphState,
} from "./components/Graph/Context";
import type { EditorState } from "./context";

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
export type CreateNodeInput = GraphRef & {
	schema: NodeSchema;
	position: XY;
	connection?: {
		fromPinId: string;
		to: { nodeId: number; variant: "o" | "i"; pinId: string };
	};
	name?: string;
	properties?: Record<string, any>;
};

type GraphRef = { graphId: number };
type NodeRef = GraphRef & { nodeId: number };
type CommentBoxRef = GraphRef & { commentBoxId: number };
type CustomStructRef = { structId: number };
type CustomStructFieldRef = CustomStructRef & { fieldId: number };
type CustomEnumRef = { enumId: number };
type CustomEnumVariantRef = CustomEnumRef & { variantId: string };
type CustomEnumVariantFieldRef = CustomEnumVariantRef & { fieldId: string };
type CustomEventRef = { eventId: number };
type CustomEventFieldRef = CustomEventRef & { fieldId: number };

export const historyActions = (core: Core, editor: EditorState) => {
	function getFocusedGraphState(graphId?: number) {
		const tile = editor.mosaicState.groups[editor.mosaicState.focusedIndex];
		if (!tile) return;

		if (graphId !== undefined) return tile.tabs.find((t) => t.id === graphId);

		return tile.tabs[tile.selectedIndex];
	}

	function getGraph(input: GraphRef) {
		const graph = core.project.graphs.get(input.graphId);
		if (!graph) abort();
		return graph;
	}
	function _getNode(input: NodeRef) {
		const node = getGraph(input).nodes.get(input.nodeId);
		if (!node) abort();
		return node;
	}
	function _getCommentBox(input: CommentBoxRef) {
		const node = getGraph(input).commentBoxes.get(input.commentBoxId);
		if (!node) abort();
		return node;
	}
	function getCustomStruct(input: CustomStructRef) {
		const struct = core.project.customStructs.get(input.structId);
		if (!struct) abort();
		return struct;
	}
	function _getCustomStructField(input: CustomStructFieldRef) {
		const struct = getCustomStruct(input);
		const field = struct.fields[input.fieldId];
		if (!field) abort();
		return field;
	}
	function _getCustomEnum(input: CustomEnumRef) {
		const struct = core.project.customEnums.get(input.enumId);
		if (!struct) abort();
		return struct;
	}
	function getCustomEvent(input: CustomEventRef) {
		const event = core.project.customEvents.get(input.eventId);
		if (!event) abort();
		return event;
	}
	function _getCustomEventField(input: CustomEventFieldRef) {
		const event = getCustomEvent(input);
		const field = event.field(input.fieldId.toString());
		if (!field) abort();
		return field;
	}

	return {
		// _createGraph: _historyAction({
		//   async perform(
		//     input: PerformInput<void, ReturnType<typeof serializeGraph>>,
		//   ) {
		//     let graph;

		//     if (input.type === "redo") {
		//       graph = await deserializeGraph(
		//         core.project,
		//         v.parse(serde.Graph, input.data),
		//       );
		//       core.project.graphs.set(graph.id, graph);
		//     } else graph = core.project.createGraph();

		//     // const graphStates = [...editor.graphStates, makeGraphState(graph)];

		//     // editor.setGraphStates(graphStates);
		//     // editor.setCurrentGraphId(entry.id);

		//     return [graph, { id: graph.id }];
		//   },
		//   rewind(performData) {
		//     const graph = core.project.graphs.get(performData.id);
		//     if (!graph) return;

		//     const serialized = serializeGraph(graph);

		//     core.project.graphs.delete(graph.id);
		//     graph.dispose();

		//     return serialized;
		//     // editor.setGraphStates(entry.prev.graphStates);
		//     // editor.setCurrentGraphId(entry.prev.currentGraphId);
		//   },
		// }),
		createGraph: historyAction({
			prepare() {
				return {
					id: core.project.generateGraphId(),
					prev: {
						// graphStates: [...editor.graphStates],
						// currentGraphId: editor.currentGraphId(),
					},
				};
			},
			perform(entry) {
				const graph = core.project.createGraph({ id: entry.id });
				// const graphStates = [...editor.graphStates, makeGraphState(graph)];

				// editor.setGraphStates(graphStates);
				// editor.setCurrentGraphId(entry.id);

				return graph;
			},
			rewind(entry) {
				const graph = core.project.graphs.get(entry.id);
				if (!graph) return;

				core.project.graphs.delete(entry.id);
				graph.dispose();

				// editor.setGraphStates(entry.prev.graphStates);
				// editor.setCurrentGraphId(entry.prev.currentGraphId);
			},
		}),
		// _setGraphName: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       GraphRef & { name: string },
		//       GraphRef & { prev: string }
		//     >,
		//   ) {
		//     let data;

		//     if (input.type === "perform") {
		//       data = input.data;
		//     } else {
		//       data = input.data;
		//     }

		//     const graph = getGraph(input.data);

		//     const prev = graph.name;
		//     graph.name =
		//       input.type === "perform" ? input.data.name : input.data.prev;

		//     return [graph, { graphId: data.graphId, prev }];
		//   },
		//   rewind(data) {
		//     const graph = getGraph(data);

		//     const prev = graph.name;
		//     graph.name = data.prev;

		//     return { graphId: data.graphId, prev };
		//   },
		// }),
		setGraphName: historyAction({
			prepare(input: { graphId: number; name: string }) {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				return { ...input, prev: graph.name };
			},
			perform(entry) {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				graph.name = entry.name;
			},
			rewind(entry) {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				graph.name = entry.prev;
			},
		}),
		// _deleteGraph: _historyAction({
		//   perform(input: PerformInput<GraphRef, GraphRef>) {
		//     const graph = getGraph(input.data);
		//     const serialized = serializeGraph(graph);

		//     core.project.graphs.delete(graph.id);
		//     graph.dispose();

		//     return [, serialized];
		//   },
		//   async rewind(data) {
		//     const graph = await deserializeGraph(
		//       core.project,
		//       v.parse(serde.Graph, data),
		//     );
		//     core.project.graphs.set(graph.id, graph);

		//     return { graphId: graph.id };
		//   },
		// }),
		deleteGraph: historyAction({
			prepare(input: { graphId: number }) {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				return {
					graphId: input.graphId,
					data: serializeGraph(graph),
					prev: {
						// graphStates: [...editor.graphStates],
						// currentGraphId: editor.currentGraphId(),
					},
				};
			},
			perform(entry) {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				core.project.graphs.delete(entry.graphId);
				graph.dispose();

				// editor.setGraphStates((s) => s.filter((s) => s.id !== entry.graphId));
				// editor.setCurrentGraphId((id) => {
				//   if (id === entry.graphId) {
				//     const index =
				//       editor.currentGraphIndex() ?? editor.graphStates.length - 1;
				//     if (index === -1) return id;
				//     return editor.graphStates[index]!.id;
				//   }

				//   return id;
				// });
			},
			async rewind(entry) {
				const graph = await deserializeGraph(
					core.project,
					v.parse(serde.Graph, entry.data),
				);
				core.project.graphs.set(graph.id, graph);

				batch(() => {
					// editor.setGraphStates(entry.prev.graphStates);
					// editor.setCurrentGraphId(entry.prev.currentGraphId);
				});
			},
		}),
		// _createNode: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       CreateNodeInput,
		//       GraphRef & {
		//         node: serde.Node;
		//         connections: ReturnType<typeof serializeConnections>;
		//       }
		//     >,
		//   ) {
		//     const graph = getGraph(input.data);

		//     let node;

		//     if (input.type === "redo") {
		//       node = deserializeNode(graph, input.data.node);
		//       if (!node) return;

		//       const connections = v.parse(
		//         v.array(serde.Connection),
		//         input.data.connections,
		//       );
		//       deserializeConnections(connections, graph.connections);
		//     } else {
		//       const nodeId = graph.generateId();

		//       node = graph.createNode({
		//         id: nodeId,
		//         schema: input.data.schema,
		//         name: input.data.name,
		//         position: input.data.position,
		//         properties: input.data.properties,
		//       });

		//       const { connection } = input.data;
		//       if (connection) {
		//         let output: OutputPin | undefined;
		//         let input: InputPin | undefined;

		//         const connectionNode = graph.nodes.get(connection.to.nodeId);
		//         if (connectionNode) {
		//           if (connection.to.variant === "o") {
		//             output = connectionNode.output(connection.to.pinId);
		//             input = node.input(connection.fromPinId);
		//           } else {
		//             output = node.output(connection.fromPinId);
		//             input = connectionNode.input(connection.to.pinId);
		//           }
		//         }

		//         if (output && input) graph.connectPins(output, input);
		//       }
		//     }

		//     return [node, { graphId: graph.id, nodeId: node.id }];
		//   },
		//   rewind(data) {
		//     const graph = getGraph(data);
		//     const node = getNode(data);

		//     const serialized = {
		//       graphId: graph.id,
		//       node: v.parse(serde.Node, serializeNode(node)),
		//       connections: serializeConnections(new Set([node])),
		//     };

		//     graph.deleteNode(node);

		//     return serialized;
		//   },
		// }),
		createNode: historyAction({
			prepare(input: CreateNodeInput) {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				return {
					...input,
					nodeId: graph.generateId(),
					prev: {
						// selection: [
						//   ...(editor.graphStates[editor.currentGraphIndex()!]
						//     ?.selectedItemIds ?? []),
						// ],
					},
				};
			},
			perform(entry) {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				const node = graph.createNode({
					id: entry.nodeId,
					schema: entry.schema,
					name: entry.name,
					position: entry.position,
					properties: entry.properties,
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

				// editor.setGraphStates(editor.currentGraphIndex()!, "selectedItemIds", [
				//   { type: "node", id: node.id },
				// ]);

				return node;
			},
			rewind(entry) {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				const node = graph.nodes.get(entry.nodeId);
				if (!node) return;

				graph.deleteNode(node);

				// editor.setGraphStates(
				//   editor.currentGraphIndex()!,
				//   "selectedItemIds",
				//   entry.prev.selection,
				// );
			},
		}),
		// _setNodeProperty: _historyAction(() => {
		//   type Data = NodeRef & {
		//     propertyId: string;
		//     value: any;
		//   };
		//   return {
		//     perform(data: PerformInput<Data, Data>) {
		//       let input;

		//       if (data.type === "perform") {
		//         input = data.data;
		//       } else {
		//         input = data.data;
		//       }

		//       const node = getNode(data.data);
		//       const prev = node.state.properties[input.propertyId];

		//       if (prev === input.value) return;

		//       node.setProperty(input.propertyId, input.value);

		//       return [, { ...input, value: prev }];
		//     },
		//     rewind(data) {
		//       const node = getNode(data);
		//       const prev = node.state.properties[data.propertyId];

		//       if (prev === data.value) return;

		//       node.setProperty(data.propertyId, data.value);

		//       return { ...data, value: prev };
		//     },
		//   };
		// }),
		setNodeProperty: historyAction({
			prepare(input: {
				graphId: number;
				nodeId: number;
				propertyId: string;
				value: any;
			}) {
				const node = core.project.graphs
					.get(input.graphId)
					?.nodes.get(input.nodeId);
				if (!node) return;

				const prev = node.state.properties[input.propertyId];

				if (prev === input.value) return;

				return {
					graphId: input.graphId,
					nodeId: input.nodeId,
					propertyId: input.propertyId,
					prev,
					value: input.value,
				};
			},
			perform(entry) {
				const node = core.project.graphs
					.get(entry.graphId)
					?.nodes.get(entry.nodeId);
				if (!node) return;

				node.setProperty(entry.propertyId, entry.value);
			},
			rewind(entry) {
				const node = core.project.graphs
					.get(entry.graphId)
					?.nodes.get(entry.nodeId);
				if (!node) return;

				node.setProperty(entry.propertyId, entry.prev);
			},
		}),
		// _setNodeName: _historyAction(() => {
		//   type Input = NodeRef & { name: string };
		//   return {
		//     perform(input: PerformInput<Input, Input>) {
		//       let data;

		//       if (input.type === "perform") {
		//         data = input.data;
		//       } else {
		//         data = input.data;
		//       }

		//       const node = getNode(data);
		//       const prev = node.state.name;

		//       node.state.name = data.name;

		//       return [, { ...data, name: prev }];
		//     },
		//     rewind(data) {
		//       const node = getNode(data);
		//       const prev = node.state.name;

		//       node.state.name = data.name;

		//       return { ...data, name: prev };
		//     },
		//   };
		// }),
		setNodeName: historyAction({
			prepare(input: { graphId: number; nodeId: number; name: string }) {
				const node = core.project.graphs
					.get(input.graphId)
					?.nodes.get(input.nodeId);
				if (!node) return;

				return { ...input, prev: node.state.name };
			},
			perform(entry) {
				const node = core.project.graphs
					.get(entry.graphId)
					?.nodes.get(entry.nodeId);
				if (!node) return;

				node.state.name = entry.name;
			},
			rewind(entry) {
				const node = core.project.graphs
					.get(entry.graphId)
					?.nodes.get(entry.nodeId);
				if (!node) return;

				node.state.name = entry.prev;
			},
		}),
		// _setNodeFoldPins: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       NodeRef & { foldPins: boolean },
		//       NodeRef & { foldPins: boolean }
		//     >,
		//   ) {
		//     const node = getNode(input.data);

		//     node.state.foldPins = input.data.foldPins;

		//     return [, input.data];
		//   },
		//   rewind(data) {
		//     const node = getNode(data);

		//     node.state.foldPins = !data.foldPins;

		//     return data;
		//   },
		// }),
		setNodeFoldPins: historyAction({
			prepare(input: { graphId: number; nodeId: number; foldPins: boolean }) {
				const node = core.project.graphs
					.get(input.graphId)
					?.nodes.get(input.nodeId);
				if (!node) return;

				return { ...input, prev: node.state.foldPins };
			},
			perform(entry) {
				const node = core.project.graphs
					.get(entry.graphId)
					?.nodes.get(entry.nodeId);
				if (!node) return;

				node.state.foldPins = entry.foldPins;
			},
			rewind(entry) {
				const node = core.project.graphs
					.get(entry.graphId)
					?.nodes.get(entry.nodeId);
				if (!node) return;

				node.state.foldPins = entry.prev;
			},
		}),
		// _createCommentBox: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       { position: XY } & GraphRef,
		//       GraphRef & { commentBox: serde.CommentBox }
		//     >,
		//   ) {
		//     const graph = getGraph(input.data);

		//     let id;
		//     let box;
		//     if (input.type === "perform") {
		//       id = graph.generateId();

		//       box = graph.createCommentBox({
		//         id,
		//         position: input.data.position,
		//         size: { x: 400, y: 200 },
		//         text: "Comment",
		//       });
		//     } else {
		//       box = deserializeCommentBox(graph, input.data.commentBox);
		//       id = box.id;
		//     }

		//     return [box, { graphId: graph.id, commentBoxId: box.id }];
		//   },
		//   rewind(data) {
		//     const graph = getGraph(data);
		//     const box = getCommentBox(data);

		//     const serialized = {
		//       graphId: graph.id,
		//       commentBox: v.parse(serde.CommentBox, serializeCommentBox(box)),
		//     };

		//     graph.deleteCommentbox(box);

		//     return serialized;
		//   },
		// }),
		createCommentBox: historyAction({
			prepare(input: { graphId: number; position: XY }) {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				return {
					graphId: input.graphId,
					commentBoxId: graph.generateId(),
					position: input.position,
					prev: {
						// selection: [
						//   ...(editor.graphStates[editor.currentGraphIndex()!]
						//     ?.selectedItemIds ?? []),
						// ],
					},
				};
			},
			perform(entry) {
				const box = core.project.graphs
					.get(entry.graphId)
					?.createCommentBox({
						id: entry.commentBoxId,
						position: entry.position,
						size: { x: 400, y: 200 },
						text: "Comment",
					});

				// if (box)
				//   editor.setGraphStates(
				//     editor.currentGraphIndex()!,
				//     "selectedItemIds",
				//     [{ type: "commentBox", id: box.id }],
				//   );

				return box;
			},
			rewind(entry) {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				const box = graph.commentBoxes.get(entry.commentBoxId);
				if (!box) return;

				graph.deleteCommentbox(box);
				// editor.setGraphStates(
				//   editor.currentGraphIndex()!,
				//   "selectedItemIds",
				//   entry.prev.selection,
				// );
			},
		}),
		// _setCommentBoxTint: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       CommentBoxRef & { tint: string },
		//       CommentBoxRef & { tint: string }
		//     >,
		//   ) {
		//     const box = getCommentBox(input.data);

		//     const prev = box.tint;
		//     if (input.data.tint === prev) return;

		//     return [, { ...input.data, tint: prev }];
		//   },
		//   rewind(data) {
		//     const box = getCommentBox(data);

		//     const prev = box.tint;

		//     return { ...data, tint: prev };
		//   },
		// }),
		setCommentBoxTint: historyAction({
			prepare(input: {
				graphId: number;
				boxId: number;
				tint: string;
				prev?: string;
			}) {
				const box = core.project.graphs
					.get(input.graphId)
					?.commentBoxes.get(input.boxId);
				if (!box) return;

				return { ...input, prev: input.prev ?? box.tint };
			},
			perform(entry) {
				const box = core.project.graphs
					.get(entry.graphId)
					?.commentBoxes.get(entry.boxId);
				if (!box) return;

				box.tint = entry.tint;
			},
			rewind(entry) {
				const box = core.project.graphs
					.get(entry.graphId)
					?.commentBoxes.get(entry.boxId);
				if (!box) return;

				box.tint = entry.prev;
			},
		}),
		// _setCommentBoxText: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       CommentBoxRef & { text: string },
		//       CommentBoxRef & { text: string }
		//     >,
		//   ) {
		//     const box = getCommentBox(input.data);

		//     const prev = box.text;
		//     if (input.data.text === prev) return;

		//     return [, { ...input.data, text: prev }];
		//   },
		//   rewind(data) {
		//     const box = getCommentBox(data);

		//     const prev = box.text;

		//     return { ...data, text: prev };
		//   },
		// }),
		setCommentBoxText: historyAction({
			prepare(input: { graphId: number; boxId: number; text: string }) {
				const box = core.project.graphs
					.get(input.graphId)
					?.commentBoxes.get(input.boxId);
				if (!box) return;

				return { ...input, prev: box.text };
			},
			perform(entry) {
				const box = core.project.graphs
					.get(entry.graphId)
					?.commentBoxes.get(entry.boxId);
				if (!box) return;

				box.text = entry.text;
			},
			rewind(entry) {
				const box = core.project.graphs
					.get(entry.graphId)
					?.commentBoxes.get(entry.boxId);
				if (!box) return;

				box.text = entry.prev;
			},
		}),
		// _setCommentBoxBounds: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       CommentBoxRef & { position: XY; size: XY },
		//       CommentBoxRef & { position: XY; size: XY }
		//     >,
		//   ) {
		//     const box = getCommentBox(input.data);

		//     const prev = {
		//       size: { ...box.size },
		//       position: { ...box.position },
		//     };

		//     box.size = { ...input.data.size };
		//     box.position = { ...input.data.position };

		//     return [, { ...input.data, ...prev }];
		//   },
		//   rewind(data) {
		//     const box = getCommentBox(data);

		//     const prev = {
		//       size: { ...box.size },
		//       position: { ...box.position },
		//     };

		//     box.size = { ...data.size };
		//     box.position = { ...data.position };

		//     return { ...data, ...prev };
		//   },
		// }),
		setCommentBoxBounds: historyAction({
			prepare(input: {
				graphId: number;
				boxId: number;
				position: XY;
				size: XY;
				prev?: { position: XY; size: XY; selection?: Array<SelectedItemID> };
			}) {
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
			perform(entry) {
				const box = core.project.graphs
					.get(entry.graphId)
					?.commentBoxes.get(entry.boxId);
				if (!box) return;

				box.size = { ...entry.size };
				box.position = { ...entry.position };

				// editor.setGraphStates(
				//   (g) => g.id === entry.graphId,
				//   "selectedItemIds",
				//   [{ type: "commentBox", id: box.id }],
				// );
			},
			rewind(entry) {
				const box = core.project.graphs
					.get(entry.graphId)
					?.commentBoxes.get(entry.boxId);
				if (!box) return;

				box.size = { ...entry.prev.size };
				box.position = { ...entry.prev.position };

				// if (entry.prev.selection)
				// editor.setGraphStates(
				//   (g) => g.id === entry.graphId,
				//   "selectedItemIds",
				//   entry.prev.selection,
				// );
			},
		}),
		// _setGraphItemPositions: _historyAction(() => {
		//   type Input = GraphRef & { items: Array<GraphItemPositionInput> };

		//   function action(data: Input) {
		//     const graph = getGraph(data);

		//     const prevItems: Array<GraphItemPositionInput> = [];

		//     for (const item of data.items) {
		//       if (item.itemVariant === "node") {
		//         const node = graph.nodes.get(item.itemId);
		//         if (!node) continue;

		//         prevItems.push({
		//           itemId: node.id,
		//           itemVariant: "node",
		//           position: { ...item.position },
		//         });

		//         node.state.position = { ...item.position };
		//       } else {
		//         const box = graph.commentBoxes.get(item.itemId);
		//         if (!box) continue;

		//         prevItems.push({
		//           itemId: box.id,
		//           itemVariant: "commentBox",
		//           position: { ...item.position },
		//         });

		//         box.position = { ...item.position };
		//       }
		//     }

		//     return { graphId: data.graphId, items: prevItems };
		//   }

		//   return {
		//     perform(input: PerformInput<Input, Input>) {
		//       const data = action(input.data);

		//       return [, data];
		//     },
		//     rewind(data) {
		//       return action(data);
		//     },
		//   };
		// }),
		setGraphItemPositions: historyAction({
			prepare(input: {
				graphId: number;
				items: Array<GraphItemPositionInput>;
				selection?: Array<SelectedItemID>;
				prevSelection?: Array<SelectedItemID>;
			}) {
				return input;
			},
			perform(entry) {
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

				// if (entry.selection)
				// editor.setGraphStates(
				//   (g) => g.id === entry.graphId,
				//   "selectedItemIds",
				//   [...entry.selection],
				// );
			},
			rewind(entry) {
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

				// if (entry.prevSelection)
				// editor.setGraphStates(
				//   (g) => g.id === entry.graphId,
				//   "selectedItemIds",
				//   [...entry.prevSelection],
				// );
			},
		}),
		// _deleteGraphItems: _historyAction(() => {
		//   type Data = GraphRef & {
		//     nodes: Array<v.InferInput<typeof serde.Node>>;
		//     connections: Array<v.InferInput<typeof serde.Connection>>;
		//     commentBoxes: Array<v.InferInput<typeof serde.CommentBox>>;
		//   };

		//   return {
		//     perform(
		//       input: PerformInput<GraphRef & { items: Array<SelectionItem> }, Data>,
		//     ) {
		//       const graph = getGraph(input.data);

		//       let data: Data;

		//       if (input.type === "perform") {
		//         const { items } = input.data;

		//         data = {
		//           graphId: input.data.graphId,
		//           nodes: [],
		//           connections: [],
		//           commentBoxes: [],
		//         };

		//         for (const { type, id } of items) {
		//           if (type === "node") {
		//             const node = graph.nodes.get(id);
		//             if (!node) continue;

		//             for (const output of node.io.outputs) {
		//               const ref = makeIORef(output);

		//               const connections = graph.connections.get(ref);
		//               if (!connections) continue;

		//               for (const connectionRef of connections) {
		//                 const outputData = splitIORef(ref);
		//                 const inputData = splitIORef(connectionRef);

		//                 data.connections.push({
		//                   from: {
		//                     node: outputData.nodeId,
		//                     output: outputData.ioId,
		//                   },
		//                   to: { node: inputData.nodeId, input: inputData.ioId },
		//                 });
		//               }
		//             }

		//             for (const input of node.io.inputs) {
		//               if (input instanceof ExecInput) {
		//                 for (const connOutput of input.connections) {
		//                   if (
		//                     items.some(
		//                       (i) =>
		//                         i.type === "node" && i.id === connOutput.node.id,
		//                     )
		//                   )
		//                     continue;

		//                   data.connections.push({
		//                     from: {
		//                       node: connOutput.node.id,
		//                       output: connOutput.id,
		//                     },
		//                     to: { node: input.node.id, input: input.id },
		//                   });
		//                 }
		//               } else if (
		//                 input instanceof DataInput ||
		//                 input instanceof ScopeInput
		//               ) {
		//                 (
		//                   input.connection as Option<DataOutput<any> | ScopeOutput>
		//                 ).peek((connOutput) => {
		//                   if (
		//                     items.some(
		//                       (i) =>
		//                         i.type === "node" && i.id === connOutput.node.id,
		//                     )
		//                   )
		//                     return;

		//                   data.connections.push({
		//                     from: {
		//                       node: connOutput.node.id,
		//                       output: connOutput.id,
		//                     },
		//                     to: { node: input.node.id, input: input.id },
		//                   });
		//                 });
		//               }
		//             }

		//             data.nodes.push(serializeNode(node));
		//           } else {
		//             const box = graph.commentBoxes.get(id);
		//             if (!box) continue;

		//             data.commentBoxes.push(serializeCommentBox(box));
		//           }
		//         }
		//       } else {
		//         data = input.data;
		//       }

		//       for (const nodeData of data.nodes) {
		//         const node = graph.nodes.get(nodeData.id);
		//         if (!node) continue;

		//         graph.deleteNode(node);
		//       }

		//       for (const boxData of data.commentBoxes) {
		//         if (boxData.id === undefined) continue;
		//         const box = graph.commentBoxes.get(boxData.id);
		//         if (!box) continue;

		//         graph.deleteCommentbox(box);
		//       }

		//       return [, data];
		//     },
		//     rewind(data) {
		//       const graph = getGraph(data);

		//       for (const nodeData of data.nodes.reverse()) {
		//         const node = deserializeNode(graph, v.parse(serde.Node, nodeData));
		//         if (!node) continue;

		//         graph.nodes.set(node.id, node);
		//       }

		//       for (const boxData of data.commentBoxes.reverse()) {
		//         const box = deserializeCommentBox(
		//           graph,
		//           v.parse(serde.CommentBox, boxData),
		//         );
		//         if (!box) continue;

		//         graph.commentBoxes.set(box.id, box);
		//       }

		//       const connections = v.parse(
		//         v.array(serde.Connection),
		//         data.connections,
		//       );
		//       deserializeConnections(connections, graph.connections);

		//       return data;
		//     },
		//   };
		// }),
		deleteGraphItems: historyAction({
			prepare(input: { graphId: number; items: Array<SelectionItem> }) {
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
								(
									input.connection as Option<DataOutput<any> | ScopeOutput>
								).peek((connOutput) => {
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
								});
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
			perform(entry) {
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
			rewind(entry) {
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

				const connections = v.parse(
					v.array(serde.Connection),
					entry.connections,
				);
				deserializeConnections(connections, graph.connections);
			},
		}),
		// _connectIO: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       GraphRef & {
		//         out: { nodeId: number; pinId: string };
		//         in: { nodeId: number; pinId: string };
		//       },
		//       GraphRef & {
		//         out: { nodeId: number; pinId: string };
		//         in: { nodeId: number; pinId: string };
		//         prevConnections: Array<v.InferInput<typeof serde.Connection>>;
		//       }
		//     >,
		//   ) {
		//     const graph = getGraph(input.data);

		//     let prevConnections: Array<v.InferInput<typeof serde.Connection>> = [];

		//     const { data } = input;

		//     const outPin = graph.nodes.get(data.out.nodeId)?.output(data.out.pinId);
		//     const inPin = graph.nodes.get(data.in.nodeId)?.input(data.in.pinId);

		//     if (input.type === "perform") {
		//       if (outPin instanceof DataOutput && inPin instanceof DataInput) {
		//         const to = { node: inPin.node.id, input: inPin.id };
		//         inPin.connection.peek((out) => {
		//           prevConnections.push({
		//             from: { node: out.node.id, output: out.id },
		//             to,
		//           });
		//         });
		//       } else if (
		//         outPin instanceof ExecOutput &&
		//         inPin instanceof ExecInput
		//       ) {
		//         const from = { node: outPin.node.id, output: outPin.id };
		//         outPin.connection().peek((inPin) => {
		//           prevConnections.push({
		//             from,
		//             to: { node: inPin.node.id, input: inPin.id },
		//           });
		//         });
		//       } else if (
		//         outPin instanceof ScopeOutput &&
		//         inPin instanceof ScopeInput
		//       ) {
		//         const from = { node: outPin.node.id, output: outPin.id };
		//         outPin.connection().peek((inPin) => {
		//           prevConnections.push({
		//             from,
		//             to: { node: inPin.node.id, input: inPin.id },
		//           });
		//         });
		//         const to = { node: inPin.node.id, input: inPin.id };
		//         inPin.connection.peek((out) => {
		//           prevConnections.push({
		//             from: { node: out.node.id, output: out.id },
		//             to,
		//           });
		//         });
		//       } else return;
		//     } else {
		//       prevConnections = input.data.prevConnections;
		//     }

		//     if (!outPin || !inPin) return;

		//     graph.connectPins(outPin, inPin);

		//     return [, { ...input.data, prevConnections }];
		//   },
		//   rewind(data) {
		//     // TODO: remove prev connections that have been disconnected elsewhere

		//     const graph = getGraph(data);

		//     const outNode = graph.nodes.get(data.out.nodeId);
		//     const inNode = graph.nodes.get(data.in.nodeId);
		//     if (!outNode || !inNode) return;

		//     const outPin = outNode.output(data.out.pinId);
		//     const inPin = inNode.input(data.in.pinId);
		//     if (!outPin || !inPin) return;

		//     const outConnections = graph.connections.get(makeIORef(outPin));
		//     if (!outConnections) return;

		//     const index = outConnections.findIndex(
		//       (ref) => ref === makeIORef(inPin),
		//     );
		//     outConnections.splice(index, 1);

		//     const prevConnections = v.parse(
		//       v.array(serde.Connection),
		//       data.prevConnections,
		//     );

		//     for (const prev of prevConnections) {
		//       const fromPin = graph.nodes
		//         .get(prev.from.node)
		//         ?.output(prev.from.output);
		//       const toPin = graph.nodes.get(prev.to.node)?.input(prev.to.input);
		//       if (!fromPin || !toPin) continue;

		//       graph.connectPins(fromPin, toPin);
		//     }

		//     return data;
		//   },
		// }),
		connectIO: historyAction({
			prepare(input: {
				graphId: number;
				out: { nodeId: number; pinId: string };
				in: { nodeId: number; pinId: string };
			}) {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				const outPin = graph.nodes
					.get(input.out.nodeId)
					?.output(input.out.pinId);
				const inPin = graph.nodes.get(input.in.nodeId)?.input(input.in.pinId);
				if (!outPin || !inPin) return;

				const prevConnections: Array<v.InferInput<typeof serde.Connection>> =
					[];

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
				} else if (
					outPin instanceof ScopeOutput &&
					inPin instanceof ScopeInput
				) {
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
			perform(entry) {
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
			rewind(entry) {
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

				const index = outConnections.indexOf(makeIORef(inPin));
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
		// _disconnectIO: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       GraphRef & { ioRef: IORef },
		//       GraphRef & { ioRef: IORef }
		//     >,
		//   ) {
		//     const graph = getGraph(input.data);

		//     const io = splitIORef(input.data.ioRef);

		//     const node = graph.nodes.get(io.nodeId);
		//     if (!node) return;

		//     const pin =
		//       io.type === "i" ? node.input(io.ioId) : node.output(io.ioId);
		//     if (!pin) return;

		//     const prevConnections = pinConnections(pin);

		//     graph.disconnectPin(pin);

		//     return [, { ...input.data, prevConnections }];
		//   },
		//   rewind(data) {
		//     const graph = getGraph(data);

		//     const io = splitIORef(data.ioRef);

		//     const node = graph.nodes.get(io.nodeId);
		//     if (!node) return;

		//     const pin =
		//       io.type === "i" ? node.input(io.ioId) : node.output(io.ioId);
		//     if (!pin) return;

		//     if (pinIsOutput(pin)) {
		//       for (const prev of data.prevConnections) {
		//         const input = graph.nodes
		//           .get(prev.nodeId)
		//           ?.io.inputs.find((i) => i.id === prev.id);
		//         if (!input) continue;

		//         graph.connectPins(pin, input);
		//       }
		//     } else {
		//       for (const prev of data.prevConnections) {
		//         const output = graph.nodes
		//           .get(prev.nodeId)
		//           ?.io.outputs.find((o) => o.id === prev.id);
		//         if (!output) continue;

		//         graph.connectPins(output, pin);
		//       }
		//     }

		//     return data;
		//   },
		// }),
		disconnectIO: historyAction({
			prepare(input: { graphId: number; ioRef: IORef }) {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				const io = splitIORef(input.ioRef);

				const node = graph.nodes.get(io.nodeId);
				if (!node) return;

				const pin =
					io.type === "i" ? node.input(io.ioId) : node.output(io.ioId);
				if (!pin) return;

				return { ...input, prevConnections: pinConnections(pin) };
			},
			perform(entry) {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				const io = splitIORef(entry.ioRef);

				const node = graph.nodes.get(io.nodeId);
				if (!node) return;

				const pin =
					io.type === "i" ? node.input(io.ioId) : node.output(io.ioId);
				if (!pin) return;

				graph.disconnectPin(pin);
			},
			rewind(entry) {
				const graph = core.project.graphs.get(entry.graphId);
				if (!graph) return;

				const io = splitIORef(entry.ioRef);

				const node = graph.nodes.get(io.nodeId);
				if (!node) return;

				const pin =
					io.type === "i" ? node.input(io.ioId) : node.output(io.ioId);
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
		// _setInputDefaultValue: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       NodeRef & { inputId: string; value: any },
		//       NodeRef & { inputId: string; value: any }
		//     >,
		//   ) {
		//     const node = getNode(input.data);

		//     const io = node.input(input.data.inputId);
		//     if (!(io && io instanceof DataInput)) return;

		//     const prev = io.defaultValue;

		//     io.setDefaultValue(input.data.value);

		//     return [, { ...input.data, value: prev }];
		//   },
		//   rewind(data) {
		//     const node = getNode(data);

		//     const io = node.input(data.inputId);
		//     if (!(io && io instanceof DataInput)) return;

		//     const prev = io.defaultValue;

		//     io.setDefaultValue(data.value);

		//     return { ...data, value: prev };
		//   },
		// }),
		setInputDefaultValue: historyAction({
			prepare(input: {
				graphId: number;
				nodeId: number;
				inputId: string;
				value: any;
			}) {
				const node = core.project.graphs
					.get(input.graphId)
					?.nodes.get(input.nodeId);
				if (!node) return;

				const io = node.input(input.inputId);
				if (!(io && io instanceof DataInput)) return;

				return { ...input, prev: io.defaultValue };
			},
			perform(entry) {
				const node = core.project.graphs
					.get(entry.graphId)
					?.nodes.get(entry.nodeId);
				if (!node) return;

				const input = node.input(entry.inputId);
				if (!(input && input instanceof DataInput)) return;

				input.setDefaultValue(entry.value);
			},
			rewind(entry) {
				const node = core.project.graphs
					.get(entry.graphId)
					?.nodes.get(entry.nodeId);
				if (!node) return;

				const input = node.input(entry.inputId);
				if (!(input && input instanceof DataInput)) return;

				input.setDefaultValue(entry.prev);
			},
		}),
		// _createCustomStruct: _historyAction({
		//   perform(
		//     input: PerformInput<void, v.InferInput<typeof serde.CustomStruct>>,
		//   ) {
		//     let struct;
		//     if (input.type === "perform") {
		//       struct = core.project.createCustomStruct();
		//     } else {
		//       const deferrer = createDeferrer();
		//       struct = deserializeCustomStruct(
		//         core.project,
		//         v.parse(serde.CustomStruct, input.data),
		//         deferrer,
		//       );
		//       deferrer.run();
		//     }

		//     return [struct, { id: struct.id }];
		//   },
		//   rewind(data) {
		//     const struct = core.project.customStructs.get(data.id);
		//     if (!struct) return;

		//     return serializeCustomStruct(struct);
		//   },
		// }),
		createCustomStruct: historyAction({
			prepare() {
				return { id: core.project.generateCustomTypeId() };
			},
			perform(entry) {
				core.project.createCustomStruct(entry);
			},
			rewind(entry) {
				core.project.customStructs.delete(entry.id);
			},
		}),
		// _setCustomStructName: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       { structId: number; name: string },
		//       { structId: number; name: string }
		//     >,
		//   ) {
		//     const struct = core.project.customStructs.get(input.data.structId);
		//     if (!struct) return;

		//     const prev = struct.name;
		//     struct.name = input.data.name;

		//     return [, { ...input.data, name: prev }];
		//   },
		//   rewind(data) {
		//     const struct = core.project.customStructs.get(data.structId);
		//     if (!struct) return;

		//     const prev = struct.name;
		//     struct.name = data.name;

		//     return { ...data, name: prev };
		//   },
		// }),
		setCustomStructName: historyAction({
			prepare(input: { structId: number; name: string }) {
				const struct = core.project.customStructs.get(input.structId);
				if (!struct) return;

				return { ...input, prev: struct.name };
			},
			perform(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				struct.name = entry.name;
			},
			rewind(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				struct.name = entry.prev;
			},
		}),
		// _deleteCustomStruct: _historyAction({
		//   perform(input: PerformInput<{ structId: number }, { structId: number }>) {
		//     const struct = core.project.customStructs.get(input.data.structId);
		//     if (!struct) return;

		//     const data = serializeCustomStruct(struct);

		//     core.project.customStructs.delete(struct.id);

		//     return [, data];
		//   },
		//   rewind(data) {
		//     const deferrer = createDeferrer();
		//     const struct = deserializeCustomStruct(
		//       core.project,
		//       v.parse(serde.CustomStruct, data),
		//       deferrer,
		//     );
		//     deferrer.run();

		//     core.project.customStructs.set(struct.id, struct);

		//     return { structId: struct.id };
		//   },
		// }),
		deleteCustomStruct: historyAction({
			prepare(input: { structId: number }) {
				const struct = core.project.customStructs.get(input.structId);
				if (!struct) return;

				const data = serializeCustomStruct(struct);

				return { ...input, data };
			},
			perform(entry) {
				core.project.customStructs.delete(entry.structId);
			},
			rewind(entry) {
				const deferrer = createDeferrer();
				const struct = deserializeCustomStruct(
					core.project,
					v.parse(serde.CustomStruct, entry.data),
					deferrer,
				);
				deferrer.run();

				core.project.customStructs.set(entry.structId, struct);
			},
		}),
		// _createCustomStructField: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       CustomStructRef,
		//       CustomStructRef & {
		//         field: v.InferInput<typeof serde.CustomStructField>;
		//       }
		//     >,
		//   ) {
		//     const struct = getCustomStruct(input.data);

		//     let field;
		//     if (input.type === "perform") {
		//       const id = struct.createField();
		//       field = struct.fields[id]!;
		//     } else {
		//       const { data } = input;
		//       struct.fields[data.field.id] = field = deserializeField(
		//         core.project,
		//         data.field,
		//       );
		//     }

		//     return [field, { structId: input.data.structId, fieldId: field.id }];
		//   },
		//   rewind(data) {
		//     const struct = getCustomStruct(data);
		//     const field = struct.fields[data.fieldId];
		//     if (!field) return;

		//     const serialized = serializeField(field);
		//     struct.removeField(field.id.toString());

		//     return { structId: data.structId, field: serialized };
		//   },
		// }),
		createCustomStructField: historyAction({
			prepare(input: { structId: number }) {
				const struct = core.project.customStructs.get(input.structId);
				if (!struct) return;

				return { ...input, id: struct.fieldIdCounter++ };
			},
			perform(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				return struct.createField({ id: entry.id.toString() });
			},
			rewind(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				struct.removeField(entry.id.toString());
			},
		}),
		// _setCustomStructFieldName: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       CustomStructFieldRef & { name: string },
		//       CustomStructFieldRef & { name: string }
		//     >,
		//   ) {
		//     const field = getCustomStructField(input.data);

		//     const prev = field.name;
		//     field.name = input.data.name;

		//     return [, { ...input.data, name: prev }];
		//   },
		//   rewind(data) {
		//     const field = getCustomStructField(data);

		//     const prev = field.name;
		//     field.name = data.name;

		//     return { ...data, name: prev };
		//   },
		// }),
		setCustomStructFieldName: historyAction({
			prepare(input: { structId: number; fieldId: string; name: string }) {
				const field = core.project.customStructs.get(input.structId)?.fields[
					input.fieldId
				];
				if (!field) return;

				return { ...input, prev: field.name };
			},
			perform(entry) {
				const field = core.project.customStructs.get(entry.structId)?.fields[
					entry.fieldId
				];
				if (!field) return;

				field.name = entry.name;
			},
			rewind(entry) {
				const field = core.project.customStructs.get(entry.structId)?.fields[
					entry.fieldId
				];
				if (!field) return;

				field.name = entry.prev;
			},
		}),
		// _setCustomStructFieldType: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       CustomStructFieldRef & { type: t.Any },
		//       CustomStructFieldRef & { type: t.Any }
		//     >,
		//   ) {
		//     const field = getCustomStructField(input.data);

		//     const prev = field.type;
		//     field.type = input.data.type;

		//     return [, { ...input.data, type: prev }];
		//   },
		//   rewind(data) {
		//     const field = getCustomStructField(data);

		//     const prev = field.type;
		//     field.type = data.type;

		//     return { ...data, type: prev };
		//   },
		// }),
		setCustomStructFieldType: historyAction({
			prepare(input: { structId: number; fieldId: string; type: t.Any }) {
				const field = core.project.customStructs.get(input.structId)?.fields[
					input.fieldId
				];
				if (!field) return;

				return { ...input, prev: field.type };
			},
			perform(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				struct.editFieldType(entry.fieldId, entry.type);
			},
			rewind(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				struct.editFieldType(entry.fieldId, entry.prev);
			},
		}),
		// _deleteCustomStructField: _historyAction({
		//   perform(input: PerformInput<CustomStructFieldRef, CustomStructFieldRef>) {
		//     const field = getCustomStructField(input.data);

		//     const serialized = serializeCustomStructField(field);

		//     return [, { ...input.data, serialized }];
		//   },
		//   rewind(data) {
		//     const struct = getCustomStruct(data);
		//     if (!struct) return;

		//     struct.fields[data.fieldId] = deserializeField(
		//       core.project,
		//       v.parse(serde.CustomStructField, data.serialized),
		//     );

		//     return data;
		//   },
		// }),
		deleteCustomStructField: historyAction({
			prepare(input: { structId: number; fieldId: string }) {
				const field = core.project.customStructs.get(input.structId)?.fields[
					input.fieldId
				];
				if (!field) return;

				return { ...input, data: serializeCustomStructField(field) };
			},
			perform(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				struct.removeField(entry.fieldId);
			},
			rewind(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				struct.fields[entry.fieldId] = deserializeField(
					core.project,
					v.parse(serde.CustomStructField, entry.data),
				);
			},
		}),
		// _createCustomEnum: _historyAction({
		//   perform(
		//     input: PerformInput<void, v.InferInput<typeof serde.CustomEnum>>,
		//   ) {
		//     let enm;

		//     if (input.type === "perform") {
		//       enm = core.project.createCustomEnum();
		//     } else {
		//       const deferrer = createDeferrer();
		//       enm = deserializeCustomEnum(
		//         core.project,
		//         v.parse(serde.CustomEnum, input.data),
		//         deferrer,
		//       );

		//       core.project.customEnums.set(enm.id, enm);
		//     }

		//     return [enm, { enumId: enm.id }];
		//   },
		//   rewind(data) {
		//     const enm = getCustomEnum(data);

		//     const serialized = serializeCustomEnum(enm);

		//     core.project.customEnums.delete(enm.id);

		//     return serialized;
		//   },
		// }),
		createCustomEnum: historyAction({
			prepare() {
				return { id: core.project.generateCustomTypeId() };
			},
			perform(entry) {
				core.project.createCustomEnum(entry);
			},
			rewind(entry) {
				core.project.customEnums.delete(entry.id);
			},
		}),
		// _setCustomEnumName: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       CustomEnumRef & { name: string },
		//       CustomEnumRef & { name: string }
		//     >,
		//   ) {
		//     const enm = getCustomEnum(input.data);

		//     const prev = enm.name;
		//     enm.name = input.data.name;

		//     return [, { ...input.data, name: prev }];
		//   },
		//   rewind(data) {
		//     const enm = getCustomEnum(data);

		//     const prev = enm.name;
		//     enm.name = data.name;

		//     return { ...data, name: prev };
		//   },
		// }),
		setCustomEnumName: historyAction({
			prepare(input: { enumId: number; name: string }) {
				const struct = core.project.customEnums.get(input.enumId);
				if (!struct) return;

				return { ...input, prev: struct.name };
			},
			perform(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				enm.name = entry.name;
			},
			rewind(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				enm.name = entry.prev;
			},
		}),
		// _deleteCustomEnum: _historyAction({
		//   perform(input: PerformInput<CustomEnumRef, CustomEnumRef>) {
		//     const enm = getCustomEnum(input.data);

		//     const serialized = serializeCustomEnum(enm);
		//     core.project.customEnums.delete(enm.id);

		//     return [, { ...input.data, serialized }];
		//   },
		//   rewind(data) {
		//     const deferrer = createDeferrer();
		//     const enm = deserializeCustomEnum(
		//       core.project,
		//       v.parse(serde.CustomEnum, data.serialized),
		//       deferrer,
		//     );

		//     core.project.customEnums.set(data.enumId, enm);

		//     return { enumId: data.enumId };
		//   },
		// }),
		deleteCustomEnum: historyAction({
			prepare(input: { enumId: number }) {
				const enm = core.project.customEnums.get(input.enumId);
				if (!enm) return;

				const data = serializeCustomEnum(enm);

				return { ...input, data };
			},
			perform(entry) {
				core.project.customEnums.delete(entry.enumId);
			},
			rewind(entry) {
				const deferrer = createDeferrer();
				const enm = deserializeCustomEnum(
					core.project,
					v.parse(serde.CustomEnum, entry.data),
					deferrer,
				);

				core.project.customEnums.set(entry.enumId, enm);
			},
		}),
		createCustomEnumVariant: historyAction({
			prepare(input: { enumId: number }) {
				const enm = core.project.customEnums.get(input.enumId);
				if (!enm) return;

				return { ...input, id: enm.variantIdCounter++ };
			},
			perform(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				return enm.createVariant({ id: entry.id.toString() });
			},
			rewind(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				enm.removeVariant(entry.id.toString());
			},
		}),
		setCustomEnumVariantName: historyAction({
			prepare(input: { enumId: number; variantId: string; name: string }) {
				const variant = core.project.customEnums
					.get(input.enumId)
					?.variant(input.variantId);
				if (!variant) return;
				return { ...input, prev: variant.name };
			},
			perform(entry) {
				const field = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId);
				if (!field) return;
				field.name = entry.name;
			},
			rewind(entry) {
				const field = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId);
				if (!field) return;
				field.name = entry.prev;
			},
		}),
		deleteCustomEnumVariant: historyAction({
			prepare(input: { enumId: number; variantId: string }) {
				const variant = core.project.customEnums
					.get(input.enumId)
					?.variant(input.variantId);
				if (!variant) return;

				return { ...input, data: serializeCustomEnumVariant(variant) };
			},
			perform(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				enm.removeVariant(entry.variantId);
			},
			rewind(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				deserializeCustomEnumVariant(
					enm,
					v.parse(serde.CustomEnumVariant, entry.data),
				);
			},
		}),
		createCustomEnumVariantField: historyAction({
			prepare(input: { enumId: number; variantId: string }) {
				const enm = core.project.customEnums.get(input.enumId);
				if (!enm) return;

				const variant = enm.variant(input.variantId);
				if (!variant) return;

				return { ...input, id: variant.fieldIdCounter++ };
			},
			perform(entry) {
				const variant = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId);
				if (!variant) return;

				return variant.createField({ id: entry.id.toString() });
			},
			rewind(entry) {
				const variant = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId);
				if (!variant) return;

				variant.removeField(entry.id.toString());
			},
		}),
		setCustomEnumVariantFieldName: historyAction({
			prepare(input: {
				enumId: number;
				variantId: string;
				fieldId: string;
				name: string;
			}) {
				const variant = core.project.customEnums
					.get(input.enumId)
					?.variant(input.variantId);
				if (!variant) return;

				return { ...input, prev: variant.name };
			},
			perform(entry) {
				const field = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId)
					?.field(entry.fieldId);
				if (!field) return;

				field.name = entry.name;
			},
			rewind(entry) {
				const field = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId)
					?.field(entry.fieldId);
				if (!field) return;

				field.name = entry.prev;
			},
		}),
		setCustomEnumVariantFieldType: historyAction({
			prepare(input: {
				enumId: number;
				variantId: string;
				fieldId: string;
				type: t.Any;
			}) {
				const field = core.project.customEnums
					.get(input.enumId)
					?.variant(input.variantId)
					?.field(input.fieldId);
				if (!field) return;

				return { ...input, prev: field.type };
			},
			perform(entry) {
				const field = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId)
					?.field(entry.fieldId);
				if (!field) return;

				field.type = entry.type;
			},
			rewind(entry) {
				const field = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId)
					?.field(entry.fieldId);
				if (!field) return;

				field.type = entry.prev;
			},
		}),
		deleteCustomEnumVariantField: historyAction({
			prepare(input: { enumId: number; variantId: string; fieldId: string }) {
				const field = core.project.customEnums
					.get(input.enumId)
					?.variant(input.variantId)
					?.field(input.fieldId);
				if (!field) return;

				return { ...input, data: serializeField(field) };
			},
			perform(entry) {
				const variant = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId);
				if (!variant) return;

				variant.removeField(entry.fieldId);
			},
			rewind(entry) {
				const variant = core.project.customEnums
					.get(entry.enumId)
					?.variant(entry.variantId);
				if (!variant) return;

				variant.fields[entry.fieldId] = deserializeField(
					core.project,
					v.parse(serde.Field, entry.data),
				);
			},
		}),
		createCustomEvent: historyAction({
			prepare() {
				return { id: core.project.customEventIdCounter++ };
			},
			perform(entry) {
				core.project.createCustomEvent({ id: entry.id });
			},
			rewind(entry) {
				core.project.customEvents.delete(entry.id);
			},
		}),
		setCustomEventName: historyAction({
			prepare(input: { eventId: number; name: string }) {
				const event = core.project.customEvents.get(input.eventId);
				if (!event) return;

				return { ...input, prev: event.name };
			},
			perform(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				event.name = entry.name;
			},
			rewind(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				event.name = entry.prev;
			},
		}),
		deleteCustomEvent: historyAction({
			prepare(input: { eventId: number }) {
				const event = core.project.customEvents.get(input.eventId);
				if (!event) return;

				const data = serializeCustomEvent(event);

				return { ...input, data };
			},
			perform(entry) {
				core.project.customEvents.delete(entry.eventId);
			},
			rewind(entry) {
				const struct = deserializeCustomEvent(
					core.project,
					v.parse(serde.CustomEvent, entry.data),
				);

				core.project.customEvents.set(entry.eventId, struct);
			},
		}),
		createCustomEventField: historyAction({
			prepare(input: { eventId: number }) {
				const event = core.project.customEvents.get(input.eventId);
				if (!event) return;

				return { ...input, id: (event.fieldIdCounter++).toString() };
			},
			perform(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				return event.createField({ id: entry.id });
			},
			rewind(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				event.deleteField(entry.id);
			},
		}),
		setCustomEventFieldName: historyAction({
			prepare(input: { eventId: number; fieldId: string; name: string }) {
				const field = core.project.customEvents
					.get(input.eventId)
					?.field(input.fieldId);
				if (!field) return;

				return { ...input, prev: field.name };
			},
			perform(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				event.editFieldName(entry.fieldId, entry.name);
			},
			rewind(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				event.editFieldName(entry.fieldId, entry.prev);
			},
		}),
		setCustomEventFieldType: historyAction({
			prepare(input: {
				eventId: number;
				fieldId: string;
				type: PrimitiveType;
			}) {
				const field = core.project.customEvents
					.get(input.eventId)
					?.field(input.fieldId);
				if (!field) return;

				return { ...input, prev: field.type };
			},
			perform(entry) {
				const struct = core.project.customEvents.get(entry.eventId);
				if (!struct) return;

				struct.editFieldType(entry.fieldId, entry.type);
			},
			rewind(entry) {
				const struct = core.project.customEvents.get(entry.eventId);
				if (!struct) return;

				struct.editFieldType(entry.fieldId, entry.prev as any);
			},
		}),
		deleteCustomEventField: historyAction({
			prepare(input: { eventId: number; fieldId: string }) {
				const field = core.project.customEvents
					.get(input.eventId)
					?.fields.find((f) => f.id === input.fieldId);
				if (!field) return;

				return { ...input, data: serializeCustomEventField(field) };
			},
			perform(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				event.deleteField(entry.fieldId);
			},
			rewind(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				event.fields.push(
					deserializeField(core.project, v.parse(serde.Field, entry.data)),
				);
			},
		}),
		createVariable: historyAction({
			prepare(input: VariableLocation) {
				if (input.location === "project")
					return { ...input, id: core.project.generateId() };

				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				return { ...input, id: graph.generateId() };
			},
			perform(entry) {
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
			rewind(entry) {
				if (entry.location === "project") core.project.removeVariable(entry.id);
				else {
					const graph = core.project.graphs.get(entry.graphId);
					if (!graph) return;

					graph.removeVariable(entry.id);
				}
			},
		}),
		setVariableName: historyAction({
			prepare(input: VariableLocation & { variableId: number; name: string }) {
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
			perform(entry) {
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
			rewind(entry) {
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
			prepare(input: VariableLocation & { variableId: number; value: any }) {
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
			perform(entry) {
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
			rewind(entry) {
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
			prepare(input: VariableLocation & { variableId: number; type: t.Any }) {
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
			perform(entry) {
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
				console.log({ type: variable.type, value: variable.value });
			},
			rewind(entry) {
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
			prepare(input: VariableLocation & { variableId: number }) {
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
			perform(entry) {
				if (entry.location === "project")
					core.project.removeVariable(entry.variableId);
				else {
					const graph = core.project.graphs.get(entry.graphId);
					if (!graph) return;

					graph.removeVariable(entry.variableId);
				}
			},
			rewind(entry) {
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
			prepare(input: { package: string; type: string }) {
				return { ...input, id: core.project.idCounter++ };
			},
			perform(entry) {
				const type = core.packages
					.find((p) => p.name === entry.package)
					?.resource(entry.type);
				if (!type) return;

				return core.project.createResource({
					id: entry.id,
					type,
					name: "New Resource",
				});
			},
			rewind(entry) {
				const type = core.packages
					.find((p) => p.name === entry.package)
					?.resource(entry.type);
				if (!type) return;

				const resource = core.project.resources.get(type);
				if (!resource) return;

				const itemIndex = resource.items.findIndex((i) => i.id === entry.id);
				if (itemIndex === -1) return;

				resource.items.splice(itemIndex, 1);

				if (!resource.items.length) core.project.resources.delete(type);
			},
		}),
		setResourceTypeDefault: historyAction({
			prepare(input: { defaultId: number; type: ResourceType<any, any> }) {
				const resource = core.project.resources.get(input.type);
				if (!resource) return;

				return { ...input, prev: resource.default };
			},
			perform(entry) {
				const resource = core.project.resources.get(entry.type);
				if (!resource) return;

				resource.default = entry.defaultId;
			},
			rewind(entry) {
				const resource = core.project.resources.get(entry.type);
				if (!resource) return;

				resource.default = entry.prev;
			},
		}),
		setResourceName: historyAction({
			prepare(input: {
				type: ResourceType<any, any>;
				resourceId: number;
				name: string;
			}) {
				const resource = core.project.resources.get(input.type);
				if (!resource) return;
				const item = resource.items.find((i) => i.id === input.resourceId);
				if (!item) return;

				if (item.name === input.name) return;

				return { ...input, prev: item.name };
			},
			perform(entry) {
				const item = core.project.resources
					.get(entry.type)
					?.items.find((i) => i.id === entry.resourceId);
				if (!item) return;

				item.name = entry.name;
			},
			rewind(entry) {
				const item = core.project.resources
					.get(entry.type)
					?.items.find((i) => i.id === entry.resourceId);
				if (!item) return;

				item.name = entry.prev;
			},
		}),
		setResourceValue: historyAction({
			prepare(
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
			perform(entry) {
				const item = core.project.resources
					.get(entry.type)
					?.items.find((i) => i.id === entry.resourceId);
				if (!item) return;

				if ("value" in entry && "value" in item) item.value = entry.value;
				else if ("sourceId" in item && "sourceId" in entry)
					item.sourceId = entry.sourceId;
			},
			rewind(entry) {
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
			prepare(input: { type: ResourceType<any, any>; resourceId: number }) {
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
			perform(entry) {
				const resource = core.project.resources.get(entry.type);
				if (!resource) return;

				resource.items.splice(entry.index, 1);

				if (!resource.items.length) core.project.resources.delete(entry.type);
			},
			rewind(entry) {
				if (!core.project.resources.has(entry.type)) {
					core.project.resources.set(
						entry.type,
						createMutable({ default: entry.default, items: [] }),
					);
				}

				const resource = core.project.resources.get(entry.type)!;

				resource.items.splice(entry.index, 0, { ...entry.data });
			},
		}),
		// _pasteGraphSelection: _historyAction({
		//   perform(
		//     input: PerformInput<
		//       GraphRef & {
		//         mousePosition: XY;
		//         selection: Extract<
		//           v.InferOutput<typeof ClipboardItem>,
		//           { type: "selection" }
		//         >;
		//       },
		//       GraphRef & {
		//         nodes: Array<v.InferOutput<typeof serde.Node>>;
		//         commentBoxes: Array<v.InferOutput<typeof serde.CommentBox>>;
		//       }
		//     >,
		//   ) {
		//     const graph = getGraph(input.data);

		//     if (input.type === "perform") {
		//       const nodeIdMap = new Map<number, number>();
		//       const boxIdMap = new Map<number, number>();

		//       const { selection, mousePosition } = input.data;

		//       for (const nodeData of selection.nodes) {
		//         const id = graph.generateId();
		//         nodeIdMap.set(nodeData.id, id);
		//         nodeData.id = id;
		//         nodeData.position = {
		//           x: mousePosition.x + nodeData.position.x - selection.origin.x,
		//           y: mousePosition.y + nodeData.position.y - selection.origin.y,
		//         };
		//       }

		//       for (const box of selection.commentBoxes) {
		//         const id = graph.generateId();
		//         boxIdMap.set(box.id, id);
		//         box.id = id;
		//         box.position = {
		//           x: mousePosition.x + box.position.x - selection.origin.x,
		//           y: mousePosition.y + box.position.y - selection.origin.y,
		//         };
		//       }

		//       for (const nodeData of selection.nodes) {
		//         const node = deserializeNode(graph, nodeData);
		//         if (!node) {
		//           console.error("Failed to deserialize node");
		//           continue;
		//         }

		//         graph.nodes.set(node.id, node);
		//       }

		//       for (const box of selection.commentBoxes) {
		//         const commentBox = deserializeCommentBox(graph, box);
		//         if (!commentBox) {
		//           console.error("Failed to deserialize comment box");
		//           continue;
		//         }

		//         graph.commentBoxes.set(commentBox.id, commentBox);
		//       }

		//       deserializeConnections(
		//         selection.connections,
		//         graph.connections,
		//         nodeIdMap,
		//       );

		//       if (selection.selected) {
		//         const selected: Array<SelectedItemID> = [];

		//         for (const nodeId of selection.selected.nodes) {
		//           const mappedId = nodeIdMap.get(nodeId);

		//           if (mappedId !== undefined)
		//             selected.push({ type: "node", id: mappedId });
		//         }

		//         for (const boxId of selection.selected.commentBoxes) {
		//           const mappedId = boxIdMap.get(boxId);

		//           if (mappedId !== undefined)
		//             selected.push({ type: "commentBox", id: mappedId });
		//         }

		//         // editor.setGraphStates(
		//         //   editor.currentGraphIndex()!,
		//         //   "selectedItemIds",
		//         //   selected,
		//         // );
		//       }
		//     }
		//     return [
		//       ,
		//       {
		//         input,
		//         graphId: graph.id,
		//         nodes: [...nodeIdMap.keys()],
		//         commentBoxes: [...boxIdMap.keys()],
		//       },
		//     ];
		//   },
		//   rewind(data) {
		//     const graph = core.project.graphs.get(data.graphId);
		//     if (!graph) return;

		//     const ret = {
		//       graphId: data.graphId,
		//       nodes: data.nodes.flatMap((id) => {
		//         const node = graph.node(id);
		//         if (!node) return [];
		//         return [v.parse(serde.Node, serializeNode(node))];
		//       }),
		//       commentBoxes: data.commentBoxes.flatMap((id) => {
		//         const box = graph.commentBoxes.get(id);
		//         if (!box) return [];
		//         return [v.parse(serde.CommentBox, serializeCommentBox(box))];
		//       }),
		//     };

		//     for (const id of data.nodes) {
		//       const node = graph.nodes.get(id);
		//       if (!node) continue;

		//       graph.deleteNode(node);
		//     }

		//     for (const id of data.commentBoxes) {
		//       if (id === undefined) continue;
		//       const box = graph.commentBoxes.get(id);
		//       if (!box) continue;

		//       graph.deleteCommentbox(box);
		//     }

		//     return ret;
		//   },
		// }),
		pasteGraphSelection: historyAction({
			prepare({
				selection,
				...input
			}: {
				graphId: number;
				mousePosition: XY;
				selection: Extract<
					v.InferOutput<typeof ClipboardItem>,
					{ type: "selection" }
				>;
			}) {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				const nodeIdMap = new Map<number, number>();
				const boxIdMap = new Map<number, number>();

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
					const id = graph.generateId();
					boxIdMap.set(box.id, id);
					box.id = id;
					box.position = {
						x: input.mousePosition.x + box.position.x - selection.origin.x,
						y: input.mousePosition.y + box.position.y - selection.origin.y,
					};
				}

				return {
					...input,
					...selection,
					nodeIdMap,
					boxIdMap,
					prev: {
						// selection: [
						//   ...(editor.graphStates[editor.currentGraphIndex()!]
						//     ?.selectedItemIds ?? []),
						// ],
					},
				};
			},
			perform(input) {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				for (const nodeData of input.nodes) {
					const node = deserializeNode(graph, nodeData);
					if (!node) {
						console.error("Failed to deserialize node");
						continue;
					}

					graph.nodes.set(node.id, node);
				}

				for (const box of input.commentBoxes) {
					const commentBox = deserializeCommentBox(graph, box);
					if (!commentBox) {
						console.error("Failed to deserialize comment box");
						continue;
					}

					graph.commentBoxes.set(commentBox.id, commentBox);
				}

				deserializeConnections(
					input.connections,
					graph.connections,
					input.nodeIdMap,
				);

				if (input.selected) {
					const selected: Array<SelectedItemID> = [];

					for (const nodeId of input.selected.nodes) {
						const mappedId = input.nodeIdMap.get(nodeId);

						if (mappedId !== undefined)
							selected.push({ type: "node", id: mappedId });
					}

					for (const boxId of input.selected.commentBoxes) {
						const mappedId = input.boxIdMap.get(boxId);

						if (mappedId !== undefined)
							selected.push({ type: "commentBox", id: mappedId });
					}

					// editor.setGraphStates(
					//   editor.currentGraphIndex()!,
					//   "selectedItemIds",
					//   selected,
					// );
				}
			},
			rewind(entry) {
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

				// editor.setGraphStates(
				//   editor.currentGraphIndex()!,
				//   "selectedItemIds",
				//   entry.prev.selection,
				// );
			},
		}),
		// _pasteGraph: _historyAction({
		//   async perform(input: PerformInput<v.InferOutput<typeof serde.Graph>>) {
		//     if (input.type === "perform") {
		//       input.data.id = core.project.generateGraphId();
		//     }

		//     const graph = await deserializeGraph(core.project, input.data);
		//     if (!graph) return;

		//     core.project.graphs.set(graph.id, graph);

		//     return [graph, { graphId: graph.id }];
		//   },
		//   rewind(data) {
		//     const graph = getGraph(data);

		//     const serialized = v.parse(serde.Graph, serializeGraph(graph));

		//     core.project.graphs.delete(graph.id);
		//     graph.dispose();

		//     return serialized;
		//   },
		// }),
		pasteGraph: historyAction({
			prepare(data: v.InferOutput<typeof serde.Graph>) {
				const graphId = core.project.generateGraphId();

				data.id = graphId;

				return { data, graphId };
			},
			async perform(entry) {
				const graph = await deserializeGraph(core.project, entry.data);
				if (!graph) return;

				core.project.pasteGraph(graph);
				// core.project.graphs.set(graph.id, graph);
			},
			rewind(entry) {
				const graph = core.project.graphs.get(entry.data.id);
				if (!graph) return;

				core.project.graphs.delete(entry.data.id);
				graph.dispose();
			},
		}),
		setGraphSelection: historyAction({
			prepare(input: {
				graphId: number;
				selection: Array<SelectedItemID>;
				prev?: Array<SelectedItemID>;
			}) {
				const graphState = getFocusedGraphState(input.graphId);
				if (!graphState) return;

				const ret = {
					...input,
					prev: input.prev ?? [...graphState.selectedItemIds],
				};

				return ret;
			},
			perform(entry) {
				editor.setMosaicState(
					"groups",
					editor.mosaicState.focusedIndex,
					"tabs",
					(_, i) =>
						i ===
						editor.mosaicState.groups[editor.mosaicState.focusedIndex]
							?.selectedIndex,
					"selectedItemIds",
					[...entry.selection],
				);
			},
			rewind(entry) {
				editor.setMosaicState(
					"groups",
					editor.mosaicState.focusedIndex,
					"tabs",
					(_, i) =>
						i ===
						editor.mosaicState.groups[editor.mosaicState.focusedIndex]
							?.selectedIndex,
					"selectedItemIds",
					[...entry.prev],
				);
			},
		}),
		// _moveGraphToIndex: _historyAction(() => {
		//   type Data = GraphRef & { index: number };

		//   function action(data: Data) {
		//     const graph = getGraph(data);

		//     const prevIndex = core.project.graphOrder.findIndex(
		//       (id) => id === graph.id,
		//     );

		//     if (prevIndex === -1 || prevIndex === data.index) return;

		//     core.project.graphOrder.splice(prevIndex, 1);
		//     core.project.graphOrder.splice(data.index, 0, graph.id);

		//     return { ...data, index: prevIndex };
		//   }

		//   return {
		//     perform(input: PerformInput<Data>) {
		//       return [, action(input.data)];
		//     },
		//     rewind(data) {
		//       return action(data);
		//     },
		//   };
		// }),
		moveGraphToIndex: historyAction({
			prepare(input: {
				graphId: number;
				currentIndex: number;
				newIndex: number;
			}) {
				const graph = core.project.graphs.get(input.graphId);
				if (!graph) return;

				if (core.project.graphOrder[input.currentIndex] !== input.graphId)
					return;
				if (input.currentIndex === input.newIndex) return;

				return input;
			},
			perform(entry) {
				core.project.graphOrder.splice(entry.currentIndex, 1);
				core.project.graphOrder.splice(entry.newIndex, 0, entry.graphId);
			},
			rewind(entry) {
				core.project.graphOrder.splice(entry.newIndex, 1);
				core.project.graphOrder.splice(entry.currentIndex, 0, entry.graphId);
			},
		}),
		// _moveCustomEventFieldToIndex: _historyAction(() => {
		//   type Data = CustomEventFieldRef & { index: number };

		//   function action(data: Data) {
		//     const event = getCustomEvent(data);

		//     const prevIndex = event.fields.findIndex((f) => f === field);
		//     if (prevIndex === -1 || prevIndex === data.index) abort();

		//     const [field] = event.fields.splice(prevIndex, 1);
		//     event.fields.splice(data.index, 0, field!);

		//     return { ...data, index: prevIndex };
		//   }

		//   return {
		//     perform(input: PerformInput<Data>) {
		//       return [, action(input.data)];
		//     },
		//     rewind(data) {
		//       return action(data);
		//     },
		//   };
		// }),
		moveCustomEventFieldToIndex: historyAction({
			prepare(input: {
				eventId: number;
				fieldId: string;
				currentIndex: number;
				newIndex: number;
			}) {
				const event = core.project.customEvents.get(input.eventId);
				if (!event) return;

				const field = event.field(input.fieldId);
				if (!field) return;
				if (event.fields[input.currentIndex] !== field) return;
				if (input.currentIndex === input.newIndex) return;

				return input;
			},
			perform(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				const [field] = event.fields.splice(entry.currentIndex, 1);
				event.fields.splice(entry.newIndex, 0, field!);
			},
			rewind(entry) {
				const event = core.project.customEvents.get(entry.eventId);
				if (!event) return;

				const [field] = event.fields.splice(entry.currentIndex, 1);
				event.fields.splice(entry.newIndex, 0, field!);
			},
		}),
		// _moveCustomStructFieldToIndex: _historyAction(() => {
		//   type Data = CustomStructFieldRef & { index: number };

		//   function action(data: Data) {
		//     const struct = getCustomStruct(data);
		//     const field = getCustomStructField(data);

		//     const prevIndex = struct.fieldOrder.findIndex((id) => id === field.id);
		//     if (prevIndex === -1 || prevIndex === data.index) abort();

		//     struct.fieldOrder.splice(prevIndex, 1);
		//     struct.fieldOrder.splice(data.index, 0, field.id);

		//     return { ...data, index: prevIndex };
		//   }

		//   return {
		//     perform(input: PerformInput<Data>) {
		//       return [, action(input.data)];
		//     },
		//     rewind(data) {
		//       return action(data);
		//     },
		//   };
		// }),
		moveCustomStructFieldToIndex: historyAction({
			prepare(input: {
				structId: number;
				fieldId: string;
				currentIndex: number;
				newIndex: number;
			}) {
				const struct = core.project.customStructs.get(input.structId);
				if (!struct) return;

				const field = struct.fields[input.fieldId];
				if (!field) return;
				if (struct.fieldOrder[input.currentIndex] !== field.id) return;
				if (input.currentIndex === input.newIndex) return;

				return input;
			},
			perform(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				struct.fieldOrder.splice(entry.currentIndex, 1);
				struct.fieldOrder.splice(entry.newIndex, 0, entry.fieldId);
			},
			rewind(entry) {
				const struct = core.project.customStructs.get(entry.structId);
				if (!struct) return;

				struct.fieldOrder.splice(entry.newIndex, 1);
				struct.fieldOrder.splice(entry.currentIndex, 0, entry.fieldId);
			},
		}),
		// _moveCustomEnumVariantToIndex: _historyAction(() => {
		//   type Data = CustomEnumVariantRef & { index: number };

		//   function action(data: Data) {
		//     const enm = getCustomEnum(data);

		//     const prevIndex = enm.variants.findIndex(
		//       (v) => v.id === data.variantId,
		//     );
		//     if (prevIndex === -1 || prevIndex === data.index) abort();

		//     const [variant] = enm.variants.splice(prevIndex, 1);
		//     enm.variants.splice(data.index, 0, variant!);

		//     return { ...data, index: prevIndex };
		//   }

		//   return {
		//     perform(input: PerformInput<Data>) {
		//       return [, action(input.data)];
		//     },
		//     rewind(data) {
		//       return action(data);
		//     },
		//   };
		// }),
		moveCustomEnumVariantToIndex: historyAction({
			prepare(input: {
				enumId: number;
				variantId: string;
				currentIndex: number;
				newIndex: number;
			}) {
				if (input.currentIndex === input.newIndex) return;

				const enm = core.project.customEnums.get(input.enumId);
				if (!enm) return;

				const variant = enm.variants[input.currentIndex];
				if (!variant) return;
				if (variant.id !== input.variantId) return;

				return input;
			},
			perform(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				const [variant] = enm.variants.splice(entry.currentIndex, 1);
				enm.variants.splice(entry.newIndex, 0, variant!);
			},
			rewind(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				const [variant] = enm.variants.splice(entry.newIndex, 1);
				enm.variants.splice(entry.currentIndex, 0, variant!);
			},
		}),
		// _moveCustomEnumVariantFieldToIndex: _historyAction(() => {
		//   type Data = CustomEnumVariantFieldRef & { index: number };

		//   function action(data: Data) {
		//     const enm = getCustomEnum(data);

		//     const variant = enm.variant(data.variantId);
		//     if (!variant) abort();

		//     const field = variant.fields[data.fieldId];
		//     if (!field) abort();

		//     const prevIndex = variant.fieldOrder.findIndex((f) => f === field.id);
		//     if (prevIndex === -1 || prevIndex === data.index) abort();

		//     variant.fieldOrder.splice(prevIndex, 1);
		//     variant.fieldOrder.splice(data.index, 0, data.fieldId);

		//     return { ...data, index: prevIndex };
		//   }

		//   return {
		//     perform(input: PerformInput<Data>) {
		//       return [, action(input.data)];
		//     },
		//     rewind(data) {
		//       return action(data);
		//     },
		//   };
		// }),
		moveCustomEnumVariantFieldToIndex: historyAction({
			prepare(
				input: CustomEnumVariantFieldRef & {
					currentIndex: number;
					newIndex: number;
				},
			) {
				const enm = core.project.customEnums.get(input.enumId);
				if (!enm) return;

				const variant = enm.variant(input.variantId);
				if (!variant) return;

				const field = variant.fields[input.fieldId];
				if (!field) return;

				if (variant.fieldOrder[input.currentIndex] !== field.id) return;
				if (input.currentIndex === input.newIndex) return;

				return input;
			},
			perform(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				const variant = enm.variant(entry.variantId);
				if (!variant) return;

				variant.fieldOrder.splice(entry.currentIndex, 1);
				variant.fieldOrder.splice(entry.newIndex, 0, entry.fieldId);
			},
			rewind(entry) {
				const enm = core.project.customEnums.get(entry.enumId);
				if (!enm) return;

				const variant = enm.variant(entry.variantId);
				if (!variant) return;

				variant.fieldOrder.splice(entry.newIndex, 1);
				variant.fieldOrder.splice(entry.currentIndex, 0, entry.fieldId);
			},
		}),
	};
};

export type HistoryActions = ReturnType<typeof historyActions>;
