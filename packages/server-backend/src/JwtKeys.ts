import { Config, Data, Effect } from "effect";

export class JwtKeys extends Effect.Service<JwtKeys>()("JwtKeys", {
	effect: Effect.gen(function* () {
		const jwtSecret = yield* Config.string("JWT_SECRET");

		const keyMaterial = yield* Effect.promise(() =>
			crypto.subtle.importKey(
				"raw",
				new TextEncoder().encode(jwtSecret),
				{ name: "HKDF" },
				false,
				["deriveBits", "deriveKey"],
			),
		);

		const secretKey = yield* Effect.promise(() =>
			crypto.subtle.deriveKey(
				{
					name: "HKDF",
					hash: "SHA-256",
					salt: new Uint8Array(0),
					info: new Uint8Array(0),
				},
				keyMaterial,
				{ name: "AES-GCM", length: 256 },
				false,
				["encrypt", "decrypt"],
			),
		);

		return { secretKey };
	}),
}) {}

export class JWTError extends Data.TaggedError("JWTError")<{
	cause: unknown;
}> {}
