import { HttpClient, HttpClientRequest } from "@effect/platform";
import * as HttpApiClient from "@effect/platform/HttpApiClient";
import { Context, Effect, Layer, Option } from "effect";
import { Api } from "@macrograph/web-domain";

export namespace CloudApiClient {
	export type Options = {
		baseUrl?: string;
	};

	export const make = Effect.fn(function* (opts?: Options) {
		const httpClient = yield* HttpClient.HttpClient;
		return yield* HttpApiClient.makeWith(Api, {
			baseUrl:
				opts?.baseUrl ??
				(yield* Effect.serviceOption(BaseUrl).pipe(
					Effect.map(Option.getOrUndefined),
				)) ??
				"https://macrograph.app",
			httpClient: httpClient.pipe(
				HttpClient.mapRequestEffect(
					Effect.fn(function* (req) {
						const auth = yield* Effect.serviceOption(Auth);

						return yield* auth.pipe(
							Effect.transposeOption,
							Effect.map(Option.flatten),
							Effect.map(
								Option.match({
									onNone: () => req,
									onSome: ({ clientId, token }) =>
										HttpClientRequest.setHeaders(req, {
											authorization: `Bearer ${token}`,
											"client-id": clientId,
										}),
								}),
							),
						);
					}),
				),
			),
		});
	});

	export class Auth extends Context.Tag(
		"@macrograph/project-runtime/CloudApi/Auth",
	)<
		Auth,
		Effect.Effect<
			Option.Option<{
				clientId: string;
				token: string;
			}>
		>
	>() {}

	export class BaseUrl extends Context.Reference<BaseUrl>()(
		"CloudApiClient/BaseUrl",
		{ defaultValue: () => "https://macrograph.app" },
	) {}

	export class CloudApiClient extends Context.Tag("CloudApiClient")<
		CloudApiClient,
		Effect.Effect.Success<ReturnType<typeof make>>
	>() {}

	export const layer = (opts?: Options) =>
		Layer.effect(CloudApiClient, make(opts));
}
