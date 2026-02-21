import { FileSystem } from "@effect/platform";
import { Context, Effect, Layer, type Option, Schema as S } from "effect";
import { Project } from "@macrograph/project-domain";

export class ServerProjectPersistence extends Context.Tag(
	"ServerProjectPersistence",
)<
	ServerProjectPersistence,
	{
		writeProject: (
			project: Project.Project,
		) => Effect.Effect<void, never, never>;
		readProject: Effect.Effect<Option.Option<Project.Project>, never, never>;
	}
>() {
	static layerJsonFile = (path: string) =>
		Layer.effect(
			ServerProjectPersistence,
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem;

				const serialize = S.encode(Project.Project);
				const deserialize = S.decode(S.parseJson(Project.Project));

				return {
					writeProject: (project: Project.Project) =>
						Effect.gen(function* () {
							const json = yield* serialize(project);
							yield* fs.writeFileString(path, JSON.stringify(json));
						}).pipe(Effect.orDie),
					readProject: Effect.gen(function* () {
						const jsonString = yield* fs.readFileString(path);
						return yield* deserialize(jsonString);
					}).pipe(Effect.option),
				};
			}),
		);
}
