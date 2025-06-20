import { GraphId } from "./domain/Graph/data";
import { NodeId, NodeIO } from "./domain/Node/data";

export type NodeConnections = {
  in?: Map<string, Array<[NodeId, string]>>;
  out?: Map<string, Array<[NodeId, string]>>;
};

export type Project = {
  name: string;
  graphs: Map<
    GraphId,
    {
      id: GraphId;
      name: string;
      nodes: Array<
        {
          id: NodeId;
          name?: string;
          position: { x: number; y: number };
          schema: { pkgId: string; schemaId: string };
        } & DeepWriteable<NodeIO>
      >;
      connections?: Map<NodeId, NodeConnections>;
    }
  >;
};

export const project: Project = {
  name: "",
  graphs: new Map([
    [
      GraphId.make(0),
      {
        id: GraphId.make(0),
        name: "New Graph",
        nodes: [],
      },
    ],
  ]),
};
