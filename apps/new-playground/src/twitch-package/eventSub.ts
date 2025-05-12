import { Schema as S } from "effect";

function makeBodySchema<
  TType extends string,
  TVersion extends `${number}`,
  TCondition extends S.Struct<any>,
>(value: { type: TType; version: TVersion; condition: TCondition }) {
  return S.Struct({
    type: S.Literal(value.type),
    version: S.Literal(value.version),
    condition: value.condition,
  });
}

export const EVENTSUB_REQUEST_BODY = S.Union(
  makeBodySchema({
    type: "channel.follow",
    version: "2",
    condition: S.Struct({
      broadcaster_user_id: S.String,
      moderator_user_id: S.String,
    }),
  }),
  makeBodySchema({
    type: "channel.ban",
    version: "1",
    condition: S.Struct({ broadcaster_user_id: S.String }),
  }),
  makeBodySchema({
    type: "channel.unban",
    version: "1",
    condition: S.Struct({ broadcaster_user_id: S.String }),
  }),
);
