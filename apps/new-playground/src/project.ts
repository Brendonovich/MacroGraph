import { Graph, GraphId } from "./domain/Graph/data";
import { NodeId } from "./domain/Node/data";
import { DeepWriteable } from "./types";

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
          inputs: [],
          outputs: [],
          schema: { pkgId: "bruh", schemaId: "lmao" },
        },
      ],
    } as DeepWriteable<(typeof Graph)["Type"]>,
  },
};
