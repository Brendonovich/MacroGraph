import { z } from "zod";

export const USER_SCHEMA = z.object({
  username: z.string(),
  display_name: z.string().nullable(),
  avatar: z.string().nullable(),
  banner: z.string().nullable(),
});

export const GUILD_MEMBER_SCHEMA = z.object({
  user: USER_SCHEMA,
  nick: z.string(),
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
