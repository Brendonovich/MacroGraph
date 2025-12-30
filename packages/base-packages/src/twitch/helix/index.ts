import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

import { AuthenticationGroup } from "./groups/authentication";
import { AdsGroup, CategoriesGroup } from "./groups/ads-categories";
import {
	AnalyticsGroup,
	VideosGroup,
	SubscriptionsGroup,
} from "./groups/analytics";
import {
	BitsGroup,
	CharityGroup,
	ClipsGroup,
} from "./groups/clips-charity-bits";
import { StreamsGroup, ScheduleGroup } from "./groups/streams";
import {
	PollsGroup,
	PredictionsGroup,
	EventSubGroup,
} from "./groups/community";
import { RaidsGroup, GamesGroup, DropsGroup } from "./groups/raids-games-drops";
import { ChannelPointsGroup } from "./groups/channel-points";
import { ChatGroup } from "./groups/chat";
import { ChannelsGroup } from "./groups/channels";
import { ExtensionsGroup } from "./groups/extensions";
import { ModerationGroup } from "./groups/moderation";
import { UsersGroup } from "./groups/users";
import { EntitlementsGroup } from "./groups/entitlements";
import { WebhooksGroup } from "./groups/webhooks";
import { GoalsGroup } from "./groups/goals";
import { HypeTrainGroup } from "./groups/hype-train";
import { WhispersGroup } from "./groups/whispers";

export const HelixApi = HttpApi.make("helix")
	.prefix("/helix")
	.add(AdsGroup)
	.add(AnalyticsGroup)
	.add(AuthenticationGroup)
	.add(BitsGroup)
	.add(CharityGroup)
	.add(ChannelsGroup)
	.add(ChatGroup)
	.add(ClipsGroup)
	.add(DropsGroup)
	.add(EntitlementsGroup)
	.add(EventSubGroup)
	.add(ExtensionsGroup)
	.add(GamesGroup)
	.add(GoalsGroup)
	.add(HypeTrainGroup)
	.add(ChannelPointsGroup)
	.add(PollsGroup)
	.add(PredictionsGroup)
	.add(RaidsGroup)
	.add(ScheduleGroup)
	.add(StreamsGroup)
	.add(SubscriptionsGroup)
	.add(UsersGroup)
	.add(VideosGroup)
	.add(WebhooksGroup)
	.add(WhispersGroup);

export const EventSubTransport = S.Union(
	S.Struct({
		method: S.Literal("websocket"),
		session_id: S.String,
	}),
	S.Struct({
		method: S.Literal("conduit"),
		conduit: S.String,
	}),
	S.Struct({
		method: S.Literal("webhook"),
		callback: S.String,
		secret: S.String,
	}),
);
