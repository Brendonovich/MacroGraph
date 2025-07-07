import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";

import { EVENTSUB_CREATE_SUBSCRIPTION_BODY } from "./eventSub";

export class HelixApi extends HttpApi.make("helix")
  .prefix("/helix")
  .add(
    HttpApiGroup.make("eventSub")
      .add(
        HttpApiEndpoint.post("createSubscription", "/subscriptions")
          .setPayload(
            Schema.extend(
              EVENTSUB_CREATE_SUBSCRIPTION_BODY,
              Schema.Struct({
                transport: Schema.Union(
                  Schema.Struct({
                    method: Schema.Literal("websocket"),
                    session_id: Schema.String,
                  }),
                  Schema.Struct({
                    method: Schema.Literal("conduit"),
                    conduit: Schema.String,
                  }),
                  Schema.Struct({
                    method: Schema.Literal("webhook"),
                    callback: Schema.String,
                    secret: Schema.String,
                  }),
                ),
              }),
            ),
          )
          .addSuccess(
            Schema.Struct({
              data: Schema.Array(
                Schema.Struct({
                  // id: S.String,
                  // status: S.Literal(
                  //   "enabled",
                  //   "webhook_callback_verification_pending",
                  // ),
                  // type: S.String,
                  // version: S.String,
                  // condition: S.Any,
                  // created_at: S.DateFromString,
                }),
              ),
              // total: S.Int,
              // total_cost: S.Int,
              // max_total_cost: S.Int,
            }),
            { status: 202 },
          ),
      )
      .add(
        HttpApiEndpoint.get("getSubscriptions", "/subscriptions").addSuccess(
          Schema.Struct({
            data: Schema.Array(
              Schema.Struct({
                id: Schema.String,
                status: Schema.String,
                // S.Literal(
                //   "enabled",
                //   "websocket_disconnected",
                //   "websocket_failed_ping_pong",
                // ),
                type: Schema.String,
                version: Schema.String,
                condition: Schema.Any,
                created_at: Schema.DateFromString,
                transport: Schema.Union(
                  Schema.Struct({
                    method: Schema.Literal("webhook"),
                    callback: Schema.String,
                  }),
                  Schema.Struct({
                    method: Schema.Literal("websocket"),
                    session_id: Schema.String,
                    connected_at: Schema.DateFromString,
                  }),
                ),
              }),
            ),
            total: Schema.Int,
            total_cost: Schema.Int,
            max_total_cost: Schema.Int,
          }),
        ),
      )
      .add(
        HttpApiEndpoint.del(
          "deleteSubscription",
          "/subscriptions",
        ).setUrlParams(Schema.Struct({ id: Schema.String })),
      )
      .prefix("/eventsub"),
  )
  .add(
    HttpApiGroup.make("users")
      .add(
        HttpApiEndpoint.get("getUsers", "/")
          .setUrlParams(
            Schema.Struct({
              id: Schema.optional(Schema.Array(Schema.String)),
              login: Schema.optional(Schema.Array(Schema.String)),
            }),
          )
          .addSuccess(
            Schema.Array(
              Schema.Struct({
                id: Schema.String,
                login: Schema.String,
              }),
            ),
          ),
      )
      .prefix("/users"),
  ) {}
