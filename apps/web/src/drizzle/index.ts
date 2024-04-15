import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "~/env/server";

import * as schema from "./schema";
export { schema };

// Disable prefetch as it is not supported for "Transaction" pool mode
export const connection = postgres(serverEnv.DATABASE_URL, { prepare: false });

export const db = drizzle(connection, { schema });
