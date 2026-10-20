BEGIN;

CREATE SCHEMA identity;

REVOKE ALL ON SCHEMA identity FROM PUBLIC;

CREATE TABLE identity.accounts (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE identity.provider_subjects (
  issuer TEXT NOT NULL CHECK (issuer <> ''),
  subject TEXT NOT NULL CHECK (subject <> ''),
  account_id UUID NOT NULL REFERENCES identity.accounts (id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer, subject)
);

REVOKE ALL ON ALL TABLES IN SCHEMA identity FROM PUBLIC;

COMMIT;
