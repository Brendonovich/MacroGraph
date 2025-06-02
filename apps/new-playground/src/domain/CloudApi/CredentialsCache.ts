import { Effect, Cache } from "effect";
import { CloudAPIClient } from "./ApiClient";

export class CredentialsCache extends Effect.Service<CredentialsCache>()(
  "CredentialsCache",
  {
    effect: Effect.gen(function* () {
      const apiClient = yield* CloudAPIClient;

      const credentialsCache = yield* Cache.make({
        capacity: 1,
        timeToLive: "1 minute",
        lookup: (_: void) => apiClient.getCredentials(),
      });

      return credentialsCache;
    }),
    dependencies: [CloudAPIClient.Default],
  },
) {}
