import {
  Position,
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
  core,
  SerializedConnection,
  ExecInput,
  serializeConnections,
} from "@macrograph/core";
import { createMutable } from "solid-js/store";
import {
  $TRACK,
  createContext,
  createEffect,
  onMount,
  ParentProps,
  useContext,
} from "solid-js";
import { ReactiveWeakMap } from "@solid-primitives/map";
import { z } from "zod";

export function createUIStore() {
  const state = createMutable({
    selectedItem: null as Node | CommentBox | null,
    draggingPin: null as Pin | null,
    hoveringPin: null as Pin | null,
    mousePos: null as XY | null,
    mouseDragLocation: null as XY | null,
    /**
     *	Screen space relative to graph origin
     */
    schemaMenuPosition: null as Position | null,
    mouseDownLocation: null as XY | null,
    mouseDownTranslate: null as XY | null,

    currentGraph: null as Graph | null,
    nodeBounds: new WeakMap<Node, { width: number; height: number }>(),

    graphOffset: {
      x: 0,
      y: 0,
    } as XY,
    translate: {
      x: 0,
      y: 0,
    } as XY,
    scale: 1,

    pinPositions: new ReactiveWeakMap<Pin, XY>(),
  });

  onMount(() => {
    const handler = (e: MouseEvent) => {
      state.mousePos = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  });

  createEffect(() => {
    if (!state.currentGraph) return;

    const project = state.currentGraph?.project;
    if (!project) return;

    if (project.graphs.size === 0) state.currentGraph = null;
  });

  return {
    state,
    toGraphSpace(relativeScreenSpace: XY) {
      return {
        x: relativeScreenSpace.x / state.scale + state.translate.x,
        y: relativeScreenSpace.y / state.scale + state.translate.y,
      };
    },
    // Converts a location in the graph (eg the graph's origin (0,0)) to its location on screen relative to the graph origin
    toScreenSpace(point: XY) {
      return {
        x: (point.x - state.translate.x) * state.scale,
        y: (point.y - state.translate.y) * state.scale,
      };
    },
    setSelectedItem(item?: Node | CommentBox) {
      state.selectedItem = item ?? null;
    },
    setPinPosition(pin: Pin, position: XY) {
      state.pinPositions.set(pin, position);
    },
    updateTranslate(delta: XY) {
      state.translate.x += delta.x;
      state.translate.y += delta.y;
    },
    setTranslate(translate: XY) {
      state.translate = translate;
    },
    updateScale(delta: number, screenOrigin: XY) {
      const startGraphOrigin = this.toGraphSpace(screenOrigin);
      state.scale = Math.min(Math.max(0.5, state.scale + delta / 10), 2.5);
      const endGraphOrigin = this.toScreenSpace(startGraphOrigin);

      state.translate = {
        x:
          state.translate.x + (endGraphOrigin.x - screenOrigin.x) / state.scale,
        y:
          state.translate.y + (endGraphOrigin.y - screenOrigin.y) / state.scale,
      };
    },
    setDraggingPin(pin?: Pin) {
      state.draggingPin = pin ?? null;
    },
    setHoveringPin(pin?: Pin) {
      state.hoveringPin = pin ?? null;
    },
    setMouseDragLocation(location?: XY) {
      state.mouseDragLocation = location ?? null;
    },
    setMouseDownLocation(location?: XY) {
      state.mouseDownLocation = location ?? null;
    },
    setSchemaMenuPosition(screenSpace?: XY) {
      if (!screenSpace) state.schemaMenuPosition = null;
      else
        state.schemaMenuPosition = {
          x: screenSpace.x - state.graphOffset.x,
          y: screenSpace.y - state.graphOffset.y,
        };
    },
    setMouseDownTranslate(translate?: XY) {
      state.mouseDownTranslate = translate ?? null;
    },
    setGraphOffset(offset: XY) {
      state.graphOffset = offset;
    },
    setCurrentGraph(graph: Graph) {
      this.setSchemaMenuPosition();
      this.setTranslate({ x: 0, y: 0 });
      state.currentGraph = graph;
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
    async pasteClipboard() {
      const text = await navigator.clipboard.readText();

      const json = JSON.parse(atob(text));

      const item = CopyItem.parse(json);

      switch (item.type) {
        case "node": {
          if (!state.currentGraph) return;

          if (!state.mousePos) throw new Error("Mouse position not set");

          item.node.id = state.currentGraph.generateNodeId();

          const node = Node.deserialize(state.currentGraph, {
            ...item.node,
            position: this.toGraphSpace({
              x: state.mousePos.x - 10 - state.graphOffset.x,
              y: state.mousePos.y - 10 - state.graphOffset.y,
            }),
          });

          if (!node) throw new Error("Failed to deserialize node");

          state.currentGraph.nodes.set(item.node.id, node);

          break;
        }
        case "commentBox": {
          if (!state.currentGraph) return;

          if (!state.mousePos) throw new Error("Mouse position not set");

          const commentBox = CommentBox.deserialize(state.currentGraph, {
            ...item.commentBox,
            position: this.toGraphSpace({
              x: state.mousePos.x - 10 - state.graphOffset.x,
              y: state.mousePos.y - 10 - state.graphOffset.y,
            }),
          });

          if (!commentBox) throw new Error("Failed to deserialize comment box");
          state.currentGraph.commentBoxes.add(commentBox);

          const nodeIdMap = new Map<number, number>();

          for (const nodeJson of item.nodes) {
            const id = state.currentGraph.generateNodeId();
            nodeIdMap.set(nodeJson.id, id);
            nodeJson.id = id;

            const node = Node.deserialize(state.currentGraph, {
              ...nodeJson,
              position: {
                x:
                  commentBox.position.x +
                  nodeJson.position.x -
                  item.commentBox.position.x,
                y:
                  commentBox.position.y +
                  nodeJson.position.y -
                  item.commentBox.position.y,
              },
            });

            if (!node) throw new Error("Failed to deserialize node");

            state.currentGraph.nodes.set(node.id, node);
          }

          state.currentGraph.deserializeConnections(item.connections, {
            nodeIdMap,
          });

          break;
        }
        case "graph": {
          item.graph.id = core.project.generateGraphId();

          const graph = await Graph.deserialize(core.project, item.graph);

          if (!graph) throw new Error("Failed to deserialize graph");

          core.project.graphs.set(graph.id, graph);

          break;
        }
        case "project": {
          const project = await Project.deserialize(core, item.project);

          if (!project) throw new Error("Failed to deserialize project");

          core.project = project;

          break;
        }
      }
    },
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

const UIStoreContext = createContext<UIStore>(null as any);

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
