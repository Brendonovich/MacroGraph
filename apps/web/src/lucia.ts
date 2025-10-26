import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";

import { db, schema } from "./drizzle";

function createLucia() {
	const adapter = new DrizzlePostgreSQLAdapter(
		db(),
		schema.sessions as any,
		schema.users as any,
	);

	return new Lucia(adapter, {
		sessionCookie: {
			attributes: {
				// set to `true` when using HTTPS
				secure: import.meta.env.PROD,
			},
		},
		getUserAttributes: (attributes: { email: string }) => {
			return {
				// we don't need to expose the hashed password!
				email: attributes.email,
			};
		},
	});
}

let _lucia: ReturnType<typeof createLucia> | undefined;

export const lucia = () => {
	if (!_lucia) _lucia = createLucia();
	return _lucia;
};

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: { email: string };
	}

	interface UserAttributes {
		email: string;
	}
}
