-- Evidence owns this audit trail and lifecycle metadata in cgn_evidence.
ALTER TABLE evidence_records
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  ADD COLUMN create_idempotency_key text,
  ADD COLUMN object_revision text,
  ADD COLUMN object_checksum_sha256 char(64),
  ADD COLUMN object_content_type text,
  ADD COLUMN object_size_bytes bigint,
  ADD COLUMN object_validated_at timestamptz,
  ADD CONSTRAINT evidence_records_idempotency_key_ck CHECK (
    create_idempotency_key IS NULL
    OR create_idempotency_key ~ '^[A-Za-z0-9._~:-]{1,128}$'
  ),
  ADD CONSTRAINT evidence_records_object_validation_ck CHECK (
    (
      object_revision IS NULL
      AND object_checksum_sha256 IS NULL
      AND object_content_type IS NULL
      AND object_size_bytes IS NULL
      AND object_validated_at IS NULL
    )
    OR
    (
      object_key IS NOT NULL
      AND object_revision IS NOT NULL
      AND length(btrim(object_revision)) > 0
      AND object_checksum_sha256 IS NOT NULL
      AND object_checksum_sha256 ~ '^[0-9a-f]{64}$'
      AND object_content_type IS NOT NULL
      AND object_content_type IN ('application/pdf', 'image/jpeg', 'image/png')
      AND object_size_bytes IS NOT NULL
      AND object_size_bytes BETWEEN 1 AND 10485760
      AND object_validated_at IS NOT NULL
    )
  );

CREATE UNIQUE INDEX evidence_records_owner_idempotency_key_idx
  ON evidence_records (owner_id, create_idempotency_key)
  WHERE create_idempotency_key IS NOT NULL;

CREATE TABLE evidence_record_audit (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evidence_id uuid NOT NULL REFERENCES evidence_records (evidence_id),
  owner_id text NOT NULL CHECK (length(btrim(owner_id)) > 0),
  action text NOT NULL CHECK (action IN ('created', 'updated', 'archived')),
  revision integer NOT NULL CHECK (revision > 0),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX evidence_record_audit_record_time_idx
  ON evidence_record_audit (evidence_id, occurred_at, audit_id);

CREATE FUNCTION audit_evidence_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  action_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_name := 'created';
  ELSIF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
    action_name := 'archived';
  ELSE
    action_name := 'updated';
  END IF;

  INSERT INTO evidence_record_audit (evidence_id, owner_id, action, revision)
  VALUES (NEW.evidence_id, NEW.owner_id, action_name, NEW.revision);
  RETURN NEW;
END;
$$;

CREATE TRIGGER evidence_records_audit_mutations
AFTER INSERT OR UPDATE ON evidence_records
FOR EACH ROW EXECUTE FUNCTION audit_evidence_record_mutation();
