import {
	FetchHttpClient,
	HttpApiClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import { Api, type RawJWT } from "@macrograph/web-domain";
import { Config, Effect, Option, SubscriptionRef } from "effect";
import { Persistence } from "../Persistence";

const CLIENT_ID = "macrograph-server";

export class CloudApiClient extends Effect.Service<CloudApiClient>()(
	"CloudApiClient",
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const persistence = yield* Persistence;
			const token = yield* SubscriptionRef.make<Option.Option<RawJWT>>(
				Option.fromNullable(persistence.getKey("api")),
			);

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
				tokenChanges: token.changes,
				setToken: Effect.fn(function* (value: Option.Option<RawJWT>) {
					yield* persistence.setKey("api", Option.getOrNull(value));
					yield* SubscriptionRef.set(token, value);
				}),
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
		dependencies: [FetchHttpClient.layer, Persistence.Default],
	},
) {}
