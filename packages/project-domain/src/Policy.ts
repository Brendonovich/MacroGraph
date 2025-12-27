import { Effect, Schema } from "effect";

export type Policy<E = never, R = never> = Effect.Effect<
	void,
	PolicyDeniedError | E,
	R
>;

export const policy = <E, R>(
	predicate: () => Effect.Effect<boolean, E, R>,
): Policy<E, R> =>
	Effect.gen(function* () {
		const result = yield* predicate();
		if (result) return;

		return yield* new PolicyDeniedError();
	});

export const withPolicy =
	<E, R>(policy: Policy<E, R>) =>
	<A, E2, R2>(self: Effect.Effect<A, E2, R2>) =>
		Effect.zipRight(policy, self);

export class PolicyDeniedError extends Schema.TaggedError<PolicyDeniedError>()(
	"PolicyDenied",
	{},
) {}
