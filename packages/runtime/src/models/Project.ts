import { ReactiveMap } from "@solid-primitives/map";
import { createMutable } from "solid-js/store";
import { z } from "zod";

import { Core } from "./Core";
import { Graph } from "./Graph";
import { CustomEvent } from "./CustomEvent";
import { SerializedProject } from "./serialized";
import { ResourceType } from "./Package";

type NonEmptyArray<T> = [T, ...T[]];

export interface ProjectArgs {
  core: Core;
}

type ResourceEntry = {
  items: Array<{ id: number; name: string; sourceId?: string }>;
  default?: number;
};

export class Project {
  core: Core;
  graphs = new ReactiveMap<number, Graph>();
  customEvents = new ReactiveMap<number, CustomEvent>();
  resources = new ReactiveMap<ResourceType<any, any>, ResourceEntry>();

  private disableSave = false;

  private graphIdCounter = 0;
  private customEventIdCounter = 0;
  private counter = 0;

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

  createResource(args: { type: ResourceType<any, any>; name: string }) {
    const id = this.counter++;
    const item = {
      id,
      name: args.name,
    };

    if (!this.resources.has(args.type)) {
      const entry: ResourceEntry = createMutable({
        items: [{ ...item, source: args.type.sources()[0]?.id }],
      });
      this.resources.set(args.type, entry);
      entry.default = id;
    } else {
      const entry = this.resources.get(args.type)!;
      entry.items.push(item);
    }
  }

  serialize(): z.infer<typeof SerializedProject> {
    return {
      graphIdCounter: this.graphIdCounter,
      graphs: [...this.graphs.values()].map((g) => g.serialize()),
      customEventIdCounter: this.customEventIdCounter,
      customEvents: [...this.customEvents.values()].map((e) => e.serialize()),
      counter: this.counter,
      resources: [...this.resources].map(([type, entry]) => ({
        type: {
          pkg: type.package.name,
          name: type.name,
        },
        entry,
      })),
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

    project.counter = data.counter;

    project.resources = new ReactiveMap(
      data.resources
        .map(({ type, entry }) => {
          let resource: ResourceType<any, any> | undefined;

          for (const r of core.packages.find((p) => p.name === type.pkg)
            ?.resources ?? []) {
            if (r.name === type.name) {
              resource = r;
              break;
            }
          }
          if (!resource) return;

          return [resource, createMutable(entry)] satisfies [any, any];
        })
        .filter(Boolean)
    );

    project.disableSave = false;

    return project;
  }

  save() {
    if (!this.disableSave)
      localStorage.setItem("project", JSON.stringify(this.serialize()));
  }
}
