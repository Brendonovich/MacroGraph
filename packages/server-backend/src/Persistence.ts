import { FileSystem } from "@effect/platform";
import { Effect } from "effect";

export class Persistence extends Effect.Service<Persistence>()("Persistence", {
	effect: Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const PATH = "macrograph-instance.json";

		let data: Record<string, any> = {};

		if (yield* fs.exists(PATH)) {
			data = JSON.parse(yield* fs.readFileString(PATH));
		}

		return {
			getKey: <T>(key: string) => data[key] as T,
			setKey: Effect.fn(function* (key: string, value: any) {
				data[key] = value;
				yield* fs.writeFileString(PATH, JSON.stringify(data));
			}),
		};
	}),
}) {}
