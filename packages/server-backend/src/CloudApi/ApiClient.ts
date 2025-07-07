import {
	FetchHttpClient,
	HttpApiClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { Api } from "@macrograph/web-api";
import { Config, Console, Effect, Option, SubscriptionRef } from "effect";

const CLIENT_ID = "macrograph-server";

export class CloudAPIClient extends Effect.Service<CloudAPIClient>()(
	"CloudAPIClient",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			let token = yield* SubscriptionRef.make(Option.none<string>());

			const baseUrl = yield* Config.string("API_URL").pipe(
				Config.withDefault("https://www.macrograph.app"),
			);

			const httpClient = yield* HttpClient.HttpClient;
			const api = yield* HttpApiClient.make(Api, {
				baseUrl,
				transformClient: HttpClient.mapRequestEffect((req) =>
					token.get.pipe(
						Effect.map(
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
			});

			return {
				api,
				token,
				makeClient: (options: {
					readonly transformClient?:
						| ((client: HttpClient.HttpClient) => HttpClient.HttpClient)
						| undefined;
				}) =>
					HttpApiClient.make(Api, {
						baseUrl,
						transformClient: (client) =>
							(options.transformClient?.(client) ?? client).pipe(
								HttpClient.mapRequest(
									HttpClientRequest.setHeader("client-id", CLIENT_ID),
								),
							),
					}).pipe(Effect.provide(HttpClient.HttpClient.context(httpClient))),
			};
		}),
		dependencies: [FetchHttpClient.layer],
	},
) {}
