-- 010_source_declaration_registration_scope.sql
-- GAP-027: use the existing scope column to record registration acceptance.

-- Up
DO $migration$
DECLARE
  matching_checks integer;
  check_names name[];
BEGIN
  SELECT count(*), array_agg(conname)
    INTO matching_checks, check_names
  FROM pg_constraint
  WHERE conrelid = 'source_declarations'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%scope%'
    AND pg_get_constraintdef(oid) LIKE '%ingest%'
    AND pg_get_constraintdef(oid) LIKE '%publish%'
    AND pg_get_constraintdef(oid) LIKE '%export%';

  IF matching_checks <> 1 THEN
    RAISE EXCEPTION 'Expected one source_declarations scope check, found %', matching_checks;
  END IF;

  EXECUTE format('ALTER TABLE source_declarations DROP CONSTRAINT %I', check_names[1]);
END
$migration$;

ALTER TABLE source_declarations
  ADD CONSTRAINT source_declarations_scope_check
  CHECK (scope IN ('ingest', 'publish', 'export', 'register'));

-- Down
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM source_declarations WHERE scope = 'register') THEN
    RAISE EXCEPTION 'Cannot remove register scope while registration declarations exist';
  END IF;

  ALTER TABLE source_declarations
    DROP CONSTRAINT IF EXISTS source_declarations_scope_check;
  ALTER TABLE source_declarations
    ADD CONSTRAINT source_declarations_scope_check
    CHECK (scope IN ('ingest', 'publish', 'export'));
END
$migration$;
