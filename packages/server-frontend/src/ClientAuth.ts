import { Effect, Option, Stream, SubscriptionRef } from "effect";

export class ClientAuth extends Effect.Service<ClientAuth>()("ClientAuth", {
	effect: Effect.gen(function* () {
		const jwt = yield* SubscriptionRef.make(
			Option.fromNullable(localStorage.getItem("mgInstanceAuthJwt")),
		);

		yield* jwt.changes.pipe(
			Stream.runForEach((value) =>
				Effect.sync(() => {
					console.log({ value });
					if (Option.isSome(value))
						localStorage.setItem("mgInstanceAuthJwt", value.value);
					else localStorage.removeItem("mgInstanceAuthJwt");
				}),
			),
			Effect.forkScoped,
		);

		return { jwt };
	}),
}) {}
