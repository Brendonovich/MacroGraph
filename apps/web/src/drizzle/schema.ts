import type { OAUTH_TOKEN } from "@macrograph/api-contract";
import {
	boolean,
	integer,
	json,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
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

// API Call Management Tables
export const httpMethodEnum = pgEnum("HttpMethod", [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"HEAD",
	"OPTIONS",
]);

export const authTypeEnum = pgEnum("AuthType", [
	"none",
	"bearer",
	"basic",
	"api_key",
	"oauth2",
]);

export const apiEnvironments = pgTable("api_environments", {
	id: serial("id").primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	variables: json("variables").$type<Record<string, string>>().notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apiCallLogs = pgTable("api_call_logs", {
	id: serial("id").primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	workflowId: integer("workflow_id"),
	name: varchar("name", { length: 255 }),
	method: httpMethodEnum("method").notNull(),
	url: text("url").notNull(),
	headers: json("headers").$type<Record<string, string>>(),
	authType: authTypeEnum("auth_type").notNull().default("none"),
	authConfig: json("auth_config").$type<Record<string, any>>(),
	requestBody: json("request_body"),
	responseStatus: integer("response_status"),
	responseHeaders: json("response_headers").$type<Record<string, string>>(),
	responseBody: json("response_body"),
	responseTime: integer("response_time"), // milliseconds
	error: text("error"),
	timestamp: timestamp("timestamp").notNull().defaultNow(),
	environmentId: integer("environment_id"),
});

export const apiWorkflows = pgTable("api_workflows", {
	id: serial("id").primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	steps: json("steps").$type<
		Array<{
			id: string;
			name: string;
			method: string;
			url: string;
			headers?: Record<string, string>;
			authType: string;
			authConfig?: Record<string, any>;
			body?: any;
			extractVariables?: Record<string, string>; // JSONPath expressions
			condition?: {
				field: string; // JSONPath to field
				operator: "eq" | "neq" | "gt" | "lt" | "contains";
				value: any;
			};
		}>
	>().notNull(),
	environmentId: integer("environment_id"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
