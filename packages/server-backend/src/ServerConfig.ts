import { FileSystem } from "@effect/platform";
import { Effect, Schema, Stream, SubscriptionRef } from "effect";

export namespace ServerConfig {
	export class ServerConfig extends Effect.Service<ServerConfig>()(
		"@mg/ServerConfig",
		{
			effect: Effect.gen(function* () {
				const path = "./server-config.json";
				const fs = yield* FileSystem.FileSystem;
				let config = yield* fs.readFileString(path).pipe(
					Effect.andThen((config) => Effect.try(() => JSON.parse(config))),
					Effect.andThen(decode),
					Effect.flatMap(SubscriptionRef.make),
				);

				yield* config.changes.pipe(
					Stream.runForEach((config) =>
						fs.writeFileString(path, JSON.stringify(encode(config))),
					),
					Effect.fork,
				);

				return {
					get: Effect.sync(() => config),
					update: Effect.fn(function* (
						cb: (value: DeepWriteable<Shape>) => void,
					) {
						const value = { ...(yield* config.get) } as const;
						cb(value);
						yield* SubscriptionRef.set(config, value);
					}),
				};
			}),
		},
	) {}

	export const Shape = Schema.Struct({
		serverRegistrationToken: Schema.OptionFromNullOr(Schema.String),
	});
	export type Shape = Schema.Schema.Type<typeof Shape>;

	const decode = Schema.decode(Shape);
	const encode = Schema.encode(Shape);
}
