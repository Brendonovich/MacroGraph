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
  ExecInput,
  DataOutput,
  ScopeOutput,
} from "@macrograph/runtime";
import { Option } from "@macrograph/option";

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

export function serializeConnections(nodes: Set<Node>) {
  const connections: z.infer<typeof SerializedConnection>[] = [];

  for (const node of nodes) {
    node.state.inputs.forEach((i) => {
      if (i instanceof ExecInput) {
        i.connections.forEach((conn) => {
          if (!nodes.has(conn.node)) return;

          connections.push({
            from: { node: conn.node.id, output: conn.id },
            to: { node: i.node.id, input: i.id },
          });
        });
      } else {
        (i.connection as unknown as Option<DataOutput<any> | ScopeOutput>).peek(
          (conn) => {
            if (!nodes.has(conn.node)) return;

            connections.push({
              from: { node: conn.node.id, output: conn.id },
              to: { node: i.node.id, input: i.id },
            });
          }
        );
      }
    });
  }

  return connections;
}

export function commentBoxToClipboardItem(
  box: CommentBox,
  getNodeSize: GetNodeSize
): Extract<ClipboardItem, { type: "commentBox" }> {
  const nodes = box.getNodes(box.graph.nodes.values(), getNodeSize);

  return {
    type: "commentBox",
    commentBox: box.serialize(),
    nodes: [...nodes].map((n) => n.serialize()),
    connections: serializeConnections(nodes),
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
