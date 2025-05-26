import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpServerResponse,
} from "@effect/platform";
import { Effect, Schema as S, Stream } from "effect";

import { EVENTSUB_CREATE_SUBSCRIPTION_BODY } from "./eventSub";

export class HelixApi extends HttpApi.make("helix")
  .prefix("/helix")
  .add(
    HttpApiGroup.make("eventSub")
      .add(
        HttpApiEndpoint.post("createSubscription", "/subscriptions")
          .setPayload(
            S.extend(
              EVENTSUB_CREATE_SUBSCRIPTION_BODY,
              S.Struct({
                transport: S.Union(
                  S.Struct({
                    method: S.Literal("websocket"),
                    session_id: S.String,
                  }),
                  S.Struct({ method: S.Literal("conduit"), conduit: S.String }),
                  S.Struct({
                    method: S.Literal("webhook"),
                    callback: S.String,
                    secret: S.String,
                  }),
                ),
              }),
            ),
          )
          .addSuccess(
            S.Struct({
              data: S.Array(
                S.Struct({
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
          S.Struct({
            data: S.Array(
              S.Struct({
                id: S.String,
                status: S.Literal("enabled", "websocket_disconnected"),
                type: S.String,
                version: S.String,
                condition: S.Any,
                created_at: S.DateFromString,
                transport: S.Union(
                  S.Struct({
                    method: S.Literal("webhook"),
                    callback: S.String,
                  }),
                  S.Struct({
                    method: S.Literal("websocket"),
                    session_id: S.String,
                    connected_at: S.DateFromString,
                  }),
                ),
              }),
            ),
            total: S.Int,
            total_cost: S.Int,
            max_total_cost: S.Int,
          }),
        ),
      )
      .add(
        HttpApiEndpoint.del(
          "deleteSubscription",
          "/subscriptions",
        ).setUrlParams(S.Struct({ id: S.String })),
      )
      .prefix("/eventsub"),
  )
  .add(
    HttpApiGroup.make("users")
      .add(
        HttpApiEndpoint.get("getUsers", "/")
          .setUrlParams(
            S.Struct({
              id: S.optional(S.Array(S.String)),
              login: S.optional(S.Array(S.String)),
            }),
          )
          .addSuccess(
            S.Array(
              S.Struct({
                id: S.String,
                login: S.String,
              }),
            ),
          ),
      )
      .prefix("/users"),
  ) {}
