CREATE TEMP TABLE cgn_migration_smoke (
  marker text NOT NULL
);

INSERT INTO cgn_migration_smoke (marker)
VALUES ('migration-ok');

DO $$
BEGIN
  IF (SELECT count(*) FROM cgn_migration_smoke WHERE marker = 'migration-ok') <> 1 THEN
    RAISE EXCEPTION 'migration smoke verification failed';
  END IF;
END
$$;
