import { Effect } from "effect";
import { project } from "../../project";

export class Graphs extends Effect.Service<Graphs>()("Graphs", {
  sync: () => {
    return {
      get: Effect.fn(function* () {
        return project.graphs[0];
      }),
    };
  },
}) {}
