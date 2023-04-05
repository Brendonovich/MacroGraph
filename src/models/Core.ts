import { createMutable } from "solid-js/store";
import { ReactiveMap } from "@solid-primitives/map";

import { Graph } from "./Graph";
import { Package, PackageArgs } from "./Package";

export class Core {
  graphs = new ReactiveMap<number, Graph>();
  packages = [] as Package[];

  private graphIdCounter = 0;

  constructor() {
    return createMutable(this);
  }

  createGraph() {
    const id = this.graphIdCounter++;

    const graph = new Graph({ name: `Graph ${id}`, id, core: this });

    this.graphs.set(id, graph);

    return graph;
  }

  createPackage(args: Omit<PackageArgs, "core">) {
    const pkg = new Package({ ...args, core: this });

    this.packages.push(pkg);

    return pkg;
  }

  schema(pkg: string, name: string) {
    return this.packages.find((p) => p.name === pkg)?.schema(name);
  }
}

export const core = new Core();
