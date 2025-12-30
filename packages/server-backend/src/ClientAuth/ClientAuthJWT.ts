import { Effect, ParseResult, Schema } from "effect";
import { ClientAuth } from "@macrograph/server-domain";
import * as Jose from "jose";

import { JWTError, JwtKeys } from "../JwtKeys";

export class ClientAuthJWT extends Schema.Class<ClientAuthJWT>("ClientAuthJWT")(
	{ accessToken: Schema.String, refreshToken: Schema.String },
) {}

export const ClientAuthJWTFromEncoded = Schema.transformOrFail(
	ClientAuth.EncodedJWT,
	ClientAuthJWT,
	{
		strict: true,
		encode: Effect.fn(function* (input, _, ast) {
			const keys = yield* JwtKeys;

			return yield* Effect.tryPromise(() =>
				new Jose.EncryptJWT({
					accessToken: input.accessToken,
					refreshToken: input.refreshToken,
				})
					.setProtectedHeader({ alg: "RSA-OAEP-256", enc: "A256GCM" })
					.setIssuedAt()
					.encrypt(keys.publicKey),
			).pipe(
				Effect.map(ClientAuth.EncodedJWT.make),
				Effect.mapError(
					(e) => new ParseResult.Forbidden(ast, input, e.error.toString()),
				),
			);
		}),
		decode: Effect.fn(function* (input, _, ast) {
			const keys = yield* JwtKeys;
			const a = yield* Effect.promise(() =>
				Jose.jwtDecrypt(input, keys.privateKey),
			);

			return yield* Schema.decodeUnknown(ClientAuthJWT)(a.payload).pipe(
				Effect.catchTag("ParseError", (e) =>
					Effect.fail(new ParseResult.Type(ast, input, e.message)),
				),
			);
		}),
	},
);
