import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { env } from "~/env/server";

dotenv.config({
  path: ".env",
});

if ("DATABASE_URL" in process.env === false)
  throw new Error("'DATABASE_URL' not set in env");

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  driver: "pg",
  dbCredentials: {
    connectionString: env.DATABASE_URL,
  },
});
