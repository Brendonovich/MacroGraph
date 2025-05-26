import { Graph, GraphId } from "./domain/Graph/data";
import { NodeId } from "./domain/Node/data";

export const project = {
  name: "",
  graphs: {
    "0": {
      id: GraphId.make(0),
      name: "New Graph",
      nodes: [
        {
          id: NodeId.make(0),
          name: "New Node",
          position: { x: 0, y: 0 },
          variant: "exec",
          inputs: [],
          outputs: [],
        },
      ],
    } satisfies (typeof Graph)["Type"],
  },
};
