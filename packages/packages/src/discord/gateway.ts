import { Maybe } from "@macrograph/option";
import type { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { createEventBus } from "@solid-primitives/event-bus";
import { createEventListener } from "@solid-primitives/event-listener";
import { ReactiveMap } from "@solid-primitives/map";
import type * as v from "valibot";

import type { Ctx, PersistedStore } from ".";
import type { BotAccount } from "./auth";
import { botProperty } from "./resource";
import type { GUILD_MEMBER_SCHEMA } from "./schemas";

export function createGateway([, setPersisted]: PersistedStore) {
	const sockets = new ReactiveMap<string, WebSocket>();

	const connectSocket = async (account: BotAccount) => {
		const botId = account.data.id;
		if (sockets.has(botId)) return;

		await new Promise<void>((res) => {
			const ws = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json");
			let state: "AwaitingHello" | "AwaitingHeartbeatAck" | "Connected" =
				"AwaitingHello";
			let seq: any;

			ws.onmessage = ({ data }) => {
				const payload = JSON.parse(data);

				const { op, d, s } = payload as any;
				seq = s;

				switch (op) {
					// OPCODE 10 GIVES the HEARTBEAT INTERVAL, SO YOU CAN KEEP THE CONNECTION ALIVE
					case 10: {
						if (state !== "AwaitingHello") return;

						const { heartbeat_interval } = d;
						ws.send(JSON.stringify({ op: 1, d: null }));

						setInterval(() => {
							ws.send(JSON.stringify({ op: 1, d: seq }));
						}, heartbeat_interval);

						state = "AwaitingHeartbeatAck";

						break;
					}
					case 11: {
						if (state !== "AwaitingHeartbeatAck") return;

						ws.send(
							JSON.stringify({
								op: 2,
								d: {
									token: account.token,
									intents: (1 << 9) + (1 << 15),
									properties: {
										os: "linux",
										browser: "Macrograph",
										device: "Macrograph",
									},
								},
							}),
						);

						state = "Connected";
						sockets.set(botId, ws);
						res();
						break;
					}
				}
			};
			ws.onclose = () => {
				sockets.delete(botId);
			};
		});

		setPersisted("bots", botId, { gateway: true });
	};

	const disconnectSocket = (botId: string) => {
		const ws = sockets.get(botId);
		if (!ws) return;

		setPersisted("bots", botId, { gateway: false });

		ws.close();
	};

	return { sockets, connectSocket, disconnectSocket };
}

export function register(pkg: Package, { gateway }: Ctx) {
	pkg.createSchema({
		name: "Discord Message",
		type: "event",
		properties: { bot: botProperty },
		createListener: ({ ctx, properties }) => {
			const bot = ctx.getProperty(properties.bot).expect("No bot available");
			const socket = Maybe(gateway.sockets.get(bot.data.id)).expect(
				"Gateway not conneted",
			);

			const bus = createEventBus<any>();

			createEventListener(socket, "message", (msg: MessageEvent) => {
				const { t, d } = JSON.parse(msg.data) as any;

				switch (t) {
					// IF MESSAGE IS CREATED, IT WILL LOG IN THE CONSOLE
					case "MESSAGE_CREATE":
						if (d.type !== 0) return;

						bus.emit(d);
				}
			});

			return bus;
		},
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			message: io.dataOutput({
				id: "message",
				name: "Message",
				type: t.string(),
			}),
			messageID: io.dataOutput({
				id: "messageID",
				name: "Message ID",
				type: t.string(),
			}),
			channelId: io.dataOutput({
				id: "channelId",
				name: "Channel ID",
				type: t.string(),
			}),
			username: io.dataOutput({
				id: "username",
				name: "Username",
				type: t.string(),
			}),
			userId: io.dataOutput({
				id: "userId",
				name: "User ID",
				type: t.string(),
			}),
			nickname: io.dataOutput({
				id: "nickname",
				name: "Nickname",
				type: t.option(t.string()),
			}),
			guildId: io.dataOutput({
				id: "guildId",
				name: "Guild ID",
				type: t.option(t.string()),
			}),
			roles: io.dataOutput({
				id: "roles",
				name: "Roles",
				type: t.list(t.string()),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.message, data.content);
			ctx.setOutput(io.messageID, data.id);
			ctx.setOutput(io.channelId, data.channel_id);
			ctx.setOutput(io.username, data.author.username);
			ctx.setOutput(io.userId, data.author.id);
			ctx.setOutput(
				io.nickname,
				Maybe(data.member as v.InferOutput<typeof GUILD_MEMBER_SCHEMA>).andThen(
					(v) => Maybe(v.nick),
				),
			);
			ctx.setOutput(io.guildId, Maybe(data.guild_id as string | null));
			ctx.setOutput(io.roles, data.member.roles);

			ctx.exec(io.exec);
		},
	});
}
