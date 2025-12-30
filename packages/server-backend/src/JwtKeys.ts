import { Config, Data, Effect } from "effect";
import * as Jose from "jose";

export class JwtKeys extends Effect.Service<JwtKeys>()("JwtKeys", {
	effect: Effect.gen(function* () {
		const publicKey = yield* Config.string("JWT_PUBLIC_KEY").pipe(
			Effect.andThen((v) =>
				Effect.promise(() =>
					Jose.importSPKI(v.replaceAll("\\n", "\n"), "RSA-OAEP-256"),
				),
			),
		);

		const privateKey = yield* Config.string("JWT_PRIVATE_KEY").pipe(
			Effect.andThen((v) =>
				Effect.promise(() =>
					Jose.importPKCS8(v.replaceAll("\\n", "\n"), "RSA-OAEP-256"),
				),
			),
		);

		return { publicKey, privateKey };
	}),
}) {}

export class JWTError extends Data.TaggedError("JWTError")<{
	cause: unknown;
}> {}
