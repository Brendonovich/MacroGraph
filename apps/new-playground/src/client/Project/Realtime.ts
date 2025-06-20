import { Socket } from "@effect/platform";
import { Chunk, Effect, Option, Stream } from "effect";

import { ProjectEvent } from "../../shared";

export namespace ProjectRealtime {
  export const make = () =>
    Effect.gen(function* () {
      const socket = yield* Socket.makeWebSocket("/api/realtime");

      const stream = Stream.never.pipe(
        Stream.pipeThroughChannel(Socket.toChannel(socket)),
        Stream.decodeText(),
        Stream.map(
          (v) =>
            JSON.parse(v) as ProjectEvent | { type: "identify"; id: number },
        ),
      );

      const firstEvent = yield* Stream.take(stream, 1).pipe(
        Stream.runCollect,
        Effect.map(Chunk.get(0)),
        Effect.map(
          Option.getOrThrowWith(() => new Error("Identify event not received")),
        ),
      );

      if (firstEvent.type !== "identify")
        throw new Error(`Invalid first event: ${firstEvent.type}`);

      return { id: firstEvent.id, stream };
    });
}
