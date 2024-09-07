import * as runtime from "@macrograph/runtime";
import {
  type EnumVariant,
  type EnumVariantFields,
  type Field,
  serializeValue,
} from "@macrograph/typesystem";
import type * as v from "valibot";

import type * as serde from "./serde";

export function serializeProject(
  project: runtime.Project,
): v.InferInput<typeof serde.Project> {
  return {
    name: project.name,
    graphIdCounter: project.graphIdCounter,
    graphs: project.graphOrder
      .map((id) => {
        const graph = project.graphs.get(id);
        if (!graph) return;

        return serializeGraph(graph);
      })
      .filter(Boolean),
    customEventIdCounter: project.customEventIdCounter,
    customEvents: [...project.customEvents.values()].map(serializeCustomEvent),
    customTypeIdCounter: project.customTypeIdCounter,
    customStructs: [...project.customStructs.values()].map(
      serializeCustomStruct,
    ),
    customEnums: [...project.customEnums.values()].map(serializeCustomEnum),
    counter: project.idCounter,
    resources: [...project.resources].map(([type, entry]) =>
      serializeResources(type, entry),
    ),
    variables: project.variables.map(serializeVariable),
  };
}

export function serializeResources(
  type: runtime.ResourceType<any, any>,
  entry: runtime.ResourceTypeEntry,
): v.InferInput<typeof serde.Resource> {
  return {
    type: {
      pkg: type.package.name,
      name: type.name,
    },
    entry,
  };
}

export function serializeGraph(
  graph: runtime.Graph,
): v.InferInput<typeof serde.Graph> {
  return {
    id: graph.id,
    name: graph.name,
    nodeIdCounter: graph.idCounter,
    nodes: Object.fromEntries(
      [...graph.nodes.entries()].map(([id, node]) => [id, serializeNode(node)]),
    ),
    commentBoxes: [...graph.commentBoxes.values()].map(serializeCommentBox),
    variables: graph.variables.map(serializeVariable),
    connections: (() => {
      const serialized: Array<v.InferOutput<typeof serde.Connection>> = [];

      for (const [refStr, conns] of graph.connections) {
        const ref = runtime.splitIORef(refStr);

        if (ref.type === "i") continue;

        for (const conn of conns) {
          const connRef = runtime.splitIORef(conn);

          serialized.push({
            from: {
              node: ref.nodeId,
              output: ref.ioId,
            },
            to: {
              node: connRef.nodeId,
              input: connRef.ioId,
            },
          });
        }
      }

      return serialized;
    })(),
  };
}

export function serializeCustomEvent(
  e: runtime.CustomEvent,
): v.InferInput<typeof serde.CustomEvent> {
  return {
    id: e.id,
    name: e.name,
    fields: e.fields.map(serializeCustomEventField),
    fieldIdCounter: e.fieldIdCounter,
  };
}

export function serializeCustomEventField(
  field: Field,
): v.InferInput<typeof serde.Field> {
  return {
    ...field,
    type: field.type.serialize(),
  };
}

export function serializeCustomStruct(
  s: runtime.CustomStruct,
): v.InferInput<typeof serde.CustomStruct> {
  return {
    id: s.id,
    name: s.name,
    fields: Object.values(s.fields).map(serializeCustomStructField),
    fieldIdCounter: s.fieldIdCounter,
  };
}

export function serializeCustomStructField(
  field: Field,
): v.InferInput<typeof serde.CustomStructField> {
  return {
    name: field.name,
    id: field.id,
    type: field.type.serialize(),
  };
}

export function serializeCustomEnum(
  e: runtime.CustomEnum,
): v.InferInput<typeof serde.CustomEnum> {
  return {
    id: e.id,
    name: e.name,
    variants: Object.values(e.variants).map(serializeCustomEnumVariant),
    variantIdCounter: e.variantIdCounter,
  };
}

export function serializeCustomEnumVariant(
  v: EnumVariant<string, EnumVariantFields | null>,
): v.InferInput<typeof serde.CustomEnumVariant> {
  return {
    id: v.id,
    display: v.name,
    fields: Object.values(v.fields ?? {}).map(serializeField),
    fieldIdCounter: v.fieldIdCounter,
  };
}

export function serializeField(field: Field): v.InferInput<typeof serde.Field> {
  return {
    id: field.id,
    name: field.name,
    type: field.type.serialize(),
  };
}

export function serializeVariable(
  v: runtime.Variable,
): v.InferInput<typeof serde.Variable> {
  return {
    id: v.id,
    name: v.name,
    value: serializeValue(v.value, v.type),
    type: v.type.serialize(),
  };
}

export function serializeNode(
  node: runtime.Node,
): v.InferInput<typeof serde.Node> {
  return {
    id: node.id,
    name: node.state.name,
    position: [node.state.position.x, node.state.position.y],
    schema: {
      package: node.schema.package.name,
      id: node.schema.name,
    },
    defaultValues: node.state.inputs.reduce(
      (acc, i) => {
        if (!(i instanceof runtime.DataInput)) return acc;

        acc[i.id] = i.defaultValue;
        return acc;
      },
      {} as Record<string, any>,
    ),
    properties: Object.entries(node.state.properties).reduce(
      (acc, [k, v]) => {
        acc[k] = v === runtime.DEFAULT ? { default: true } : v;

        return acc;
      },
      {} as Record<string, any>,
    ),
    foldPins: node.state.foldPins,
  };
}

export function serializeCommentBox(
  box: runtime.CommentBox,
): v.InferInput<typeof serde.CommentBox> {
  return {
    id: box.id,
    position: [box.position.x, box.position.y],
    size: box.size,
    text: box.text,
    tint: box.tint,
  };
}
