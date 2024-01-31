import type { Config } from "drizzle-kit";
import { env } from "~/env/server";

export default {
  schema: "./src/drizzle/schema.ts",
  dbCredentials: {
    uri: env.DATABASE_URL,
  },
  driver: "mysql2",
} satisfies Config;
