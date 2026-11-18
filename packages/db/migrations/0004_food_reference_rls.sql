-- Food reference data is shared: anyone signed in can read it; only the server
-- (service role) imports or corrects it.
ALTER TABLE food_sources ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY food_sources_read ON food_sources FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY foods_read ON foods FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
ALTER TABLE food_nutrients ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY food_nutrients_read ON food_nutrients FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
ALTER TABLE food_portions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY food_portions_read ON food_portions FOR SELECT TO authenticated USING (true);
