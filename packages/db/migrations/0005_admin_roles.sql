CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'admin');--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" "admin_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;