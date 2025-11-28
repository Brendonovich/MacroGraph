import type { Graph } from "@macrograph/project-domain";
import { Effect, Option } from "effect";
import { ProjectData } from "./Project";

export class Graphs extends Effect.Service<Graphs>()("Graphs", {
	effect: Effect.gen(function* () {
		const project = yield* ProjectData;

		return {
			get: (id: Graph.Id) =>
				Effect.succeed(Option.fromNullable(project.graphs.get(id))),
		};
	}),
}) {}
