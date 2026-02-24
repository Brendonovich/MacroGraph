import { Schema as S } from "effect";

export const Port = S.Number.pipe(S.brand("Port"));
export type Port = typeof Port.Type;

export const ServerId = S.String.pipe(S.brand("ServerId"));
export type ServerId = typeof ServerId.Type;

export const ClientId = S.Number.pipe(S.brand("ClientId"));
export type ClientId = typeof ClientId.Type;

export namespace Event {
	export class ClientConnected extends S.TaggedClass<ClientConnected>()(
		"ClientConnected",
		{ port: Port, client: ClientId },
	) {}

	export class ClientDisconnected extends S.TaggedClass<ClientDisconnected>()(
		"ClientDisconnected",
		{ port: Port, client: ClientId },
	) {}

	export class MessageReceived extends S.TaggedClass<MessageReceived>()(
		"MessageReceived",
		{ port: Port, client: ClientId, data: S.String },
	) {}

	export const Any = S.Union(
		ClientConnected,
		ClientDisconnected,
		MessageReceived,
	);
	export type Any = S.Schema.Type<typeof Any>;
}
