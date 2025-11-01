import { Graph } from "@macrograph/project-domain";
import { Effect, Option } from "effect";
import { project } from "./Project/data";

export class Graphs extends Effect.Service<Graphs>()("Graphs", {
	sync: () => {
		return {
			get: (id: Graph.Id) =>
				Effect.succeed(Option.fromNullable(project.graphs.get(id))),
		};
	},
}) {}
