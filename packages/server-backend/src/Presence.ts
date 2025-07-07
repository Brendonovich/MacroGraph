import { Effect, Scope, SubscriptionRef, Stream } from "effect";
import { faker } from "@faker-js/faker/locale/en_AU";
import { Graph, Node, Position } from "@macrograph/server-domain";
import { Presence } from "@macrograph/server-domain";

import { RealtimeConnection, RealtimeConnectionId } from "./Realtime";

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

export class PresenceState extends Effect.Service<PresenceState>()(
  "PresenceState",
  {
    effect: Effect.gen(function* () {
      const clients = yield* SubscriptionRef.make<
        Record<
          RealtimeConnectionId,
          {
            name: string;
            colour: string;
            mouse?: { graph: Graph.Id; x: number; y: number };
            selection?: { graph: Graph.Id; nodes: Array<Node.Id> };
          }
        >
      >({});

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
              delete s[connection.id];
              return { ...s };
            }),
          );
        }),
        changes: clients.changes.pipe(
          Stream.throttle({
            cost: (c) => c.length,
            duration: "10 millis",
            units: 1,
            strategy: "enforce",
          }),
        ),
        setMouse: Effect.fn(function* (graphId: Graph.Id, position: Position) {
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
          ...args: [] | [graphId: Graph.Id, nodes: Array<Node.Id>]
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

export const PresenceRpcsLive = Presence.Rpcs.toLayer(
  Effect.gen(function* () {
    const presence = yield* PresenceState;

    return {
      SetMousePosition: Effect.fn(function* (payload) {
        yield* presence.setMouse(payload.graph, payload.position);
      }),
      SetSelection: Effect.fn(function* ({ value }) {
        if (value === null) yield* presence.setSelection();
        else
          yield* presence.setSelection(
            value.graph,
            value.nodes as DeepWriteable<typeof value.nodes>,
          );
      }),
    };
  }),
);
