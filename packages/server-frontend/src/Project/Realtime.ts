import { Socket } from "@effect/platform";
import { BrowserSocket } from "@effect/platform-browser";
import type { ProjectEvent } from "@macrograph/server-domain";
import { Chunk, Effect, Option, Stream } from "effect";

import { ClientAuth } from "../ClientAuth";

export class ProjectRealtime extends Effect.Service<ProjectRealtime>()(
	"ProjectRealtime",
	{
		scoped: Effect.gen(function* () {
			const { jwt } = yield* ClientAuth;

			const params = new URLSearchParams();

			const _jwt = yield* jwt.get;

			if (Option.isSome(_jwt)) params.set("jwt", _jwt.value);

			const socket = yield* Socket.makeWebSocket(
				`/api/realtime?${params}`,
			).pipe(Effect.provide(BrowserSocket.layerWebSocketConstructor));

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
		dependencies: [ClientAuth.Default],
	},
) {}
