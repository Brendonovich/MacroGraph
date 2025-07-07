import { Effect, Stream } from "effect";
import { SubscribableCache } from "@macrograph/domain";

import { CloudAPIClient } from "./ApiClient";

export class CredentialsCache extends Effect.Service<CredentialsCache>()(
  "CredentialsCache",
  {
    effect: Effect.gen(function* () {
      const { api, token } = yield* CloudAPIClient;

      const credentialsCache = yield* SubscribableCache.make({
        capacity: 1,
        timeToLive: "1 minute",
        lookup: api.getCredentials(),
      });

      yield* token.changes.pipe(
        Stream.runForEach(() =>
          credentialsCache.refresh.pipe(Effect.catchAll(() => Effect.void)),
        ),
        Effect.fork,
      );

      return credentialsCache;
    }),
    dependencies: [CloudAPIClient.Default],
  },
) {}
