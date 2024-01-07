import { ReactiveMap } from "@solid-primitives/map";
import { createMutable } from "solid-js/store";
import { z } from "zod";

import { Core } from "./Core";
import { Graph, SerializedGraph } from "./Graph";
import { CustomEvent, SerializedEvent } from "./CustomEvent";

export interface ProjectArgs {
  core: Core;
}

export const SerializedProject = z.object({
  graphs: z.array(SerializedGraph),
  graphIdCounter: z.number().int(),
  customEvents: z.array(SerializedEvent).default([]),
  customEventIdCounter: z.number().int().default(0),
});

export class Project {
  core: Core;
  graphs = new ReactiveMap<number, Graph>();
  customEvents = new ReactiveMap<number, CustomEvent>();

  private disableSave = false;

  private graphIdCounter = 0;
  private customEventIdCounter = 0;

  constructor(args: ProjectArgs) {
    this.core = args.core;

    return createMutable(this);
  }

  generateGraphId() {
    return this.graphIdCounter++;
  }

  generateCustomEventId() {
    return this.customEventIdCounter++;
  }

  createGraph(args?: { name?: string }) {
    const id = this.generateGraphId();

    const graph = new Graph({
      name: `Graph ${id}`,
      id,
      project: this,
      ...args,
    });

    this.graphs.set(id, graph);

    return graph;
  }

  createCustomEvent() {
    const id = this.generateCustomEventId();

    const event = new CustomEvent({
      name: `Event ${id}`,
      id,
      project: this,
    });

    this.customEvents.set(id, event);

    this.core.project.save();

    return event;
  }

  serialize(): z.infer<typeof SerializedProject> {
    return {
      graphIdCounter: this.graphIdCounter,
      graphs: [...this.graphs.values()].map((g) => g.serialize()),
      customEventIdCounter: this.customEventIdCounter,
      customEvents: [...this.customEvents.values()].map((e) => e.serialize()),
    };
  }

  static async deserialize(
    core: Core,
    data: z.infer<typeof SerializedProject>
  ) {
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

    project.customEventIdCounter = data.customEventIdCounter;

    project.customEvents = new ReactiveMap(
      data.customEvents
        .map((SerializedEvent) => {
          const event = CustomEvent.deserialize(project, SerializedEvent);

          if (event === null) return null;

          return [event.id, event] as [number, CustomEvent];
        })
        .filter(Boolean) as [number, CustomEvent][]
    );

    project.disableSave = false;

    return project;
  }

  save() {
    if (!this.disableSave)
      localStorage.setItem("project", JSON.stringify(this.serialize()));
  }
}
