import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";

import { db, schema } from "./drizzle";

const adapter = new DrizzlePostgreSQLAdapter(db, schema.sessions, schema.users);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// set to `true` when using HTTPS
			secure: import.meta.env.PROD,
		},
	},
	getUserAttributes: (attributes: any) => {
		return {
			// we don't need to expose the hashed password!
			email: attributes.email,
		};
	},
});

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
	}

	interface DatabaseUserAttributes {
		email: string;
	}
}
