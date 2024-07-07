import { type PropertyDef, createResourceType } from "@macrograph/runtime";
import type { Pkg } from ".";

export const DiscordAccount = createResourceType({
	name: "Discord Account",
	sources: (pkg: Pkg) => {
		const allAccounts = [...pkg.ctx!.auth.accounts];

		return allAccounts
			.map(([id, data]) => {
				const d = data();
				if (!d) return;
				return [id, d] as const;
			})
			.filter(Boolean)
			.map(([userId, account]) => ({
				id: userId,
				display: account.data.username,
				value: account,
			}));
	},
});

export const accountProperty = {
	name: "Discord Account",
	resource: DiscordAccount,
} satisfies PropertyDef;

export const defaultProperties = { account: accountProperty };

export const DiscordBot = createResourceType({
	name: "Discord Bot",
	sources: (pkg: Pkg) => {
		const allBots = [...pkg.ctx!.auth.bots];

		return allBots
			.map(([id, data]) => {
				const d = data();
				if (!d) return;
				return [id, d] as const;
			})
			.filter(Boolean)
			.map(([userId, account]) => ({
				id: userId,
				display: account.data.username,
				value: account,
			}));
	},
});

export const botProperty = {
	name: "Discord Bot",
	resource: DiscordBot,
} satisfies PropertyDef;
