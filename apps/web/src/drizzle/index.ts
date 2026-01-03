import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "~/env/server";

import * as schema from "./schema";
export { schema };

function createConnection() {
	return postgres(serverEnv().DATABASE_URL, { prepare: false });
}

let _connection: ReturnType<typeof createConnection> | undefined;

// Disable prefetch as it is not supported for "Transaction" pool mode
export const connection = () => {
	if (!_connection) _connection = createConnection();
	return _connection;
};

function createDb() {
	return drizzle(connection(), { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export const db = () => {
	if (!_db) _db = createDb();
	return _db;
};
