import { Schema as S } from "effect";

export const AccountId = S.String.pipe(S.brand("AccountId"));
export type AccountId = typeof AccountId.Type;

// ============================================================================
// Twitch EventSub Event Type Definitions
// ============================================================================
// This file contains all Twitch EventSub event type definitions using
// Schema.TaggedClass following the OBS package architecture pattern.
//
// Each event is a dedicated class with its own fields, allowing type-safe
// event handling throughout the MacroGraph runtime.
// ============================================================================

// ----------------------------------------------------------------------------
// EventSub Message Namespace
// ----------------------------------------------------------------------------

export namespace EventSubMessage {
	function makeMessageSchema<
		TType extends string,
		TPayload extends S.Struct.Fields,
	>(value: { message_type: TType; payload: TPayload }) {
		return S.Struct({
			metadata: S.Struct({
				message_id: S.String,
				message_timestamp: S.DateFromString,
				message_type: S.Literal(value.message_type),
			}),
			payload: S.Struct(value.payload),
		});
	}

	export const EventSubMessage = S.Union(
		makeMessageSchema({
			message_type: "session_welcome",
			payload: {
				session: S.Struct({
					id: S.String,
					status: S.Literal("connected"),
					// connected_at: S.DateFromString,
				}),
			},
		}),
		makeMessageSchema({ message_type: "session_keepalive", payload: {} }),
		makeMessageSchema({
			message_type: "notification",
			payload: {
				subscription: S.Struct({
					id: S.String,
					type: S.String,
					created_at: S.DateFromString,
				}),
				event: S.Any,
			},
		}),
	);
	export type EventSubMessage = S.Schema.Type<typeof EventSubMessage>;

	export function isType<T extends EventSubMessage["metadata"]["message_type"]>(
		msg: EventSubMessage,
		type: T,
	): msg is Extract<EventSubMessage, { metadata: { message_type: T } }> {
		return msg.metadata.message_type === type;
	}
}

// ============================================================================
// Error Classes
// ============================================================================

export class TwitchAPIError extends S.TaggedError<TwitchAPIError>()(
	"TwitchAPIError",
	{ cause: S.Unknown },
) {}

export class MissingCredential extends S.TaggedError<MissingCredential>()(
	"MissingCredential",
	{},
) {}

export const RpcError = S.Union(TwitchAPIError, MissingCredential);

export class ConnectionFailed extends S.TaggedError<ConnectionFailed>()(
	"ConnectionFailed",
	{ cause: S.Literal("session-welcome-expected") },
) {}
