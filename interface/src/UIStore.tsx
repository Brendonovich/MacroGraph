import {
  XY,
  Graph,
  Node,
  Pin,
  CommentBox,
  Project,
  SerializedNode,
  SerializedCommentBox,
  SerializedGraph,
  SerializedProject,
  SerializedConnection,
  serializeConnections,
  Core,
} from "@macrograph/core";
import { createMutable } from "solid-js/store";
import { createContext, useContext, ParentProps } from "solid-js";
import { z } from "zod";

import { GraphState, toGraphSpace } from "./components/Graph";

type SchemaMenuState =
  | { status: "closed" }
  | { status: "open"; position: XY; graph: GraphState };

export function createUIStore(core: Core) {
  const state = createMutable({
    draggingPin: null as Pin | null,
    hoveringPin: null as Pin | null,
    mouseDragLocation: null as XY | null,
    mouseDownTranslate: null as XY | null,

    hoveredGraph: null as Graph | null,

    schemaMenu: {
      status: "closed",
    } as SchemaMenuState,

    nodeBounds: new WeakMap<Node, { width: number; height: number }>(),
  });

  return {
    state,
    setDraggingPin(pin?: Pin) {
      state.draggingPin = pin ?? null;
    },
    setHoveringPin(pin?: Pin) {
      state.hoveringPin = pin ?? null;
    },
    setMouseDragLocation(location?: XY) {
      state.mouseDragLocation = location ?? null;
    },
    setMouseDownTranslate(translate?: XY) {
      state.mouseDownTranslate = translate ?? null;
    },
    copyItem(item: Node | CommentBox | Graph | Project) {
      let data: z.infer<typeof CopyItem>;
      if (item instanceof Node)
        data = {
          type: "node",
          node: item.serialize(),
        };
      else if (item instanceof CommentBox) {
        const nodes = item.getNodes(
          item.graph.nodes.values(),
          (node) => state.nodeBounds.get(node) ?? null
        );
        const connections = serializeConnections(nodes.values());
        data = {
          type: "commentBox",
          commentBox: item.serialize(),
          nodes: nodes.map((n) => n.serialize()),
          connections,
        };
      } else if (item instanceof Graph)
        data = {
          type: "graph",
          graph: item.serialize(),
        };
      else if (item instanceof Project)
        data = {
          type: "project",
          project: item.serialize(),
        };
      // impossible
      else return;
      const string = JSON.stringify(data);
      navigator.clipboard.writeText(btoa(string));
    },
    // async pasteClipboard() {
    //   const text = await navigator.clipboard.readText();
    //   const json = JSON.parse(atob(text));
    //   const item = CopyItem.parse(json);
    //   switch (item.type) {
    //     case "node": {
    //       if (!state.focusedGraph) return;

    //       const graphState = state.graphStates.get(state.focusedGraph);
    //       if (!graphState) throw new Error("Graph state not found!");

    //       item.node.id = state.focusedGraph.generateId();
    //       const node = Node.deserialize(state.focusedGraph, {
    //         ...item.node,
    //         position: toGraphSpace(
    //           { x: mouse.x - 10, y: mouse.y - 10 },
    //           graphState
    //         ),
    //       });
    //       if (!node) throw new Error("Failed to deserialize node");
    //       state.focusedGraph.nodes.set(item.node.id, node);
    //       break;
    //     }
    //     case "commentBox": {
    //       if (!state.focusedGraph) return;

    //       const graphState = state.graphStates.get(state.focusedGraph);
    //       if (!graphState) return;

    //       item.commentBox.id = state.focusedGraph.generateId();
    //       const commentBox = CommentBox.deserialize(state.focusedGraph, {
    //         ...item.commentBox,
    //         position: toGraphSpace(
    //           { x: mouse.x - 10, y: mouse.y - 10 },
    //           graphState
    //         ),
    //       });
    //       if (!commentBox) throw new Error("Failed to deserialize comment box");
    //       state.focusedGraph.commentBoxes.set(item.commentBox.id, commentBox);

    //       const nodeIdMap = new Map<number, number>();
    //       for (const nodeJson of item.nodes) {
    //         const id = state.focusedGraph.generateId();
    //         nodeIdMap.set(nodeJson.id, id);
    //         nodeJson.id = id;
    //         const node = Node.deserialize(state.focusedGraph, {
    //           ...nodeJson,
    //           position: {
    //             x:
    //               commentBox.position.x +
    //               nodeJson.position.x -
    //               item.commentBox.position.x,
    //             y:
    //               commentBox.position.y +
    //               nodeJson.position.y -
    //               item.commentBox.position.y,
    //           },
    //         });
    //         if (!node) throw new Error("Failed to deserialize node");
    //         state.focusedGraph.nodes.set(node.id, node);
    //       }
    //       state.focusedGraph.deserializeConnections(item.connections, {
    //         nodeIdMap,
    //       });
    //       break;
    //     }
    //     case "graph": {
    //       item.graph.id = core.project.generateGraphId();
    //       const graph = await Graph.deserialize(core.project, item.graph);
    //       if (!graph) throw new Error("Failed to deserialize graph");
    //       core.project.graphs.set(graph.id, graph);
    //       break;
    //     }
    //     case "project": {
    //       const project = await Project.deserialize(core, item.project);
    //       if (!project) throw new Error("Failed to deserialize project");
    //       core.project = project;
    //       break;
    //     }
    //   }
    // },
  };
}

const CopyItem = z.discriminatedUnion("type", [
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

export type UIStore = ReturnType<typeof createUIStore>;

const UIStoreContext = createContext<UIStore | null>(null);

export const useUIStore = () => {
  const ctx = useContext(UIStoreContext);

  if (!ctx) throw new Error("UIStoreContext not found!");

  return ctx;
};

export const UIStoreProvider = (props: ParentProps<{ store: UIStore }>) => {
  return (
    <UIStoreContext.Provider value={props.store}>
      {props.children}
    </UIStoreContext.Provider>
  );
};
