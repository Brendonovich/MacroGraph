import { FileSystem } from "@effect/platform";
import {
	Context,
	Data,
	Effect,
	Layer,
	Option,
	Schema,
	Stream,
	SubscriptionRef,
} from "effect";
import { RawJWT } from "@macrograph/web-domain";

export namespace ServerConfig {
	export class ServerConfig extends Effect.Service<ServerConfig>()(
		"@macrograph/server-backend/ServerConfig",
		{
			scoped: Effect.gen(function* () {
				const persistence =
					yield* ServerConfigPersistence.ServerConfigPersistence;

				const config = yield* persistence.get.pipe(
					Effect.map(Option.getOrElse(Default)),
					Effect.flatMap(SubscriptionRef.make),
				);

				yield* config.changes.pipe(
					Stream.runForEach((config) => persistence.update(config)),
					Effect.forkScoped,
				);

				return {
					get: config.get,
					update: Effect.fn(function* (cb: (value: Shape) => Shape) {
						const value = { ...(yield* config.get) } as const;
						yield* SubscriptionRef.set(config, cb(value));
					}),
				};
			}),
		},
	) {}

	export const Shape = Schema.Struct({
		serverRegistrationToken: Schema.OptionFromNullOr(RawJWT),
	});
	export type Shape = Schema.Schema.Type<typeof Shape>;

	const Default = (): Shape => ({
		serverRegistrationToken: Option.none(),
	});
}

export namespace ServerConfigPersistence {
	export class ServerConfigPersistence extends Context.Tag(
		"@macrograph/server-backend/ServerConfigPersistence",
	)<
		ServerConfigPersistence,
		{
			get: Effect.Effect<Option.Option<ServerConfig.Shape>, PersistenceError>;
			update: (v: ServerConfig.Shape) => Effect.Effect<void, PersistenceError>;
		}
	>() {}

	export class PersistenceError extends Data.TaggedError("PersistenceError")<{
		cause: unknown;
	}> {}

	export const jsonFile = (path: string) =>
		Layer.effect(
			ServerConfigPersistence,
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem;

				const get = fs.readFileString(path).pipe(
					Effect.andThen(
						Schema.decodeUnknown(Schema.parseJson(ServerConfig.Shape)),
					),
					Effect.map(Option.some),
					Effect.catchTag("SystemError", (e) =>
						e.reason === "NotFound"
							? Effect.succeed(Option.none<ServerConfig.Shape>())
							: Effect.fail(e),
					),
					Effect.catchAll((e) => new PersistenceError({ cause: e })),
				);

				return {
					get,
					update: (value) => {
						return fs
							.writeFileString(
								path,
								JSON.stringify(Schema.encodeSync(ServerConfig.Shape)(value)),
							)
							.pipe(Effect.catchAll((e) => new PersistenceError({ cause: e })));
					},
				};
			}),
		);
}
