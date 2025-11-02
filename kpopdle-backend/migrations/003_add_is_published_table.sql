-- Add is_published column to idols / groups / companies tables

BEGIN TRANSACTION;

ALTER TABLE idols ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN is_published BOOLEAN DEFAULT FALSE;

COMMIT;