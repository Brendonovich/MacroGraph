import type { Credential } from "@macrograph/api-contract";
import { Maybe, type Option } from "@macrograph/option";
import type {
	Core,
	CreateIOFn,
	CreateNonEventSchema,
	MergeFnProps,
	Package,
	PropertyDef,
	RunProps,
	SchemaProperties,
} from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import type * as v from "valibot";

import type { Ctx } from ".";
import { createHTTPClient } from "../httpEndpoint";
import type { Account, BotAccount } from "./auth";
import { botProperty, defaultProperties } from "./resource";
import type { GUILD_MEMBER_SCHEMA, ROLE_SCHEMA, USER_SCHEMA } from "./schemas";
import { readBinaryFile } from "@tauri-apps/api/fs";

export type Requests = {
	[_: `POST /channels/${string}/messages`]: any;
	"GET /users/@me": v.InferOutput<typeof USER_SCHEMA>;
	[_: `GET /users/${string}`]: v.InferOutput<typeof USER_SCHEMA>;
	[_: `GET /guilds/${string}/members`]: any;
	[_: `GET /guilds/${string}/members/${string}`]: v.InferOutput<
		typeof GUILD_MEMBER_SCHEMA
	>;
	[_: `GET /guilds/${string}/roles`]: Array<v.InferOutput<typeof ROLE_SCHEMA>>;
};

type Auth = { type: "bot"; token: string } | { type: "cred"; cred: Credential };

export function createApi(core: Core) {
	return createHTTPClient<Requests, Auth>({
		root: "https://discord.com/api/v10",
		fetch: async (auth, url, args) => {
			const run = (auth: Auth) =>
				core
					.fetch(url, {
						...args,
						headers: {
							...args?.headers,
							"Content-Type": "application/json",
							Authorization:
								auth.type === "bot"
									? `Bot ${auth.token}`
									: `Bearer ${auth.cred.token.access_token}`,
						},
					})
					.then((res) => res.json());

			try {
				return await run(auth);
			} catch {
				if (auth.type === "bot") return;

				const newCredential = await core.refreshCredential(
					"discord",
					auth.cred.id,
				);
				return await run({ type: "cred", cred: newCredential });
			}
		},
	});
}

export type Api = ReturnType<typeof createApi>;

export function register(pkg: Package, { api }: Ctx, core: Core) {
	function createUserExecSchema<
		TProperties extends Record<string, PropertyDef> = Record<string, never>,
		TIO = void,
	>(
		s: Omit<
			CreateNonEventSchema<TProperties & typeof defaultProperties, TIO>,
			"type" | "createListener" | "run" | "createIO"
		> & {
			properties?: TProperties;
			run(
				props: RunProps<TProperties, TIO> & {
					account: Account;
				},
			): void | Promise<void>;
			createIO: MergeFnProps<
				CreateIOFn<TProperties, TIO>,
				{ account(): Option<Account> }
			>;
		},
	) {
		pkg.createSchema({
			...s,
			type: "exec",
			properties: defaultProperties as any,
			createIO(props) {
				const account = props.ctx.getProperty(
					props.properties.account as SchemaProperties<
						typeof defaultProperties
					>["account"],
				);

				return s.createIO({
					...props,
					account() {
						return account;
					},
				});
			},
			run(props) {
				const account = props.ctx
					.getProperty(
						props.properties.account as SchemaProperties<
							typeof defaultProperties
						>["account"],
					)
					.expect("No Discord account available!");

				return s.run({ ...props, account });
			},
		});
	}

	function createBotExecSchema<
		TProperties extends Record<string, PropertyDef> = Record<string, never>,
		TIO = void,
	>(
		s: Omit<
			CreateNonEventSchema<TProperties & typeof defaultProperties, TIO>,
			"type" | "createListener" | "run" | "createIO"
		> & {
			properties?: TProperties;
			createIO: MergeFnProps<
				CreateIOFn<TProperties, TIO>,
				{ bot(): Option<BotAccount> }
			>;
			run(
				props: RunProps<TProperties, TIO> & {
					bot: BotAccount;
				},
			): void | Promise<void>;
		},
	) {
		const properties = { bot: botProperty };

		pkg.createSchema({
			...s,
			type: "exec",
			properties: properties as any,
			createIO(props) {
				const bot = () =>
					props.ctx.getProperty(
						props.properties.bot as SchemaProperties<typeof properties>["bot"],
					);

				return s.createIO({
					...props,
					bot() {
						return bot();
					},
				});
			},
			run(props) {
				const bot = props.ctx
					.getProperty(
						props.properties.bot as SchemaProperties<typeof properties>["bot"],
					)
					.expect("No Discord bot available!");

				return s.run({ ...props, bot });
			},
		});
	}

	createBotExecSchema({
		name: "Send Discord Message",
		createIO: ({ io }) => ({
			message: io.dataInput({
				id: "message",
				name: "Message",
				type: t.string(),
			}),
			channelId: io.dataInput({
				id: "channelId",
				name: "Channel ID",
				type: t.string(),
			}),
			everyone: io.dataInput({
				id: "everyone",
				name: "Allow @everyone",
				type: t.bool(),
			}),
		}),
		async run({ ctx, io, bot }) {
			await api.call(
				`POST /channels/${ctx.getInput(io.channelId)}/messages`,
				{ type: "bot", token: bot.token },
				{
					body: JSON.stringify({
						content: ctx.getInput(io.message),
						allowed_mentions: {
							parse: ctx.getInput(io.everyone) ? ["everyone"] : [],
						},
					}),
				},
			);
		},
	});

	createUserExecSchema({
		name: "Get Discord User",
		createIO: ({ io }) => ({
			userId: io.dataInput({
				id: "userId",
				name: "User ID",
				type: t.string(),
			}),
			username: io.dataOutput({
				id: "username",
				name: "UserName",
				type: t.string(),
			}),
			avatarId: io.dataOutput({
				id: "avatarId",
				name: "Avatar ID",
				type: t.option(t.string()),
			}),
			bannerId: io.dataOutput({
				id: "bannerId",
				name: "Banner ID",
				type: t.option(t.string()),
			}),
		}),
		async run({ ctx, io, account }) {
			const response = await api.call(`GET /users/${ctx.getInput(io.userId)}`, {
				type: "cred",
				cred: account.credential,
			});

			ctx.setOutput(io.username, response.username);
			ctx.setOutput(io.avatarId, Maybe(response.avatar));
			ctx.setOutput(io.bannerId, Maybe(response.avatar));
		},
	});

	createUserExecSchema({
		name: "Get Discord Guild User",
		createIO: ({ io }) => ({
			guildId: io.dataInput({
				id: "guildId",
				name: "Guild ID",
				type: t.string(),
			}),
			userId: io.dataInput({
				id: "userId",
				name: "User ID",
				type: t.string(),
			}),
			username: io.dataOutput({
				id: "username",
				name: "UserName",
				type: t.option(t.string()),
			}),
			displayName: io.dataOutput({
				id: "displayName",
				name: "Display Name",
				type: t.option(t.string()),
			}),
			avatarId: io.dataOutput({
				id: "avatarId",
				name: "Avatar ID",
				type: t.option(t.string()),
			}),
			bannerId: io.dataOutput({
				id: "bannerId",
				name: "Banner ID",
				type: t.option(t.string()),
			}),
			nick: io.dataOutput({
				id: "nick",
				name: "Nickname",
				type: t.option(t.string()),
			}),
			roles: io.dataOutput({
				id: "roles",
				name: "Roles",
				type: t.list(t.string()),
			}),
		}),
		async run({ ctx, io, account }) {
			const response = await api.call(
				`GET /guilds/${ctx.getInput(io.guildId)}/members/${ctx.getInput(
					io.userId,
				)}`,
				{ type: "cred", cred: account.credential },
			);

			ctx.setOutput(io.username, Maybe(response.user?.username));
			ctx.setOutput(io.avatarId, Maybe(response.user?.avatar));
			ctx.setOutput(io.bannerId, Maybe(response.user?.banner));
			ctx.setOutput(io.nick, Maybe(response.nick));
			ctx.setOutput(io.roles, response.roles);
		},
	});

	createUserExecSchema({
		name: "Get Discord Role By Id",
		createIO: ({ io }) => ({
			guildId: io.dataInput({
				id: "guildId",
				name: "Guild ID",
				type: t.string(),
			}),
			roleIdIn: io.dataInput({
				id: "roleIdIn",
				name: "Role ID",
				type: t.string(),
			}),
			name: io.dataOutput({
				id: "name",
				name: "Name",
				type: t.string(),
			}),
			roleIdOut: io.dataOutput({
				id: "roleIdOut",
				name: "Role ID",
				type: t.string(),
			}),
			position: io.dataOutput({
				id: "position",
				name: "Position",
				type: t.int(),
			}),
			mentionable: io.dataOutput({
				id: "mentionable",
				name: "Mentionable",
				type: t.bool(),
			}),
			permissions: io.dataOutput({
				id: "permissions",
				name: "Permissions",
				type: t.string(),
			}),
		}),
		async run({ ctx, io, account }) {
			const roleId = ctx.getInput(io.roleIdIn);

			const roles = await api.call(
				`GET /guilds/${ctx.getInput(io.guildId)}/roles`,
				{ type: "cred", cred: account.credential },
			);

			const role = roles.find((role) => role.id === roleId);

			if (!role) return;

			ctx.setOutput(io.name, role.name);
			ctx.setOutput(io.roleIdOut, role.id);
			ctx.setOutput(io.position, role.position);
			ctx.setOutput(io.mentionable, role.mentionable);
			ctx.setOutput(io.permissions, role.permissions);
		},
	});

	pkg.createSchema({
		name: "Send Discord Webhook",
		type: "exec",
		createIO: ({ io }) => ({
			webhookUrl: io.dataInput({
				id: "webhookUrl",
				name: "Webhook URL",
				type: t.string(),
			}),
			content: io.dataInput({
				id: "content",
				name: "Message",
				type: t.option(t.string()),
			}),
			username: io.dataInput({
				id: "username",
				name: "Username",
				type: t.option(t.string()),
			}),
			avatarUrl: io.dataInput({
				id: "avatarUrl",
				name: "Avatar URL",
				type: t.option(t.string()),
			}),
			tts: io.dataInput({
				id: "tts",
				name: "TTS",
				type: t.bool(),
			}),
			fileLocation: io.dataInput({
				id: "fileLocation",
				name: "File Location",
				type: t.option(t.string()),
			}),
			status: io.dataOutput({
				id: "status",
				name: "Status",
				type: t.int(),
			}),
		}),
		async run({ ctx, io }) {
			const formData = new FormData();

			ctx.getInput(io.content).peek((v) => {
				formData.set("content", v);
			});
			ctx.getInput(io.avatarUrl).peek((v) => {
				formData.set("avatar_url", v);
			});
			ctx.getInput(io.username).peek((v) => {
				formData.set("username", v);
			});
			formData.set("tts", ctx.getInput(io.tts).toString());

			await ctx.getInput(io.fileLocation).peekAsync(async (v) => {
				formData.set(
					"files[0]",
					new Blob([await readBinaryFile(v)]),
					v.split(/[\/\\]/).at(-1),
				);
			});

			const response = await core.fetch(ctx.getInput(io.webhookUrl), {
				method: "POST",
				body: formData,
			});

			ctx.setOutput(io.status, response.status);
		},
	});
}
