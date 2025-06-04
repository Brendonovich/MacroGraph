import { Effect, SubscriptionRef } from "effect";
import { CloudAPIClient } from "./ApiClient";

export class CloudApiAuthState extends Effect.Service<CloudApiAuthState>()(
  "Auth",
  {
    effect: Effect.gen(function* () {
      const apiClient = yield* CloudAPIClient;
      const auth = yield* SubscriptionRef.make<null | { id: string }>(null);

      const refetch = Effect.gen(function* () {
        const user = yield* apiClient.getUser();
        console.log({ user });
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
