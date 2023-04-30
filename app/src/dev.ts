import { Core } from "@macrograph/core";

export function addDevGraph(core: Core) {
  core.packages.forEach((p) => {
    const graph = core.createGraph({ name: p.name });

    p.schemas.forEach((schema, xi) => {
      graph.createNode({
        schema,
        position: {
          x: 200 * (xi % 5),
          y: 200 * Math.floor(xi / 5),
        },
      });
    });
  });

  const graph = core.createGraph({ name: "All Schemas" });

  core.packages
    .flatMap((p) => p.schemas)
    .forEach((schema, xi) => {
      graph.createNode({
        schema,
        position: {
          x: 200 * (xi % 5),
          y: 200 * Math.floor(xi / 5),
        },
      });
    });
}
