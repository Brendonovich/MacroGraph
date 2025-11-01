import {
	FetchHttpClient,
	HttpApiClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { Api, type RawJWT } from "@macrograph/web-domain";
import { Context, Effect, Layer, Option } from "effect";

const CLIENT_ID = "macrograph-server";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class CloudApiToken extends Context.Tag("CloudApiToken")<
	CloudApiToken,
	Effect.Effect<Option.Option<RawJWT | string>>
>() {
	static makeContext(value: Option.Option<RawJWT | string>) {
		return CloudApiToken.context(Effect.succeed(value));
	}
}

export class CloudApiURL extends Context.Reference<CloudApiURL>()(
	"CloudApiURL",
	{ defaultValue: () => undefined as string | undefined },
) {}

export class CloudApi extends Effect.Service<CloudApi>()("CloudApi", {
	effect: Effect.gen(function* () {
		const baseUrl = yield* CloudApiURL;

		const httpClient = yield* HttpClient.HttpClient;

		const makeClient = Effect.gen(function* () {
			const getToken = yield* CloudApiToken;

			const httpClientLayer = Layer.succeed(
				HttpClient.HttpClient,
				httpClient.pipe(
					HttpClient.mapRequestEffect((req) =>
						Effect.map(
							getToken,
							Option.match({
								onSome: (token) =>
									req.pipe(
										HttpClientRequest.bearerToken(token),
										HttpClientRequest.setHeader("client-id", CLIENT_ID),
									),
								onNone: () => req,
							}),
						),
					),
				),
			);

			return yield* HttpApiClient.make(Api, {
				baseUrl,
			}).pipe(Effect.provide(httpClientLayer));
		});

		const client = yield* makeClient;

		return {
			client,
			makeClient,
			hasToken: (yield* CloudApiToken).pipe(Effect.map(Option.isSome)),
		};
	}),
	dependencies: [FetchHttpClient.layer],
}) {}
