
import {
  makeIORef,
  splitIORef,
  type Core,
  type XY,
} from "@macrograph/runtime";
import {
  deserializeCommentBox,
  deserializeConnections,
  deserializeGraph,
  deserializeNode,
  serde,
  serializeCommentBox,
  serializeGraph,
  serializeNode,
} from "@macrograph/runtime-serde";
import * as v from "valibot";

type HistoryEntry<T> = T extends object ? T : never;
type HistoryAction<R, P, I = void> = {
  prepare(core: Core, input: I): R;
  perform(core: Core, entry: HistoryEntry<R>): P;
  rewind(core: Core, entry: HistoryEntry<R>): void;
};

function historyAction<E, P, I = void>(args: HistoryAction<E, P, I>) {
  return args;
}

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
  deleteGraphSelection: historyAction({
    prepare(
      core,
      input: {
        graphId: number;
        items: Array<{ type: "node" | "commentBox"; id: number }>;
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
            const ref = makeIORef(input);

            const connections = graph.connections.get(ref);
            if (!connections) continue;

            for (const connectionRef of connections) {
              const inputData = splitIORef(ref);
              const outputData = splitIORef(connectionRef);

              if (
                items.some(
                  (i) => i.type === "node" && i.id === outputData.nodeId,
                )
              )
                continue;

              entry.connections.push({
                from: { node: outputData.nodeId, output: outputData.ioId },
                to: { node: inputData.nodeId, input: inputData.ioId },
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
  setGraphItemPosition: historyAction({
    prepare(
      core,
      input: {
        graphId: number;
        itemId: number;
        itemVariant: "node" | "commentBox";
        position: XY;
        from?: XY;
      },
    ) {
      const graph = core.project.graphs.get(input.graphId);
      if (!graph) return;

      let from = input.from;
      if (!from) {
        if (input.itemVariant === "node") {
          const node = graph.nodes.get(input.itemId);
          if (!node) return;

          from = node.state.position;
        } else {
          const box = graph.commentBoxes.get(input.itemId);
          if (!box) return;

          from = box.position;
        }
      }

      return {
        graphId: input.graphId,
        itemId: input.itemId,
        itemVariant: input.itemVariant,
        from: { ...from },
        to: { ...input.position },
      };
    },
    perform(core, entry) {
      const graph = core.project.graphs.get(entry.graphId);
      if (!graph) return;

      if (entry.itemVariant === "node") {
        const node = graph.nodes.get(entry.itemId);
        if (!node) return;

        node.state.position = { ...entry.to };
      } else {
        const box = graph.commentBoxes.get(entry.itemId);
        if (!box) return;

        box.position = { ...entry.to };
      }
    },
    rewind(core, entry) {
      const graph = core.project.graphs.get(entry.graphId);
      if (!graph) return;

      if (entry.itemVariant === "node") {
        const node = graph.nodes.get(entry.itemId);
        if (!node) return;

        node.state.position = { ...entry.from };
      } else {
        const box = graph.commentBoxes.get(entry.itemId);
        if (!box) return;

        box.position = { ...entry.from };
      }
    },
  }),
};

type HistoryActions = typeof historyActions;
type HistoryActionKey = keyof HistoryActions;
type HistoryEntryData<T extends HistoryActionKey = HistoryActionKey> = {
  type: T;
  entry: (typeof historyActions)[T] extends HistoryAction<infer E, any, any>
    ? HistoryEntry<E>
    : never;
};

export function createActionsExecutor(core: Core) {
  const history: Array<HistoryEntryData> = [];

  let nextHistoryIndex = 0;

  function addHistoryEntry(entry: HistoryEntryData) {
    history.splice(nextHistoryIndex, history.length - nextHistoryIndex, entry);
    nextHistoryIndex++;
  }

  // const actions = {
  //   createNode: coreAction(
  //     (
  //       core,
  //       input: {
  //         graphId: number;
  //         schema: NodeSchema;
  //         position: XY;
  //       },
  //     ) => {
  //       const { graphId, schema, position } = input;
  //       const graph = core.project.graphs.get(graphId);
  //       if (!graph) return;

  //       const node = graph.createNode({ schema, position });
  //       return [{ id: node.id, graphId: graph.id }, node];
  //     },
  //   ),
  //   setNodeProperty: coreAction(
  //     (
  //       core,
  //       input: {
  //         graphId: number;
  //         nodeId: number;
  //         property: string;
  //         value: any;
  //       },
  //     ) => {
  //       const graph = core.project.graphs.get(input.graphId);
  //       if (!graph) return;

  //       const node = graph.nodes.get(input.nodeId);
  //       if (!node) return;

  //       node.setProperty(input.property, input.value);
  //     },
  //   ),
  //   createCommentBox: coreAction(
  //     (core, input: { graphId: number; position: XY }) => {
  //       const graph = core.project.graphs.get(input.graphId);
  //       if (!graph) return;

  //       return graph.createCommentBox({
  //         position: input.position,
  //         size: { x: 400, y: 200 },
  //         text: "Comment",
  //       });
  //     },
  //   ),
  //   setCommentBoxTint: coreAction(
  //     (core, input: { graphId: number; boxId: number; tint: string }) => {
  //       const graph = core.project.graphs.get(input.graphId);
  //       if (!graph) return;

  //       const box = graph.commentBoxes.get(input.boxId);
  //       if (!box) return;

  //       box.tint = input.tint;
  //     },
  //   ),
  //   setGraphItemPosition: coreAction(
  //     (
  //       core,
  //       input: {
  //         graphId: number;
  //         itemId: number;
  //         itemVariant: "node" | "commentBox";
  //         position: XY;
  //       },
  //     ) => {
  //       const { graphId, itemId, itemVariant, position } = input;

  //       const graph = core.project.graphs.get(graphId);
  //       if (!graph) return;

  //       if (itemVariant === "node") {
  //         const node = graph.nodes.get(itemId);
  //         if (!node) return;

  //         node.state.position = position;
  //       } else {
  //         const box = graph.commentBoxes.get(itemId);
  //         if (!box) return;

  //         box.position = position;
  //       }
  //     },
  //   ),
  //   deleteGraphItems: coreAction(
  //     (
  //       core,
  //       input: {
  //         graphId: number;
  //         items: Array<{ type: "node" | "commentBox"; id: number }>;
  //       },
  //     ) => {
  //       const { graphId, items } = input;
  //       const graph = core.project.graphs.get(graphId);
  //       if (!graph) return;

  //       const entry: DeleteGraphSelectionHistoryEntry = {
  //         type: "deleteGraphSelection",
  //         graphId,
  //         nodes: [],
  //         connections: [],
  //         commentBoxes: [],
  //       };

  //       for (const { type, id } of items) {
  //         if (type === "node") {
  //           const node = graph.nodes.get(id);
  //           if (!node) continue;

  //           for (const output of node.io.outputs) {
  //             const ref = makeIORef(output);

  //             const connections = graph.connections.get(ref);
  //             if (!connections) continue;

  //             for (const connectionRef of connections) {
  //               const outputData = splitIORef(ref);
  //               const inputData = splitIORef(connectionRef);

  //               entry.connections.push({
  //                 from: { node: outputData.nodeId, output: outputData.ioId },
  //                 to: { node: inputData.nodeId, input: inputData.ioId },
  //               });
  //             }
  //           }

  //           for (const input of node.io.inputs) {
  //             const ref = makeIORef(input);

  //             const connections = graph.connections.get(ref);
  //             if (!connections) continue;

  //             for (const connectionRef of connections) {
  //               const inputData = splitIORef(ref);
  //               const outputData = splitIORef(connectionRef);

  //               if (
  //                 items.some(
  //                   (i) => i.type === "node" && i.id === outputData.nodeId,
  //                 )
  //               )
  //                 continue;

  //               entry.connections.push({
  //                 from: { node: outputData.nodeId, output: outputData.ioId },
  //                 to: { node: inputData.nodeId, input: inputData.ioId },
  //               });
  //             }
  //           }

  //           entry.nodes.push(serializeNode(node));
  //         } else {
  //           const box = graph.commentBoxes.get(id);
  //           if (!box) continue;

  //           entry.commentBoxes.push(serializeCommentBox(box));
  //         }
  //       }

  //       for (const { type, id } of items) {
  //         if (type === "node") {
  //           const node = graph.nodes.get(id);
  //           if (!node) return;

  //           graph.deleteNode(node);
  //         } else {
  //           const box = graph.commentBoxes.get(id);
  //           if (!box) return;

  //           graph.deleteCommentbox(box);
  //         }
  //       }

  //       addHistoryEntry(entry);
  //     },
  //   ),
  //   connectIO: coreAction(
  //     (
  //       core,
  //       input: {
  //         graphId: number;
  //         out: {
  //           nodeId: number;
  //           pinId: string;
  //         };
  //         in: {
  //           nodeId: number;
  //           pinId: string;
  //         };
  //       },
  //     ) => {
  //       const { graphId, out, in: _in } = input;

  //       const graph = core.project.graphs.get(graphId);
  //       if (!graph) return;

  //       const outNode = graph.nodes.get(out.nodeId);
  //       const inNode = graph.nodes.get(_in.nodeId);
  //       if (!outNode || !inNode) return;

  //       const outPin = outNode.output(out.pinId);
  //       const inPin = inNode.input(_in.pinId);
  //       if (!outPin || !inPin) return;

  //       graph.connectPins(outPin, inPin);

  //       return;
  //     },
  //   ),
  //   createCustomStruct: coreAction((core) => {
  //     core.project.createCustomStruct();
  //   }),
  //   setCustomStructName: coreAction(
  //     (core, input: { structId: number; name: string }) => {
  //       const struct = core.project.customStructs.get(input.structId);
  //       if (!struct) return;

  //       struct.name = input.name;
  //     },
  //   ),
  //   deleteCustomStruct: coreAction((core, input: { structId: number }) => {
  //     core.project.customStructs.delete(input.structId);
  //   }),
  //   createCustomStructField: coreAction((core, input: { structId: number }) => {
  //     const struct = core.project.customStructs.get(input.structId);
  //     if (!struct) return;

  //     struct.createField();
  //   }),
  //   setCustomStructFieldName: coreAction(
  //     (core, input: { structId: number; fieldId: string; name: string }) => {
  //       const struct = core.project.customStructs.get(input.structId);
  //       if (!struct) return;

  //       const field = struct.fields[input.fieldId];
  //       if (!field) return;

  //       field.name = input.name;
  //     },
  //   ),
  //   setCustomStructFieldType: coreAction(
  //     (core, input: { structId: number; fieldId: string; type: t.Any }) => {
  //       const struct = core.project.customStructs.get(input.structId);
  //       if (!struct) return;

  //       struct.editFieldType(input.fieldId, input.type);
  //     },
  //   ),
  //   deleteCustomStructField: coreAction(
  //     (core, input: { structId: number; fieldId: string }) => {
  //       const struct = core.project.customStructs.get(input.structId);
  //       if (!struct) return;

  //       struct.removeField(input.fieldId);
  //     },
  //   ),
  //   createCustomEvent: coreAction((core) => {
  //     core.project.createCustomEvent();
  //   }),
  //   setCustomEventName: coreAction(
  //     (core, input: { eventId: number; name: string }) => {
  //       const event = core.project.customEvents.get(input.eventId);
  //       if (!event) return;

  //       event.name = input.name;
  //     },
  //   ),
  //   deleteCustomEvent: coreAction((core, input: { eventId: number }) => {
  //     const event = core.project.customEvents.get(input.eventId);
  //     if (!event) return;

  //     core.project.customEvents.delete(input.eventId);
  //   }),
  //   createCustomEventField: coreAction((core, input: { eventId: number }) => {
  //     const event = core.project.customEvents.get(input.eventId);
  //     if (!event) return;

  //     event.createField();
  //   }),
  //   deleteCustomEventField: coreAction(
  //     (core, input: { eventId: number; fieldId: number }) => {
  //       const event = core.project.customEvents.get(input.eventId);
  //       if (!event) return;

  //       event.deleteField(input.fieldId);
  //     },
  //   ),
  //   setCustomEventFieldName: coreAction(
  //     (core, input: { eventId: number; fieldId: number; name: string }) => {
  //       const event = core.project.customEvents.get(input.eventId);
  //       if (!event) return;

  //       event.editFieldName(input.fieldId, input.name);
  //     },
  //   ),
  //   setCustomEventFieldType: coreAction(
  //     (
  //       core,
  //       input: { eventId: number; fieldId: number; type: PrimitiveType },
  //     ) => {
  //       const event = core.project.customEvents.get(input.eventId);
  //       if (!event) return;

  //       event.editFieldType(input.fieldId, input.type);
  //     },
  //   ),
  //   createVariable: coreAction(
  //     (
  //       core,
  //       input: { location: "project" } | { location: "graph"; graphId: number },
  //     ) => {
  //       if (input.location === "project") {
  //         core.project.createVariable({
  //           name: `Variable ${core.project.variables.length + 1}`,
  //           value: "",
  //           type: t.string(),
  //         });
  //       } else {
  //         const graph = core.project.graphs.get(input.graphId);
  //         if (!graph) return;

  //         graph.createVariable({
  //           name: `Variable ${graph.variables.length + 1}`,
  //           value: "",
  //           type: t.string(),
  //         });
  //       }
  //     },
  //   ),
  //   setVariableName: coreAction(
  //     (
  //       core,
  //       input: (
  //         | { location: "project" }
  //         | { location: "graph"; graphId: number }
  //       ) & { variableId: number; name: string },
  //     ) => {
  //       let variable: Variable;

  //       if (input.location === "project") {
  //         const projectVariable = core.project.variables.find(
  //           (v) => v.id === input.variableId,
  //         );
  //         if (!projectVariable) return;
  //         variable = projectVariable;
  //       } else {
  //         const graph = core.project.graphs.get(input.graphId);
  //         if (!graph) return;

  //         const graphVariable = graph.variables.find(
  //           (v) => v.id === input.variableId,
  //         );
  //         if (!graphVariable) return;
  //         variable = graphVariable;
  //       }

  //       variable.name = input.name;
  //     },
  //   ),
  //   setVariableValue: coreAction(
  //     (
  //       core,
  //       input: (
  //         | { location: "project" }
  //         | { location: "graph"; graphId: number }
  //       ) & { variableId: number; value: any },
  //     ) => {
  //       if (input.location === "project") {
  //         core.project.setVariableValue(input.variableId, input.value);
  //       } else {
  //       }
  //     },
  //   ),
  //   deleteVariable: coreAction(
  //     (
  //       core,
  //       input: (
  //         | { location: "project" }
  //         | { location: "graph"; graphId: number }
  //       ) & { variableId: number },
  //     ) => {
  //       if (input.location === "project") {
  //         core.project.removeVariable(input.variableId);
  //       } else {
  //         const graph = core.project.graphs.get(input.graphId);
  //         if (!graph) return;

  //         graph.removeVariable(input.variableId);
  //       }
  //     },
  //   ),
  //   setResourceTypeDefault: coreAction(
  //     (core, input: { defaultId: number; type: ResourceType<any, any> }) => {
  //       const resource = core.project.resources.get(input.type);
  //       if (!resource) return;

  //       resource.default = input.defaultId;
  //     },
  //   ),
  //   createResource: coreAction(
  //     (core, input: { type: ResourceType<any, any> }) => {
  //       core.project.createResource({ type: input.type, name: "New Resource" });
  //     },
  //   ),
  //   setResourceName: coreAction(
  //     (
  //       core,
  //       input: {
  //         type: ResourceType<any, any>;
  //         resourceId: number;
  //         name: string;
  //       },
  //     ) => {
  //       const resource = core.project.resources.get(input.type);
  //       if (!resource) return;

  //       const item = resource.items.find((i) => i.id === input.resourceId);
  //       if (!item) return;

  //       item.name = input.name;
  //     },
  //   ),
  //   setResourceValue: coreAction(
  //     (
  //       core,
  //       input: { type: ResourceType<any, any>; resourceId: number } & (
  //         | { sourceId: string }
  //         | { value: string }
  //       ),
  //     ) => {
  //       const resource = core.project.resources.get(input.type);
  //       if (!resource) return;

  //       const item = resource.items.find((i) => i.id === input.resourceId);
  //       if (!item) return;

  //       if ("sourceId" in input && "sourceId" in item)
  //         item.sourceId = input.sourceId;
  //       else if ("value" in input && "value" in item) item.value = input.value;
  //     },
  //   ),
  //   deleteResource: coreAction(
  //     (core, input: { type: ResourceType<any, any>; resourceId: number }) => {
  //       const resource = core.project.resources.get(input.type);
  //       if (!resource) return;

  //       const itemIndex = resource.items.findIndex(
  //         (i) => i.id === input.resourceId,
  //       );
  //       if (itemIndex === -1) return;

  //       resource.items.splice(itemIndex, 1);

  //       if (resource.items.length) core.project.resources.delete(input.type);
  //     },
  //   ),
  // };

  function undo() {
    nextHistoryIndex = Math.max(0, nextHistoryIndex - 1);
    const entry = history[nextHistoryIndex];
    if (!entry) return;

    historyActions[entry.type].rewind(core, entry.entry as any);
  }

  function redo() {
    nextHistoryIndex = Math.min(history.length, nextHistoryIndex + 1);
    const entry = history[nextHistoryIndex];
    if (!entry) return;

    historyActions[entry.type].perform(core, entry.entry as any);
  }

  function execute<T extends HistoryActionKey>(
    type: T,
    ...args: HistoryActions[T] extends HistoryAction<any, any, infer I>
      ? I extends void
        ? []
        : [I, void | { ephemeral: boolean }]
      : []
  ): HistoryActions[T] extends HistoryAction<any, infer P, any> ? P : never {
    const action = historyActions[type];

    const entry = action.prepare(core, args[0] as any);
    if (!entry) return undefined as any;

    if (!args[1]?.ephemeral) addHistoryEntry({ type, entry });

    return action.perform(core, entry as any) as any;
  }

  return { undo, redo, execute };
}
