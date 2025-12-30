import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const WebhookSubscription = S.Struct({
	topic: S.String,
	callback: S.String,
	expires_at: S.DateFromString,
});

export const WebhookSubscriptionPayload = S.Struct({
	"hub.mode": S.Literal("subscribe", "unsubscribe"),
	"hub.topic": S.String,
	"hub.callback": S.String,
	"hub.lease_seconds": S.optional(S.Int),
	"hub.secret": S.optional(S.String),
});

export const WebhooksGroup = HttpApiGroup.make("webhooks")
	.add(
		HttpApiEndpoint.get("getWebhookSubscriptions", "/subscriptions")
			.setUrlParams(
				S.Struct({
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						total: S.Int,
						data: S.Array(WebhookSubscription),
						pagination: S.Struct({ cursor: S.String }),
					}),
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("createWebhookSubscription", "/hub")
			.setPayload(WebhookSubscriptionPayload)
			.addSuccess(S.Void, { status: 202 }),
	)
	.prefix("/webhooks");
