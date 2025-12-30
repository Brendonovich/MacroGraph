import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const ProductCost = S.Struct({
	amount: S.Int,
	type: S.String,
});

export const ProductData = S.Struct({
	domain: S.String,
	broadcast: S.Boolean,
	expiration: S.String,
	sku: S.String,
	cost: ProductCost,
	displayName: S.String,
	inDevelopment: S.Boolean,
});

export const ExtensionTransaction = S.Struct({
	id: S.String,
	timestamp: S.DateFromString,
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	product_type: S.String,
	product_data: ProductData,
});

export const ManyExtensionTransactions = S.Struct({
	data: S.Array(ExtensionTransaction),
	pagination: S.Struct({ cursor: S.String }),
});

export const ExtensionTransactionsResponse = S.Struct({
	data: ManyExtensionTransactions,
});

export const ExtensionSendChatMessageBody = S.Struct({
	text: S.String,
	extension_version: S.String,
	extension_id: S.String,
});

export const ExtensionSendChatMessageResponse = S.Struct({});

export const ExtensionLiveChannel = S.Struct({
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	game_name: S.String,
	game_id: S.String,
	title: S.String,
});

export const ManyExtensionLiveChannels = S.Struct({
	data: S.Array(ExtensionLiveChannel),
	pagination: S.String,
});

export const ExtensionLiveChannelsResponse = S.Struct({
	data: ManyExtensionLiveChannels,
});

export const ExtensionSetConfigurationParams = S.Struct({
	segment: S.Union(
		S.Literal("broadcaster"),
		S.Literal("developer"),
		S.Literal("global"),
	),
	extension_id: S.String,
	broadcaster_id: S.optional(S.String),
	version: S.String,
	content: S.String,
});

export const ExtensionConfigurationSegment = S.Struct({
	segment: S.String,
	version: S.String,
	content: S.String,
});

export const ManyExtensionConfigurationSegments = S.Struct({
	data: S.Array(ExtensionConfigurationSegment),
});

export const ExtensionGetConfigurationSegmentResponse = S.Struct({
	data: ManyExtensionConfigurationSegments,
});

export const ExtensionSetConfigurationResponse = S.Struct({});

export const ExtensionSetRequiredConfigurationBody = S.Struct({
	extension_id: S.String,
	required_version: S.String,
	extension_version: S.String,
	configuration_version: S.String,
});

export const ExtensionSetRequiredConfigurationResponse = S.Struct({});

export const ExtensionSendPubSubMessageParams = S.Struct({
	broadcaster_id: S.String,
	message: S.String,
	target: S.Array(S.String),
	is_global_broadcast: S.optional(S.Boolean),
});

export const ExtensionSendPubSubMessageResponse = S.Struct({});

export const Secret = S.Struct({
	active_at: S.DateFromString,
	content: S.String,
	expires_at: S.DateFromString,
});

export const SecretsInformation = S.Struct({
	format_version: S.Int,
	secrets: S.Array(Secret),
});

export const ManyExtensionSecrets = S.Struct({
	data: S.Array(SecretsInformation),
});

export const ExtensionSecretCreationResponse = S.Struct({
	data: ManyExtensionSecrets,
});

export const GetExtensionSecretParams = S.Struct({
	extension_id: S.String,
});

export const GetExtensionSecretResponse = S.Struct({
	data: ManyExtensionSecrets,
});

export const ExtensionsGroup = HttpApiGroup.make("extensions")
	.add(
		HttpApiEndpoint.get("getExtensionTransactions", "/transactions")
			.setUrlParams(
				S.Struct({
					extension_id: S.String,
					id: S.optional(S.Array(S.String)),
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(ExtensionTransactionsResponse),
	)
	.add(
		HttpApiEndpoint.post("sendExtensionChatMessage", "/chat")
			.setUrlParams(S.Struct({ broadcaster_id: S.String }))
			.setPayload(ExtensionSendChatMessageBody)
			.addSuccess(ExtensionSendChatMessageResponse),
	)
	.add(
		HttpApiEndpoint.get("getExtensionLiveChannels", "/live")
			.setUrlParams(
				S.Struct({
					extension_id: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(ExtensionLiveChannelsResponse),
	)
	.add(
		HttpApiEndpoint.get("getExtensionConfigurationSegment", "/configurations")
			.setUrlParams(
				S.Struct({
					extension_id: S.String,
					broadcaster_id: S.optional(S.String),
					segment: S.optional(S.Array(S.String)),
				}),
			)
			.addSuccess(ExtensionGetConfigurationSegmentResponse),
	)
	.add(
		HttpApiEndpoint.put("setExtensionSegmentConfig", "/configurations")
			.setPayload(ExtensionSetConfigurationParams)
			.addSuccess(ExtensionSetConfigurationResponse),
	)
	.add(
		HttpApiEndpoint.put(
			"setExtensionRequiredConfiguration",
			"/configurations/required_configuration",
		)
			.setUrlParams(S.Struct({ broadcaster_id: S.String }))
			.setPayload(ExtensionSetRequiredConfigurationBody)
			.addSuccess(ExtensionSetRequiredConfigurationResponse),
	)
	.add(
		HttpApiEndpoint.post("sendExtensionPubSubMessage", "/pubsub")
			.setPayload(ExtensionSendPubSubMessageParams)
			.addSuccess(ExtensionSendPubSubMessageResponse),
	)
	.add(
		HttpApiEndpoint.post("createExtensionSecret", "/jwt/secrets")
			.setUrlParams(
				S.Struct({
					extension_id: S.String,
					delay: S.optional(S.String),
				}),
			)
			.addSuccess(ExtensionSecretCreationResponse),
	)
	.add(
		HttpApiEndpoint.post("getExtensionSecrets", "/jwt/secrets/get")
			.setPayload(GetExtensionSecretParams)
			.addSuccess(GetExtensionSecretResponse),
	)
	.prefix("/extensions");
