import {
  Effect,
  Scope,
  SubscriptionRef,
  HashMap,
  Arbitrary,
  FastCheck,
} from "effect";
import { faker } from "@faker-js/faker/locale/en_AU";

import { RealtimeConnection, RealtimeConnectionId } from "./Connection";
import { GraphId } from "../Graph/data";

export class RealtimePresence extends Effect.Service<RealtimePresence>()(
  "RealtimePresence",
  {
    effect: Effect.gen(function* () {
      const clients = yield* SubscriptionRef.make<
        Record<
          RealtimeConnectionId,
          { name: string; mouse?: { graph: GraphId; x: number; y: number } }
        >
      >({});

      return {
        registerToScope: Effect.gen(function* () {
          const connection = yield* RealtimeConnection;
          yield* SubscriptionRef.update(clients, (c) => ({
            ...c,
            [connection.id]: {
              name: `${faker.word.adjective()} ${faker.word.noun()}`,
            },
          }));

          yield* Scope.addFinalizer(
            yield* Scope.Scope,
            SubscriptionRef.update(clients, (s) => {
              delete s[connection.id];
              return { ...s };
            }),
          );
        }),
        changes: clients.changes,
        setMouse: Effect.fn(function* (
          graphId: GraphId,
          position: { x: number; y: number },
        ) {
          const connection = yield* RealtimeConnection;
          yield* SubscriptionRef.update(clients, (c) => ({
            ...c,
            [connection.id]: {
              ...c[connection.id],
              mouse: { graph: graphId, ...position },
            },
          }));
        }),
      };
    }),
  },
) {}
