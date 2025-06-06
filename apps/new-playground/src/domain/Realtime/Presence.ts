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
import { NodeId } from "../Node/data";

const colours = [
  "#BC4D80",
  "#4A7A5B",
  "#9C3FAB",
  "#6C399F",
  "#4A8BB6",
  "#A056A5",
  "#463567",
  "#6B589A",
  "#6D69AA",
  "#D93939",
  "#5AAB5A",
  "#B05481",
  "#438B8C",
  "#5F7BAB",
  "#659960",
  "#A056A0",
  "#537BAF",
  "#BB6064",
  "#4F8559",
  "#AF6B91",
];

export class RealtimePresence extends Effect.Service<RealtimePresence>()(
  "RealtimePresence",
  {
    effect: Effect.gen(function* () {
      const clients = yield* SubscriptionRef.make<
        Record<
          RealtimeConnectionId,
          {
            name: string;
            colour: string;
            mouse?: { graph: GraphId; x: number; y: number };
            selection?: { graph: GraphId; nodes: Array<NodeId> };
          }
        >
      >({});
      console.log({ clients });

      return {
        registerToScope: Effect.gen(function* () {
          const connection = yield* RealtimeConnection;
          yield* SubscriptionRef.update(clients, (c) => ({
            ...c,
            [connection.id]: {
              name: `${faker.word.adjective()} ${faker.word.noun()}`,
              colour: colours[Math.floor(Math.random() * 20)],
            },
          }));

          yield* Scope.addFinalizer(
            yield* Scope.Scope,

            SubscriptionRef.update(clients, (s) => {
              console.log(`removing ${connection.id}`);
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
            [connection.id]: c[connection.id]
              ? {
                  ...c[connection.id],
                  mouse: { graph: graphId, ...position },
                }
              : undefined,
          }));
        }),
        setSelection: Effect.fn(function* (
          ...args: [] | [graphId: GraphId, nodes: Array<NodeId>]
        ) {
          const connection = yield* RealtimeConnection;

          yield* SubscriptionRef.update(clients, (c) => ({
            ...c,
            [connection.id]: c[connection.id]
              ? {
                  ...c[connection.id],
                  selection:
                    args.length === 0
                      ? undefined
                      : { graph: args[0], nodes: args[1] },
                }
              : c[connection.id],
          }));
        }),
      };
    }),
  },
) {}
