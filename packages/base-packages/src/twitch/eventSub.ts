import { Schema } from "effect";

type SubscriptionTypeDefinition = {
  type: string;
  version: number;
  condition: Schema.Struct.Fields;
  event: Schema.Struct.Fields;
};

function makeCreateSubscriptionBody<
  const TDef extends SubscriptionTypeDefinition,
>(def: TDef) {
  return Schema.Struct({
    type: Schema.Literal(def.type as TDef["type"]),
    version: Schema.Literal(`${def.version as TDef["version"]}`),
    condition: Schema.Struct(def.condition as TDef["condition"]),
  });
}

const subscriptionTypes = {
  channelBan: {
    type: "channel.ban",
    version: 1,
    condition: {
      broadcaster_user_id: Schema.String,
    },
    event: {
      user_id: Schema.String,
      user_login: Schema.String,
      user_name: Schema.String,
      broadcaster_user_id: Schema.String,
      broadcaster_user_login: Schema.String,
      broadcaster_user_name: Schema.String,
      moderator_user_id: Schema.String,
      moderator_user_login: Schema.String,
      moderator_user_name: Schema.String,
      reason: Schema.String,
      banned_at: Schema.DateFromString,
      ends_at: Schema.NullOr(Schema.DateFromString),
      is_permanent: Schema.Boolean,
    },
  },
  channelUnban: {
    type: "channel.unban",
    version: 1,
    condition: {
      broadcaster_user_id: Schema.String,
    },
    event: {
      user_id: Schema.String,
      user_login: Schema.String,
      user_name: Schema.String,
      broadcaster_user_id: Schema.String,
      broadcaster_user_login: Schema.String,
      broadcaster_user_name: Schema.String,
      moderator_user_id: Schema.String,
      moderator_user_login: Schema.String,
      moderator_user_name: Schema.String,
    },
  },
  channelFollow: {
    type: "channel.follow",
    version: 2,
    condition: {
      broadcaster_user_id: Schema.String,
      moderator_user_id: Schema.String,
    },
    event: {
      user_id: Schema.String,
      broadcaster_user_id: Schema.String,
      followed_at: Schema.DateFromString,
    },
  },
} as const satisfies Record<string, SubscriptionTypeDefinition>;

export const EVENTSUB_CREATE_SUBSCRIPTION_BODY = Schema.Union(
  makeCreateSubscriptionBody(subscriptionTypes.channelBan),
  makeCreateSubscriptionBody(subscriptionTypes.channelUnban),
  makeCreateSubscriptionBody(subscriptionTypes.channelFollow),
);

function makeMessageSchema<
  TType extends string,
  TPayload extends Schema.Struct.Fields,
>(value: { message_type: TType; payload: TPayload }) {
  return Schema.Struct({
    metadata: Schema.Struct({
      message_id: Schema.String,
      message_timestamp: Schema.DateFromString,
      message_type: Schema.Literal(value.message_type),
    }),
    payload: Schema.Struct(value.payload),
  });
}

function makeNotificationMessageSchema<TDef extends SubscriptionTypeDefinition>(
  def: TDef,
) {
  const s = makeMessageSchema({
    message_type: "notification",
    payload: {
      subscription: Schema.Struct({
        id: Schema.String,
        type: Schema.Literal(def.type as TDef["type"]),
        created_at: Schema.DateFromString,
      }),
      event: Schema.Struct(def.event as TDef["event"]),
    },
  });

  return Schema.Struct({
    metadata: Schema.extend(
      s.fields.metadata,
      Schema.Struct({
        subscription_type: Schema.Literal(def.type as TDef["type"]),
        subscription_version: Schema.String,
      }),
    ),
    payload: s.fields.payload,
  });
}

export type EventSubMessage = (typeof EVENTSUB_MESSAGE)["Type"];
export const EVENTSUB_MESSAGE = Schema.Union(
  makeMessageSchema({
    message_type: "session_welcome",
    payload: {
      session: Schema.Struct({
        id: Schema.String,
        status: Schema.Literal("connected"),
        connected_at: Schema.DateFromString,
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

type EventSubNotificationMessage = Extract<
  EventSubMessage,
  { metadata: { message_type: "notification" } }
>;

export function isNotificationType<
  T extends EventSubNotificationMessage["metadata"]["subscription_type"],
>(
  msg: EventSubNotificationMessage,
  type: T,
): msg is Extract<
  EventSubNotificationMessage,
  { metadata: { subscription_type: T } }
> {
  return msg.metadata.subscription_type === type;
}
