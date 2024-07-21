import {
  Core,
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  Graph,
  IOBuilder,
  Node,
  type Pin,
  Project,
  type Schema,
} from "@macrograph/runtime";
import { type BaseType, t } from "@macrograph/typesystem";

export type RenderedType = "string" | "int" | "float" | "bool" | "wildcard";

export type RenderedIO = { id: string; name?: string } & (
  | { variant: "exec" }
  | { variant: "data"; type: RenderedType }
);

export interface RenderedSchema {
  name: string;
  type: string;
  inputs: Array<RenderedIO>;
  outputs: Array<RenderedIO>;
}

export function renderSchema(
  schema: Schema<any, any, any>
): RenderedSchema | undefined {
  const graph = new Graph({
    id: 0,
    name: "",
    project: new Project({ core: new Core() }),
  });

  const node = new Node({
    id: 0,
    graph,
    schema,
    position: { x: 0, y: 0 },
  });

  const io = new IOBuilder(node);

  try {
    schema.createIO({
      io,
      properties: schema.properties ?? {},
      ctx: {
        getProperty: (p) => node.getProperty(p) as any,
        graph,
      },
    });
  } catch {}

  return {
    name: schema.name,
    type: schema.type,
    inputs: io.inputs.map(renderIO).filter((d) => d !== undefined),
    outputs: io.outputs.map(renderIO).filter((d) => d !== undefined),
  };
}

export function renderIO(io: Pin): RenderedIO | undefined {
  if (io instanceof ExecInput || io instanceof ExecOutput) {
    return {
      id: io.id,
      name: io.name,
      variant: "exec",
    };
  }

  if (io instanceof DataInput || io instanceof DataOutput) {
    const type = renderType(io.type);
    if (!type) return;

    return {
      id: io.id,
      name: io.name,
      variant: "data",
      type,
    };
  }
}

export function renderType(type: BaseType): RenderedType | undefined {
  if (type instanceof t.String) return "string";
  if (type instanceof t.Int) return "int";
  if (type instanceof t.Float) return "float";
  if (type instanceof t.Bool) return "bool";
  if (type instanceof t.Wildcard) return "wildcard";
}
