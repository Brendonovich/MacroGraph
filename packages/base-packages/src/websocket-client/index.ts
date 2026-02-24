import { Effect, Option, Schema as S } from "effect";
import { Package, PackageEngine, t } from "@macrograph/package-sdk";

import {
	ClientRpcs,
	ClientState,
	RuntimeRpcs,
	WebSocketResource,
} from "./shared";
import { Event, WebSocketUrl } from "./types";

export class EngineState extends S.Class<EngineState>("EngineState")({
	connections: S.Record({
		key: WebSocketUrl,
		value: S.Struct({ connectOnStartup: S.Boolean }),
	}),
}) {}

export class EngineDef extends PackageEngine.define({
	clientRpcs: ClientRpcs,
	runtimeRpcs: RuntimeRpcs,
	events: [Event.WebSocketMessage],
	clientState: ClientState,
	resources: [WebSocketResource],
	engineState: EngineState,
}) {}

const WebSocketProperty = {
	websocket: { name: "WebSocket", resource: WebSocketResource },
};

export default Package.define({ name: "WebSocket Client", engine: EngineDef })
	.addSchema("Send", {
		type: "exec",
		properties: WebSocketProperty,
		name: "Send Message",
		description: "Sends a message to a WebSocket connection.",
		io: (c) => ({ data: c.in.data("data", t.String, { name: "Data" }) }),
		run: function* ({ io, properties: { websocket } }) {
			yield* Effect.log("sending", io);
			yield* websocket.engine.SendMessage({
				url: websocket.value,
				data: io.data,
			});
		},
	})
	.addSchema("Message", {
		type: "event",
		properties: WebSocketProperty,
		name: "Message Received",
		description:
			"Fires when a message is received from a WebSocket connection.",
		event: (data, { properties: { websocket } }) =>
			Option.some(data).pipe(
				Option.filter(
					(data): data is Event.Any => data instanceof Event.WebSocketMessage,
				),
				Option.filter((data) => websocket.value === data.url),
			),
		io: (c) => ({ data: c.out.data("data", t.String, { name: "Data" }) }),
		run: ({ io, event }) => {
			io.data(event.data);
		},
	});
