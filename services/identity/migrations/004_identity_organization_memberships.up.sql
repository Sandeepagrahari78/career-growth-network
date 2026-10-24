BEGIN;

CREATE TABLE identity.organization_memberships (
  account_id UUID NOT NULL REFERENCES identity.accounts (id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'revoked')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, organization_id)
);

CREATE INDEX organization_memberships_org_status_account_idx
  ON identity.organization_memberships (organization_id, status, account_id);

CREATE TABLE identity.organization_membership_changes (
  change_id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES identity.accounts (id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  previous_status TEXT CHECK (
    previous_status IS NULL OR previous_status IN ('pending', 'approved', 'revoked')
  ),
  new_status TEXT NOT NULL CHECK (new_status IN ('pending', 'approved', 'revoked')),
  actor_account_id UUID REFERENCES identity.accounts (id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX organization_membership_changes_account_org_time_idx
  ON identity.organization_membership_changes
    (account_id, organization_id, changed_at DESC);

REVOKE ALL ON TABLE identity.organization_memberships FROM PUBLIC;
REVOKE ALL ON TABLE identity.organization_membership_changes FROM PUBLIC;

COMMIT;
