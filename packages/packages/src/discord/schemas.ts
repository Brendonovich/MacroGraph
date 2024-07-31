import * as v from "valibot";

const NullishString = v.nullish(v.string());
const NullishBoolean = v.nullish(v.boolean());
const NullishNumber = v.nullish(v.number());

export const USER_SCHEMA = v.object({
	id: v.string(),
	username: v.string(),
	global_name: NullishString,
	discriminator: v.string(),
	avatar: NullishString,
	bot: NullishBoolean,
	system: NullishBoolean,
	mfa_enabled: NullishBoolean,
	banner: NullishString,
	accent_color: NullishNumber,
	locale: NullishString,
	verified: NullishBoolean,
	email: NullishString,
	flags: NullishNumber,
	premium_type: NullishNumber,
	public_flags: NullishNumber,
});

export const GUILD_MEMBER_SCHEMA = v.object({
	user: v.optional(USER_SCHEMA),
	nick: v.optional(v.string()),
	roles: v.array(v.string()),
});

export const ROLE_SCHEMA = v.object({
	color: v.number(),
	flags: v.number(),
	hoist: v.boolean(),
	id: v.string(),
	managed: v.boolean(),
	mentionable: v.boolean(),
	permissions: v.string(),
	position: v.number(),
	name: v.string(),
});
