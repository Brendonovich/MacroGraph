import type { OAUTH_TOKEN } from "@macrograph/api-contract";
import {
	json,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import type { z } from "zod";

export const users = pgTable("user", {
	id: varchar("id", { length: 255 }).primaryKey(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
});

export const sessions = pgTable("session", {
	id: varchar("id", {
		length: 255,
	}).primaryKey(),
	userId: varchar("user_id", {
		length: 255,
	}).notNull(),
	expiresAt: timestamp("expires_at").notNull(),
});

export const oauthCredentials = pgTable(
	"oauth_credential",
	{
		providerId: varchar("provider_id", { length: 255 }).notNull(),
		userId: varchar("user_id", { length: 255 }).notNull(),
		providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
		token: json("token").$type<z.infer<typeof OAUTH_TOKEN>>().notNull(),
		issuedAt: timestamp("token_created_at").notNull(),
		displayName: varchar("display_name", { length: 255 }),
	},
	(table) => ({
		id: primaryKey({
			columns: [table.providerId, table.userId, table.providerUserId],
		}),
	}),
);

// export const usersRelations = relations(users, ({ many }) => ({
//   oauthConnections: many(oauthCredentials),
// }));

export const clientTypeEnum = pgEnum("ClientType", ["web", "desktop"]);

export const projects = pgTable("project", {
	id: serial("id").primaryKey(),
	ownerId: varchar("owner_id", { length: 255 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	clientType: clientTypeEnum("client_type").notNull(),
	data: json("data"),
	lastUpdated: timestamp("last_updated").notNull(),
});

export const deviceCodeSessions = pgTable("device_code_sessions", {
	appId: varchar("app_id", { length: 255 }).notNull(),
	userCode: varchar("code", { length: 10 }).notNull(),
	deviceCode: varchar("device_code", { length: 255 }).primaryKey(),
	userId: varchar("user_id", { length: 255 }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oauthSessions = pgTable("oauth_sessions", {
	id: serial("id").primaryKey(),
	appId: varchar("app_id", { length: 255 }).notNull(),
	accessToken: varchar("access_token", { length: 255 }).notNull().unique(),
	refreshToken: varchar("refresh_token", { length: 255 }).notNull().unique(),
	expires: timestamp("expires").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
});

export const oauthApps = pgTable("oauth_apps", {
	pk: serial("pk").primaryKey(),
	id: varchar("id", { length: 255 }).notNull(),
	type: varchar("type", { enum: ["server"] }),
	ownerId: varchar("owner_id", { length: 255 }).notNull(),
});

export const serverRegistrationSessions = pgTable(
	"server_registration_sessions",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		userCode: varchar("userCode", { length: 10 }).notNull().unique(),
		userId: varchar("user_id", { length: 255 }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
);
