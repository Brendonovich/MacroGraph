DO $$ BEGIN
 CREATE TYPE "ClientType" AS ENUM('web', 'desktop');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_credential" (
	"provider_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"token" json NOT NULL,
	"display_name" varchar(255),
	CONSTRAINT "oauth_credential_provider_id_user_id_provider_user_id_pk" PRIMARY KEY("provider_id","user_id","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"client_type" "ClientType" NOT NULL,
	"data" json,
	"last_updated" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"hashed_password" varchar(255) NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
