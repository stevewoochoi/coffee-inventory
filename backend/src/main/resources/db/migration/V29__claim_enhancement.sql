-- V29: Claims enhancement - add estimated_resolve_date column

DROP PROCEDURE IF EXISTS add_claim_columns;
CREATE PROCEDURE add_claim_columns()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'claim' AND column_name = 'estimated_resolve_date') THEN
        ALTER TABLE claim ADD COLUMN estimated_resolve_date DATE NULL;
    END IF;
END;

CALL add_claim_columns();
DROP PROCEDURE IF EXISTS add_claim_columns;
