import { Schema as S } from "effect";

export const WebSocketUrl = S.String.pipe(S.brand("WebSocketUrl"));
export type WebSocketUrl = typeof WebSocketUrl.Type;

export namespace Event {
	export class WebSocketMessage extends S.TaggedClass<WebSocketMessage>()(
		"WebSocketMessage",
		{ url: WebSocketUrl, data: S.String },
	) {}

	export const Any = S.Union(WebSocketMessage);
	export type Any = S.Schema.Type<typeof Any>;
}
