import { z } from "zod";

export const USER_SCHEMA = z.object({
  id: z.string(),
  username: z.string(),
  global_name: z.string().nullish(),
  discriminator: z.string(),
  avatar: z.string().nullish(),
  bot: z.boolean().nullish(),
  system: z.boolean().nullish(),
  mfa_enabled: z.boolean().nullish(),
  banner: z.string().nullish(),
  accent_color: z.number().nullish(),
  locale: z.string().nullish(),
  verified: z.boolean().nullish(),
  email: z.string().nullish(),
  flags: z.number().nullish(),
  premium_type: z.number().nullish(),
  public_flags: z.number().nullish(),
});

export const GUILD_MEMBER_SCHEMA = z.object({
  user: USER_SCHEMA.optional(),
  nick: z.string().optional(),
  roles: z.array(z.string()),
});

export const ROLE_SCHEMA = z.object({
  color: z.number(),
  flags: z.number(),
  hoist: z.boolean(),
  id: z.string(),
  managed: z.boolean(),
  mentionable: z.boolean(),
  permissions: z.string(),
  position: z.number(),
  name: z.string(),
});
