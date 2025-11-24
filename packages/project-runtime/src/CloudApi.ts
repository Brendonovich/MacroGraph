import * as HttpApiClient from "@effect/platform/HttpApiClient";
import { Context, type Effect, Layer } from "effect";
import { Api } from "@macrograph/web-domain";

export namespace CloudApiClient {
	export const make = (baseUrl?: string) =>
		HttpApiClient.make(Api, { baseUrl });

	export class CloudApiClient extends Context.Tag("CloudApiClient")<
		CloudApiClient,
		Effect.Effect.Success<ReturnType<typeof make>>
	>() {}

	export const layer = (baseUrl?: string) =>
		Layer.effect(CloudApiClient, make(baseUrl));
}
