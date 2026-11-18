CREATE TYPE "public"."food_source_code" AS ENUM('IFCT_2017', 'USDA_FDC', 'OFF', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."food_state" AS ENUM('raw', 'cooked', 'processed');--> statement-breakpoint
CREATE TABLE "food_nutrients" (
	"food_id" uuid NOT NULL,
	"nutrient_code" text NOT NULL,
	"amount_per_100g" numeric(10, 3) NOT NULL,
	CONSTRAINT "amount_non_negative" CHECK ("food_nutrients"."amount_per_100g" >= 0)
);
--> statement-breakpoint
CREATE TABLE "food_portions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"food_id" uuid NOT NULL,
	"label" text NOT NULL,
	"grams" numeric(7, 1) NOT NULL,
	CONSTRAINT "grams_positive" CHECK ("food_portions"."grams" > 0)
);
--> statement-breakpoint
CREATE TABLE "food_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "food_source_code" NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"licence" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_sources_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"local_names" text[] DEFAULT '{}'::text[] NOT NULL,
	"food_group" text NOT NULL,
	"state" "food_state" DEFAULT 'raw' NOT NULL,
	"vegetarian" boolean NOT NULL,
	"eggetarian" boolean NOT NULL,
	"pescatarian" boolean NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_nutrients" ADD CONSTRAINT "food_nutrients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_portions" ADD CONSTRAINT "food_portions_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_source_id_food_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."food_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "food_nutrients_pk" ON "food_nutrients" USING btree ("food_id","nutrient_code");--> statement-breakpoint
CREATE UNIQUE INDEX "food_portions_label_uq" ON "food_portions" USING btree ("food_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_source_external_uq" ON "foods" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "foods_name_idx" ON "foods" USING btree ("name");