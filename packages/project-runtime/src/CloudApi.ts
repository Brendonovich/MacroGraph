import { HttpClient, HttpClientRequest } from "@effect/platform";
import * as HttpApiClient from "@effect/platform/HttpApiClient";
import { Context, Effect, Layer, Option } from "effect";
import { Api } from "@macrograph/web-domain";

export namespace CloudApiClient {
	export type Options = {
		baseUrl?: string;
		auth?: { clientId: string; token: string };
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
				HttpClient.mapRequest((req) =>
					Option.fromNullable(opts?.auth).pipe(
						Option.match({
							onNone: () => req,
							onSome: ({ clientId, token }) =>
								HttpClientRequest.setHeaders(req, {
									authorization: `Bearer ${token}`,
									"client-id": clientId,
								}),
						}),
					),
				),
			),
		});
	});

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
