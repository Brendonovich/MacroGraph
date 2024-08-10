import type { Option } from "@macrograph/option";
import {
	CommentBox,
	type DataOutput,
	ExecInput,
	type GetNodeSize,
	Graph,
	type InputPin,
	Node,
	type OutputPin,
	Project,
	type ScopeOutput,
	getNodesInRect,
} from "@macrograph/runtime";
import {
	serde,
	serializeCommentBox,
	serializeGraph,
	serializeNode,
	serializeProject,
} from "@macrograph/runtime-serde";
import * as v from "valibot";

export const ClipboardItem = v.variant("type", [
	v.object({
		type: v.literal("node"),
		node: serde.Node,
	}),
	v.object({
		type: v.literal("commentBox"),
		commentBox: serde.CommentBox,
		nodes: v.array(serde.Node),
		connections: v.array(serde.Connection),
	}),
	v.object({
		type: v.literal("graph"),
		graph: serde.Graph,
	}),
	v.object({
		type: v.literal("project"),
		project: serde.Project,
	}),
	v.object({
		type: v.literal("selection"),
		origin: serde.XY,
		nodes: v.array(serde.Node),
		commentBoxes: v.array(serde.CommentBox),
		connections: v.array(serde.Connection),
		selected: v.optional(
			v.object({
				nodes: v.array(v.number()),
				commentBoxes: v.array(v.number()),
			}),
		),
	}),
]);

export type ClipboardItem = v.InferInput<typeof ClipboardItem>;

export function serializeClipboardItem(
	item: v.InferInput<typeof ClipboardItem>,
) {
	return btoa(JSON.stringify(item));
}

export function deserializeClipboardItem(input: string) {
	return v.parse(ClipboardItem, JSON.parse(atob(input)));
}

export async function readFromClipboard() {
	return await navigator.clipboard.readText();
}

export function writeToClipboard(data: string) {
	return navigator.clipboard.writeText(data);
}

export function nodeToClipboardItem(
	node: Node,
): Extract<v.InferInput<typeof ClipboardItem>, { type: "node" }> {
	return {
		type: "node",
		node: serializeNode(node),
	};
}

export function serializeConnections(nodes: Set<Node>) {
	const connections: v.InferInput<typeof serde.Connection>[] = [];

	for (const node of nodes) {
		for (const i of node.state.inputs) {
			if (i instanceof ExecInput) {
				for (const conn of i.connections) {
					if (!nodes.has(conn.node)) continue;

					connections.push(serializeConnection(conn, i));
				}
			} else {
				(i.connection as unknown as Option<DataOutput<any> | ScopeOutput>).peek(
					(conn) => {
						if (!nodes.has(conn.node)) return;

						connections.push(serializeConnection(conn, i));
					},
				);
			}
		}
	}

	return connections;
}

export function serializeConnection(
	from: OutputPin,
	to: InputPin,
): v.InferInput<typeof serde.Connection> {
	return {
		from: { node: from.node.id, output: from.id },
		to: { node: to.node.id, input: to.id },
	};
}

export function commentBoxToClipboardItem(
	box: CommentBox,
	getNodeSize: GetNodeSize,
): Extract<ClipboardItem, { type: "commentBox" }> {
	const nodes = getNodesInRect(
		box.graph.nodes.values(),
		new DOMRect(box.position.x, box.position.y, box.size.x, box.size.y),
		getNodeSize,
	);

	return {
		type: "commentBox",
		commentBox: serializeCommentBox(box),
		nodes: [...nodes].map(serializeNode),
		connections: serializeConnections(nodes),
	};
}

export function graphToClipboardItem(
	graph: Graph,
): Extract<ClipboardItem, { type: "graph" }> {
	return {
		type: "graph",
		graph: serializeGraph(graph),
	};
}

export function projectToClipboardItem(
	project: Project,
): Extract<ClipboardItem, { type: "project" }> {
	return {
		type: "project",
		project: serializeProject(project),
	};
}

export type ClipboardModel = Node | CommentBox | Graph | Project;

export interface ModelArgs {
	model: ClipboardModel;
	getNodeSize: GetNodeSize;
}

export function modelToClipboardItem(
	args: ModelArgs,
): v.InferInput<typeof ClipboardItem> {
	const { model } = args;

	if (model instanceof Node) return nodeToClipboardItem(model);
	if (model instanceof CommentBox)
		return commentBoxToClipboardItem(model, args.getNodeSize);
	if (model instanceof Graph) return graphToClipboardItem(model);
	if (model instanceof Project) return projectToClipboardItem(model);

	// should never happen
	throw new Error("Invalid clipboard item");
}

export function writeClipboardItemToClipboard(
	item: v.InferInput<typeof ClipboardItem>,
) {
	return writeToClipboard(serializeClipboardItem(item));
}

export function writeModelToClipboard(args: ModelArgs) {
	return writeClipboardItemToClipboard(modelToClipboardItem(args));
}
