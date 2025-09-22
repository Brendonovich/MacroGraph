import { Config, Effect } from "effect";
import * as Jose from "jose";

export class JwtKeys extends Effect.Service<JwtKeys>()("JwtKeys", {
	effect: Effect.gen(function* () {
		const privateKey = yield* Config.string("JWT_PRIVATE_KEY").pipe(
			Effect.andThen((v) =>
				Effect.promise(() =>
					Jose.importPKCS8(v.replaceAll("\\n", "\n"), "RS256"),
				),
			),
		);

		return { privateKey };
	}),
}) {}
