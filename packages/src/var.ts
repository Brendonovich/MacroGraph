import {
  Package,
  Core,
  PropertyDef,
  Graph,
  Variable,
  Node,
} from "@macrograph/core";
import { createEffect, onCleanup } from "solid-js";

export function pkg(core: Core) {
  const pkg = new Package({
    name: "Variables",
  });

  let variableMap = new Map<string, number>();
  let nodeMap = new Map<string, number>();

  const variableProperty = {
    name: "Variable",
    source: ({ node }) =>
      node.graph.variables.map((v) => ({
        id: v.id,
        display: v.name,
      })),
  } satisfies PropertyDef;

  pkg.createNonEventSchema({
    name: "Get Graph Variable",
    variant: "Pure",
    properties: {
      variable: variableProperty,
    },
    generateIO({ io, ctx, properties }) {
      const variableId = ctx.getProperty(properties.variable);
      const variable = ctx.graph.variables.find((v) => v.id === variableId);
      if (!variable) return;

      return io.dataOutput({
        id: "",
        name: variable.name,
        type: variable.type,
      });
    },
    run({ ctx, io, properties, graph }) {
      if (!io) return;

      const variableId = ctx.getProperty(properties.variable);
      const variable = graph.variables.find(
        (v) => v.id === Number(variableId)
      )!;

      ctx.setOutput(io, variable.value);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Graph Variable",
    variant: "Exec",
    properties: {
      variable: variableProperty,
    },
    generateIO({ io, ctx, properties }) {
      const variableId = ctx.getProperty(properties.variable);
      const variable = ctx.graph.variables.find((v) => v.id === variableId);
      if (!variable) return;

      return io.dataInput({
        id: "",
        name: variable.name,
        type: variable.type,
      });
    },
    run({ ctx, io, properties, graph }) {
      if (!io) return;

      const variableId = ctx.getProperty(properties.variable);
      const variable = graph.variables.find((v) => v.id === variableId);
      if (!variable) return;

      variable.value = ctx.getInput(io);
    },
  });

  function emitting(graph: number, node: number, variable: Variable) {
    let varMapCode = `${graph}:${variable}`;
    let NodeMapCode = `${graph}:${node}`;
    //first setting the variable
    if (nodeMap.get(NodeMapCode) === undefined) {
      nodeMap.set(NodeMapCode, variable.id);
      if (
        nodeMap.get(`${graph}:${variableMap.get(varMapCode)}`) !== variable.id
      ) {
        variableMap.set(varMapCode, node);
      }
      return;
    }

    //if variable is changing on drop down
    if (nodeMap.get(NodeMapCode) !== variable.id) {
      nodeMap.set(NodeMapCode, variable.id);

      //check if the variable listener exists.
      if (variableMap.get(varMapCode) === undefined) {
        variableMap.set(varMapCode, node);
      }
      //check if node for variable is still listening to variable or available for new node id.
      if (
        nodeMap.get(`${graph}:${variableMap.get(varMapCode)}`) !== variable.id
      ) {
        variableMap.set(varMapCode, node);
      }
      return;
    }
    //if variable isnt changing
    if (nodeMap.get(NodeMapCode) === variable.id) {
      if (
        nodeMap.get(`${graph}:${variableMap.get(varMapCode)}`) !== variable.id
      ) {
        variableMap.set(varMapCode, node);
      }
      //check if current node id is the listening id
      if (variableMap.get(varMapCode) === node) {
        console.log("this");
        pkg.emitEvent({
          name: "graphVarChanged",
          data: { value: variable.value, id: variable.id },
        });
      }
    }
  }

  pkg.createEventSchema({
    event: "graphVarChanged",
    name: "Graph Variable Changed",
    properties: {
      variable: variableProperty,
    },
    generateIO({ io, ctx, properties }) {
      const variableId = ctx.getProperty(properties.variable);
      const variable = ctx.graph.variables.find((v) => v.id === variableId);
      const nodeId = io.node.id;
      const graphId = ctx.graph.id;
      if (!variable) return;
      if (variableId === undefined) return;

      createEffect(() => {
        emitting(graphId, nodeId, variable);
        console.log("running");
        console.log(variable.value);
      });

      return {
        exec: io.execOutput({
          id: "exec",
        }),
        output: io.dataOutput({
          id: "output",
          name: variable.name,
          type: variable.type,
        }),
      };
    },
    run({ ctx, data, io, properties, graph }) {
      if (!io) return;

      const variableId = ctx.getProperty(properties.variable);
      const variable = graph.variables.find((v) => v.id === variableId);
      if (!variable) return;

      if (data.id !== variable.id) return;

      ctx.setOutput(io.output, data.value);
      ctx.exec(io.exec);
    },
  });

  return pkg;
}
