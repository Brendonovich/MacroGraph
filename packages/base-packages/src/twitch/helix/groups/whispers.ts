import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const SendWhisperBody = S.Struct({
	message: S.String,
});

export const WhispersGroup = HttpApiGroup.make("whispers")
	.add(
		HttpApiEndpoint.post("sendWhisper", "/")
			.setUrlParams(
				S.Struct({
					from_user_id: S.String,
					to_user_id: S.String,
				}),
			)
			.setPayload(SendWhisperBody)
			.addSuccess(S.Void, { status: 204 }),
	)
	.prefix("/whispers");
