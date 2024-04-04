import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env/server";

import * as schema from "./schema";
export { schema };

// Disable prefetch as it is not supported for "Transaction" pool mode
export const connection = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(connection, { schema });
