import {
	FetchHttpClient,
	HttpApiClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { Api, type RawJWT } from "@macrograph/web-domain";
import { Config, Effect, Option } from "effect";

const CLIENT_ID = "macrograph-server";

export class CloudApi extends Effect.Service<CloudApi>()("CloudApi", {
	effect: Effect.gen(function* () {
		const baseUrl = yield* Config.string("API_URL").pipe(
			Config.withDefault("https://www.macrograph.app"),
		);

		const client = yield* HttpClient.HttpClient;

		const makeClient = (token: Option.Option<RawJWT>) =>
			HttpApiClient.make(Api, {
				baseUrl,
				transformClient: (client) =>
					client.pipe(
						HttpClient.mapRequest((req) =>
							Option.match(token, {
								onSome: (token) =>
									req.pipe(
										HttpClientRequest.bearerToken(token),
										HttpClientRequest.setHeader("client-id", CLIENT_ID),
									),
								onNone: () => req,
							}),
						),
					),
			}).pipe(Effect.provide(HttpClient.HttpClient.context(client)));

		return { makeClient };
	}),
	dependencies: [FetchHttpClient.layer],
}) {}
