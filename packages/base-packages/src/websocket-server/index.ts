/** biome-ignore-all lint/correctness/useYield: generator functions in this file intentionally don't always yield */
import { Option, Schema as S } from "effect";
import { Package, PackageEngine, t } from "@macrograph/package-sdk";

import { ClientRpcs, ClientState, RuntimeRpcs, ServerResource } from "./shared";
import { ClientId, Event } from "./types";

export class EngineState extends S.Class<EngineState>("EngineState")({
	servers: S.Record({
		key: S.String,
		value: S.Struct({
			autoStart: S.Boolean,
			host: S.optional(S.String),
			displayName: S.optional(S.String),
		}),
	}),
}) {}

export class EngineDef extends PackageEngine.define({
	clientRpcs: ClientRpcs,
	runtimeRpcs: RuntimeRpcs,
	events: [
		Event.ClientConnected,
		Event.ClientDisconnected,
		Event.MessageReceived,
	],
	clientState: ClientState,
	resources: [ServerResource],
	engineState: EngineState,
}) {}

const ServerProperty = { server: { name: "Server", resource: ServerResource } };

export default Package.define({ name: "WebSocket Server", engine: EngineDef })
	.addSchema("ClientConnected", {
		type: "event",
		properties: ServerProperty,
		name: "Client Connected",
		description: "Fires when a client connects to a WebSocket server.",
		event: (data, { properties: { server } }) =>
			Option.some(data).pipe(
				Option.filter(
					(data): data is Event.ClientConnected =>
						data._tag === "ClientConnected",
				),
				Option.filter((data) => data.port === server.value),
			),
		io: (c) => ({ client: c.out.data("client", t.Int, { name: "Client ID" }) }),
		run: ({ io, event }) => {
			io.client(event.client);
		},
	})
	.addSchema("ClientDisconnected", {
		type: "event",
		properties: ServerProperty,
		name: "Client Disconnected",
		description: "Fires when a client disconnects from a WebSocket server.",
		event: (data, { properties: { server } }) =>
			Option.some(data).pipe(
				Option.filter(
					(data): data is Event.ClientDisconnected =>
						data._tag === "ClientDisconnected",
				),
				Option.filter((data) => data.port === server.value),
			),
		io: (c) => ({ client: c.out.data("client", t.Int, { name: "Client ID" }) }),
		run: ({ io, event }) => {
			io.client(event.client);
		},
	})
	.addSchema("MessageReceived", {
		type: "event",
		properties: ServerProperty,
		name: "Message Received",
		description: "Fires when a message is received from a WebSocket client.",
		event: (data, { properties: { server } }) =>
			Option.some(data).pipe(
				Option.filter(
					(data): data is Event.MessageReceived =>
						data._tag === "MessageReceived",
				),
				Option.filter((data) => data.port === server.value),
			),
		io: (c) => ({
			client: c.out.data("client", t.Int, { name: "Client ID" }),
			data: c.out.data("data", t.String, { name: "Data" }),
		}),
		run: ({ io, event }) => {
			io.client(event.client);
			io.data(event.data);
		},
	})
	.addSchema("SendMessage", {
		type: "exec",
		properties: ServerProperty,
		name: "Send Message",
		description:
			"Sends a message to a specific client (provide Client ID) or broadcasts to all clients (leave Client ID empty).",
		io: (c) => ({
			client: c.in.data("client", t.Option(t.Int), { name: "Client ID" }),
			data: c.in.data("data", t.String, { name: "Data" }),
		}),
		run: function* ({ io, properties: { server } }) {
			const port = server.value;
			const clientId = io.client;
			// If clientId is 0, treat as broadcast (undefined)
			const client = Option.map(io.client, ClientId.make);
			const data = io.data;

			yield* server.engine.SendMessage({
				port,
				client: Option.getOrUndefined(client),
				data,
			});
		},
	});
