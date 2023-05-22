import { ReactiveMap } from "@solid-primitives/map";
import { createMutable } from "solid-js/store";
import { z } from "zod";
import { Core } from "./Core";
import { Graph, SerializedGraph } from "./Graph";

export interface ProjectArgs {
  core: Core;
}

export const SerializedProject = z.object({
  graphs: z.array(SerializedGraph),
  graphIdCounter: z.number().int(),
});

export class Project {
  core: Core;
  graphs = new ReactiveMap<number, Graph>();

  private disableSave = false;

  private graphIdCounter = 0;

  constructor(args: ProjectArgs) {
    this.core = args.core;

    return createMutable(this);
  }

  createGraph(args?: { name?: string }) {
    const id = this.graphIdCounter++;

    const graph = new Graph({
      name: `Graph ${id}`,
      id,
      project: this,
      ...args,
    });

    this.graphs.set(id, graph);

    return graph;
  }

  serialize(): z.infer<typeof SerializedProject> {
    return {
      graphIdCounter: this.graphIdCounter,
      graphs: [...this.graphs.values()].map((g) => g.serialize()),
    };
  }

  static deserialize(core: Core, data: z.infer<typeof SerializedProject>) {
    const project = new Project({
      core,
    });

    project.disableSave = true;

    project.graphIdCounter = data.graphIdCounter;

    project.graphs = new ReactiveMap(
      data.graphs
        .map((serializedGraph) => {
          const graph = Graph.deserialize(project, serializedGraph);

          if (graph === null) return null;

          return [graph.id, graph] as [number, Graph];
        })
        .filter(Boolean) as [number, Graph][]
    );

    project.disableSave = false;

    return project;
  }

  save() {
    if (!this.disableSave)
      localStorage.setItem("project", JSON.stringify(this.serialize()));
  }
}
