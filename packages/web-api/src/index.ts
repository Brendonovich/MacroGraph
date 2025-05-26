import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiMiddleware,
} from "@effect/platform";
import { Context } from "effect";
import * as S from "effect/Schema";

export class CurrentSession extends Context.Tag("CurrentSession")<
  CurrentSession,
  {
    id: string;
    userId: string;
  }
>() {}

export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "Authentication",
  {
    provides: CurrentSession,
    failure: S.Union(
      HttpApiError.Forbidden,
      HttpApiError.BadRequest,
      HttpApiError.InternalServerError,
    ),
  },
) {}

export const OAUTH_TOKEN = S.Struct({
  access_token: S.String,
  expires_in: S.Number,
  refresh_token: S.optional(S.String),
  token_type: S.String,
});

export const CREDENTIAL = S.Struct({
  provider: S.String,
  id: S.String,
  displayName: S.NullOr(S.String),
  token: S.extend(OAUTH_TOKEN, S.Struct({ issuedAt: S.Number })),
});

export class Api extends HttpApi.make("api")
  .add(
    HttpApiGroup.make("api", { topLevel: true })
      .add(
        HttpApiEndpoint.get("getUser", "/user")
          .addSuccess(
            S.NullOr(
              S.Struct({
                id: S.String,
                email: S.String,
              }),
            ),
          )
          .addError(HttpApiError.InternalServerError)
          .addError(HttpApiError.BadRequest),
      )
      .add(
        HttpApiEndpoint.post(
          "refreshCredential",
          "/credentials/:providerId/:providerUserId/refresh",
        )
          .middleware(Authentication)
          .setPath(
            S.Struct({
              providerId: S.String,
              providerUserId: S.String,
            }),
          )
          .addSuccess(CREDENTIAL),
      )
      .add(
        HttpApiEndpoint.get("getCredentials", "/credentials")
          .middleware(Authentication)
          .addSuccess(S.Array(CREDENTIAL)),
      ),
  )
  .prefix("/api") {}
