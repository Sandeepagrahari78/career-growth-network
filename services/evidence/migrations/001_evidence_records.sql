-- Evidence owns this table in cgn_evidence. owner_id is an opaque Identity ID;
-- there is intentionally no cross-service database foreign key.
CREATE TABLE evidence_records (
  evidence_id uuid PRIMARY KEY,
  owner_id text NOT NULL CHECK (length(btrim(owner_id)) > 0),
  provenance_kind text NOT NULL
    CHECK (provenance_kind IN ('manual_claim', 'observed_source')),
  claim_text text,
  source_reference text,
  object_key text,
  verification_state text NOT NULL DEFAULT 'unverified'
    CHECK (verification_state IN ('unverified', 'verified')),
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility = 'private'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  archived_at timestamptz,
  CONSTRAINT evidence_records_provenance_payload_ck CHECK (
    (
      provenance_kind = 'manual_claim'
      AND claim_text IS NOT NULL
      AND length(btrim(claim_text)) > 0
      AND source_reference IS NULL
    )
    OR
    (
      provenance_kind = 'observed_source'
      AND source_reference IS NOT NULL
      AND length(btrim(source_reference)) > 0
    )
  ),
  CONSTRAINT evidence_records_private_object_reference_ck CHECK (
    object_key IS NULL
    OR (
      length(btrim(object_key)) > 0
      AND btrim(object_key) !~* '^[a-z][a-z0-9+.-]*://'
    )
  )
);

CREATE INDEX evidence_records_owner_active_created_idx
  ON evidence_records (owner_id, created_at DESC, evidence_id)
  WHERE archived_at IS NULL;
