import { Effect } from "effect";
import { Rpc, RpcGroup } from "@effect/rpc";
import * as S from "effect/Schema";

import { GraphId } from "../Graph/data";
import { NodeId } from "../Node/data";
import { DeepWriteable } from "../../types";
import { Presence } from "./Presence";

export const PresenceRpcs = RpcGroup.make(
  Rpc.make("SetMousePosition", {
    payload: S.Struct({
      graph: GraphId,
      position: S.Struct({ x: S.Number, y: S.Number }),
    }),
  }),
  Rpc.make("SetSelection", {
    payload: {
      value: S.NullOr(
        S.Struct({
          graph: GraphId,
          nodes: S.Array(NodeId),
        }),
      ),
    },
  }),
);

export const PresenceRpcsLive = PresenceRpcs.toLayer(
  Effect.gen(function* () {
    const presence = yield* Presence;

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
