import { relations } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  int,
  json,
  datetime,
  primaryKey,
  timestamp,
} from "drizzle-orm/mysql-core";
import { z } from "zod";
import { TOKEN } from "~/schemas/twitch";

export const users = mysqlTable("user", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
});

export const sessions = mysqlTable("session", {
  id: varchar("id", {
    length: 255,
  }).primaryKey(),
  userId: varchar("user_id", {
    length: 255,
  }).notNull(),
  expiresAt: datetime("expires_at").notNull(),
});

export const oauthCredentials = mysqlTable(
  "oauth_credential",
  {
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
    token: json("token").$type<z.infer<typeof TOKEN>>().notNull(),
    displayName: varchar("display_name", { length: 255 }),
  },
  (table) => ({
    id: primaryKey({
      columns: [table.providerId, table.userId, table.providerUserId],
    }),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  oauthConnections: many(oauthCredentials),
}));

export const ClientType = {
  web: 0,
  desktop: 1,
};

export const projects = mysqlTable("project", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  clientType: int("client_type").notNull(),
  data: json("data"),
  lastUpdated: timestamp("last_updated").notNull(),
});

export const projectsRelations = relations(projects, ({ one }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
}));
