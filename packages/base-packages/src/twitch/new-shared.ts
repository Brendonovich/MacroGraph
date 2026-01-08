import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema as S } from "effect";
import { Resource } from "@macrograph/package-sdk";

import { ConnectionFailed, TwitchAPIError } from "./new-types";
import { ChannelRpcs } from "./rpcs-channel";
// Import all RPC groups
import { ChatRpcs } from "./rpcs-chat";
import { MiscRpcs } from "./rpcs-misc";
import { ModerationRpcs } from "./rpcs-moderation";
import { StreamRpcs } from "./rpcs-stream";

// ============================================================================
// Client RPCs (EventSub Connection Management)
// ============================================================================

export class ClientRpcs extends RpcGroup.make(
	Rpc.make("ConnectEventSub", {
		payload: S.Struct({ accountId: S.String }),
		error: S.Union(TwitchAPIError, ConnectionFailed),
	}),
	Rpc.make("DisconnectEventSub", {
		payload: S.Struct({ accountId: S.String }),
	}),
) {}

// ============================================================================
// Runtime RPCs (Helix API Operations)
// ============================================================================

export class RuntimeRpcs extends RpcGroup.make(
	// Chat RPCs (13 endpoints)
	...ChatRpcs,

	// Channel RPCs (6 endpoints)
	...ChannelRpcs,

	// Moderation RPCs (6 endpoints)
	...ModerationRpcs,

	// Stream/Video/Clip RPCs (9 endpoints)
	...StreamRpcs,

	// Miscellaneous RPCs (40 endpoints)
	// Includes: Polls, Predictions, Custom Rewards, Raids, Ads, Schedule,
	// Games/Categories, Users, Subscriptions, Bits, Charity, Goals, HypeTrain,
	// Whispers, EventSub, Analytics, Entitlements/Drops
	...MiscRpcs,
) {}

// ============================================================================
// State Schema (for UI display)
// ============================================================================

export class ClientState extends S.Struct({
	accounts: S.Array(
		S.Struct({
			id: S.String,
			displayName: S.String,
			eventSubSocket: S.Union(
				S.Struct({ state: S.Literal("disconnected") }),
				S.Struct({ state: S.Literal("connecting") }),
				S.Struct({ state: S.Literal("connected") }),
			),
		}),
	),
}) {}

export class TwitchAccount extends Resource.Tag("TwitchAccount")({
	name: "Twitch Account",
}) {}
