import { z } from "zod";

export const USER_SCHEMA = z.object({
  id: z.string(),
  username: z.string(),
  discriminator: z.string(),
  avatar: z.string().optional(),
  bot: z.boolean().optional(),
  system: z.boolean().optional(),
  mfa_enabled: z.boolean().optional(),
  banner: z.string().optional(),
  accent_color: z.number().optional(),
  locale: z.string().optional(),
  verified: z.boolean().optional(),
  email: z.string().optional(),
  flags: z.number().optional(),
  premium_type: z.number().optional(),
  public_flags: z.number().optional(),
});

export const GUILD_MEMBER_SCHEMA = z.object({
  user: USER_SCHEMA.optional(),
  nick: z.string().optional(),
  roles: z.array(z.string()),
});

export const ROLE_SCHEMA = z.object({
  color: z.number(),
  flags: z.number(),
  hoise: z.boolean(),
  id: z.string(),
  managed: z.boolean(),
  mentionable: z.boolean(),
  permissions: z.string(),
  position: z.number(),
  name: z.string(),
});
