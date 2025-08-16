import { Context, Schema } from "effect";

export const Permission = Schema.Literal(
	"graphs:read",
	"graphs:write",
	"settings:read",
	"settings:write",
).annotations({ identifier: "Permission" });
export type Permission = typeof Permission.Type;

export class CurrentUser extends Context.Tag("CurrentUser")<
	CurrentUser,
	{ userId: string; permissions: Set<Permission> }
>() {}
