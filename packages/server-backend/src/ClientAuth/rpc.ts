import { HttpClient, HttpClientRequest } from "@effect/platform";
import {
  Config,
  Effect,
  Mailbox,
  Option,
  Schedule,
  SubscriptionRef,
} from "effect";
import * as Jose from "jose";
import { ClientAuth, CloudAuth } from "@macrograph/server-domain";

import { CloudAPIClient } from "../CloudApi/ApiClient";
import { RealtimeConnection } from "../Realtime";

export const ClientAuthRpcsLive = ClientAuth.Rpcs.toLayer(
  Effect.gen(function* () {
    const { api, makeClient } = yield* CloudAPIClient;

    return {
      ClientLogin: Effect.fn(function* () {
        const mailbox = yield* Mailbox.make<ClientAuth.CloudLoginEvent>();

        yield* Effect.gen(function* () {
          const data = yield* api
            .createDeviceCodeFlow()
            .pipe(Effect.catchAll(() => new CloudAuth.CloudApiError()));

          yield* mailbox.offer({
            type: "started",
            verificationUrlComplete: data.verification_uri_complete,
          });

          const grant = yield* api
            .performAccessTokenGrant({
              urlParams: {
                device_code: data.device_code,
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
              },
            })
            .pipe(
              Effect.catchAll((error) => {
                if (error._tag === "DeviceFlowError") return Effect.fail(error);
                return Effect.dieMessage(
                  "Failed to perform access token grant",
                );
              }),
              Effect.retry({
                schedule: Schedule.fixed(3000),
                while: (error) => error.code === "authorization_pending",
              }),
              Effect.orDie,
            );

          console.log({ grant });

          const userApi = yield* makeClient({
            transformClient: HttpClient.mapRequest(
              HttpClientRequest.setHeader(
                "Authorization",
                `Bearer ${grant.access_token}`,
              ),
            ),
          });

          const { jwt } = yield* userApi
            .getUserJwt()
            .pipe(Effect.tapError(Effect.log));

          yield* mailbox.offer({ type: "finished", jwt });
        }).pipe(Effect.forkScoped);

        return mailbox;
      }),
      Identify: Effect.fn(function* (payload) {
        const connection = yield* RealtimeConnection;

        const publicKey = yield* Config.string("JWT_PUBLIC_KEY").pipe(
          Effect.tap(Effect.log),
          Effect.andThen((v) =>
            Effect.promise(() =>
              Jose.importSPKI(v.replaceAll("\\n", "\n"), "RS256"),
            ),
          ),
          Effect.orDie,
        );

        yield* Effect.promise(() => Jose.jwtVerify(payload.jwt, publicKey));

        yield* connection.authJwt.pipe(
          SubscriptionRef.set(Option.some(payload.jwt)),
        );
      }),
    };
  }),
);
