import { Socket } from "@effect/platform";
import { BrowserSocket } from "@effect/platform-browser";
import type { ProjectEvent } from "@macrograph/server-domain";
import { Chunk, Effect, Layer, Option, Stream } from "effect";

export class ProjectRealtime extends Effect.Service<ProjectRealtime>()(
	"ProjectRealtime",
	{
		scoped: Effect.gen(function* () {
			const socket = yield* Socket.Socket;

			const pull = yield* Stream.never.pipe(
				Stream.pipeThroughChannel(Socket.toChannel(socket)),
				Stream.decodeText(),
				Stream.map(
					(v) =>
						JSON.parse(v) as
							| ProjectEvent
							| { type: "identify"; id: number; token: string },
				),
				Stream.toPull,
			);

			const firstEvent = yield* pull.pipe(
				Effect.map(Chunk.get(0)),
				Effect.map(
					Option.getOrThrowWith(() => new Error("Identify event not received")),
				),
			);

			if (firstEvent.type !== "identify")
				throw new Error(`Invalid first event: ${firstEvent.type}`);

			return {
				id: firstEvent.id,
				token: firstEvent.token,
				stream: Stream.fromPull(Effect.sync(() => pull)),
			};
		}),
		dependencies: [
			Socket.layerWebSocket("/api/realtime").pipe(
				Layer.provide(BrowserSocket.layerWebSocketConstructor),
			),
		],
	},
) {}
