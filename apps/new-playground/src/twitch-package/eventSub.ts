import { Schema as S } from "effect";

type SubscriptionTypeDefinition = {
  type: string;
  version: number;
  condition: S.Struct.Fields;
  event: S.Struct.Fields;
};

function makeCreateSubscriptionBody<
  const TDef extends SubscriptionTypeDefinition,
>(def: TDef) {
  return S.Struct({
    type: S.Literal(def.type as TDef["type"]),
    version: S.Literal(`${def.version as TDef["version"]}`),
    condition: S.Struct(def.condition as TDef["condition"]),
  });
}

const subscriptionTypes = {
  channelBan: {
    type: "channel.ban",
    version: 1,
    condition: {
      broadcaster_user_id: S.String,
    },
    event: {
      user_id: S.String,
      broadcaster_user_id: S.String,
      moderator_user_id: S.String,
      reason: S.String,
      banned_at: S.DateFromString,
      ends_at: S.NullOr(S.DateFromString),
      is_permanent: S.Boolean,
    },
  },
  channelUnban: {
    type: "channel.unban",
    version: 1,
    condition: {
      broadcaster_user_id: S.String,
    },
    event: {
      user_id: S.String,
      broadcaster_user_id: S.String,
      moderator_user_id: S.String,
    },
  },
  channelFollow: {
    type: "channel.follow",
    version: 2,
    condition: {
      broadcaster_user_id: S.String,
      moderator_user_id: S.String,
    },
    event: {
      user_id: S.String,
      broadcaster_user_id: S.String,
      followed_at: S.DateFromString,
    },
  },
} as const satisfies Record<string, SubscriptionTypeDefinition>;

export const EVENTSUB_CREATE_SUBSCRIPTION_BODY = S.Union(
  makeCreateSubscriptionBody(subscriptionTypes.channelBan),
  makeCreateSubscriptionBody(subscriptionTypes.channelUnban),
  makeCreateSubscriptionBody(subscriptionTypes.channelFollow),
);

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

function makeNotificationMessageSchema<TDef extends SubscriptionTypeDefinition>(
  def: TDef,
) {
  const s = makeMessageSchema({
    message_type: "notification",
    payload: {
      subscription: S.Struct({
        id: S.String,
        type: S.Literal(def.type as TDef["type"]),
        created_at: S.DateFromString,
      }),
      event: S.Struct(def.event as TDef["event"]),
    },
  });

  return S.Struct({
    metadata: S.extend(
      s.fields.metadata,
      S.Struct({
        subscription_type: S.Literal(def.type as TDef["type"]),
        subscription_version: S.String,
      }),
    ),
    payload: s.fields.payload,
  });
}

export type EventSubMessage = (typeof EVENTSUB_MESSAGE)["Type"];
export const EVENTSUB_MESSAGE = S.Union(
  makeMessageSchema({
    message_type: "session_welcome",
    payload: {
      session: S.Struct({
        id: S.String,
        status: S.Literal("connected"),
        connected_at: S.DateFromString,
      }),
    },
  }),
  makeMessageSchema({
    message_type: "session_keepalive",
    payload: {},
  }),
  makeNotificationMessageSchema(subscriptionTypes.channelBan),
  makeNotificationMessageSchema(subscriptionTypes.channelUnban),
);

export function isEventSubMessageType<
  T extends EventSubMessage["metadata"]["message_type"],
>(
  msg: EventSubMessage,
  type: T,
): msg is Extract<EventSubMessage, { metadata: { message_type: T } }> {
  return msg.metadata.message_type === type;
}
