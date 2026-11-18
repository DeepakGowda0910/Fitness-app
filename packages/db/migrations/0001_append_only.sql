-- Append-only tables: targets, consents, audit logs and check-in decisions are
-- history. A change is a new row, never an edit. Deletes are still allowed so
-- that account deletion (ON DELETE CASCADE) works.
CREATE OR REPLACE FUNCTION reject_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; insert a new row instead', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER consents_append_only BEFORE UPDATE ON consents FOR EACH ROW EXECUTE FUNCTION reject_update();
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_update();
--> statement-breakpoint
CREATE TRIGGER nutrition_targets_append_only BEFORE UPDATE ON nutrition_targets FOR EACH ROW EXECUTE FUNCTION reject_update();
--> statement-breakpoint
CREATE TRIGGER checkin_assessments_append_only BEFORE UPDATE ON checkin_assessments FOR EACH ROW EXECUTE FUNCTION reject_update();
