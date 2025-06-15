import { Effect, Option } from "effect";
import { project } from "../../project";
import { GraphId } from "./data";

export class Graphs extends Effect.Service<Graphs>()("Graphs", {
  sync: () => {
    return {
      get: Effect.fn(function* (id: GraphId) {
        return Option.fromNullable(project.graphs.get(id));
      }),
    };
  },
}) {}
