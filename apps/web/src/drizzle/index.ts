import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import { env } from "~/env/server";

import * as schema from "./schema";
export { schema };

export const connection = neon(env.DATABASE_URL) as any;

export const db = drizzle(connection, { schema });
