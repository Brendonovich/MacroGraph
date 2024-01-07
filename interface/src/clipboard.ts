import { z } from "zod";
import {
  Node,
  SerializedNode,
  SerializedCommentBox,
  SerializedGraph,
  SerializedProject,
  SerializedConnection,
  CommentBox,
  Graph,
  Project,
  GetNodeSize,
} from "@macrograph/runtime";

export const ClipboardItem = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("node"),
    node: SerializedNode,
  }),
  z.object({
    type: z.literal("commentBox"),
    commentBox: SerializedCommentBox,
    nodes: z.array(SerializedNode),
    connections: z.array(SerializedConnection),
  }),
  z.object({
    type: z.literal("graph"),
    graph: SerializedGraph,
  }),
  z.object({
    type: z.literal("project"),
    project: SerializedProject,
  }),
]);

export type ClipboardItem = z.infer<typeof ClipboardItem>;

export function serializeClipboardItem(item: ClipboardItem) {
  return btoa(JSON.stringify(item));
}

export function deserializeClipboardItem(input: string) {
  return ClipboardItem.parse(JSON.parse(atob(input)));
}

export async function readFromClipboard() {
  return await navigator.clipboard.readText();
}

export function writeToClipboard(data: string) {
  return navigator.clipboard.writeText(data);
}

export function nodeToClipboardItem(
  node: Node
): Extract<ClipboardItem, { type: "node" }> {
  return {
    type: "node",
    node: node.serialize(),
  };
}

export function commentBoxToClipboardItem(
  box: CommentBox,
  getNodeSize: GetNodeSize
): Extract<ClipboardItem, { type: "commentBox" }> {
  const nodes = box.getNodes(box.graph.nodes.values(), getNodeSize);
  // const connections = serializeConnections(nodes.values());

  return {
    type: "commentBox",
    commentBox: box.serialize(),
    nodes: nodes.map((n) => n.serialize()),
    connections: [],
  };
}

export function graphToClipboardItem(
  graph: Graph
): Extract<ClipboardItem, { type: "graph" }> {
  return {
    type: "graph",
    graph: graph.serialize(),
  };
}

export function projectToClipboardItem(
  project: Project
): Extract<ClipboardItem, { type: "project" }> {
  return {
    type: "project",
    project: project.serialize(),
  };
}

export type ClipboardModel = Node | CommentBox | Graph | Project;

export interface ModelArgs {
  model: ClipboardModel;
  getNodeSize: GetNodeSize;
}

export function modelToClipboardItem(args: ModelArgs): ClipboardItem {
  const { model } = args;

  if (model instanceof Node) return nodeToClipboardItem(model);
  if (model instanceof CommentBox)
    return commentBoxToClipboardItem(model, args.getNodeSize);
  if (model instanceof Graph) return graphToClipboardItem(model);
  if (model instanceof Project) return projectToClipboardItem(model);

  // should never happen
  throw new Error("Invalid clipboard item");
}

export function writeClipboardItemToClipboard(item: ClipboardItem) {
  return writeToClipboard(serializeClipboardItem(item));
}

export function writeModelToClipboard(args: ModelArgs) {
  return writeClipboardItemToClipboard(modelToClipboardItem(args));
}
