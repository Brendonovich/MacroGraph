import { Effect, SubscriptionRef } from "effect";
import { CloudAPIClient } from "./ApiClient";

export class CloudApiAuthState extends Effect.Service<CloudApiAuthState>()(
  "Auth",
  {
    effect: Effect.gen(function* () {
      const apiClient = yield* CloudAPIClient.api;
      const auth = yield* SubscriptionRef.make<null | {
        id: string;
        email: string;
      }>(null);

      const refetch = Effect.gen(function* () {
        const [user, resp] = yield* apiClient.getUser({ withResponse: true });
        yield* SubscriptionRef.set(auth, user);
      });

      yield* refetch.pipe(Effect.fork);

      return {
        get: auth.get,
        refetch,
        changes: auth.changes,
      };
    }),
    dependencies: [CloudAPIClient.Default],
  },
) {}
