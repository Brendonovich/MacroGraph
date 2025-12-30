import { HttpApi } from "@effect/platform";

import { AdsGroup } from "./groups/ads-categories";
import {
	AnalyticsGroup,
	SubscriptionsGroup,
	VideosGroup,
} from "./groups/analytics";
import { AuthenticationGroup } from "./groups/authentication";
import { ChannelPointsGroup } from "./groups/channel-points";
import { ChannelsGroup } from "./groups/channels";
import { ChatGroup } from "./groups/chat";
import {
	BitsGroup,
	CharityGroup,
	ClipsGroup,
} from "./groups/clips-charity-bits";
import {
	EventSubGroup,
	PollsGroup,
	PredictionsGroup,
} from "./groups/community";
import { EntitlementsGroup } from "./groups/entitlements";
import { ExtensionsGroup } from "./groups/extensions";
import { GoalsGroup } from "./groups/goals";
import { HypeTrainGroup } from "./groups/hype-train";
import { DropsGroup, GamesGroup, RaidsGroup } from "./groups/raids-games-drops";
import { ScheduleGroup, StreamsGroup } from "./groups/streams";
import { UsersGroup } from "./groups/users";
import { WebhooksGroup } from "./groups/webhooks";
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
