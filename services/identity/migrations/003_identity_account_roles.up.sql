BEGIN;

CREATE TABLE identity.account_roles (
  account_id UUID NOT NULL REFERENCES identity.accounts (id) ON DELETE CASCADE,
  role_key TEXT NOT NULL CHECK (
    role_key IN ('student', 'expert', 'recruiter', 'admin')
  ),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, role_key)
);

CREATE INDEX account_roles_active_account_idx
  ON identity.account_roles (account_id, role_key)
  WHERE status = 'active';

CREATE TABLE identity.account_role_changes (
  change_id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES identity.accounts (id) ON DELETE CASCADE,
  role_key TEXT NOT NULL CHECK (
    role_key IN ('student', 'expert', 'recruiter', 'admin')
  ),
  previous_status TEXT CHECK (
    previous_status IS NULL OR previous_status IN ('active', 'inactive')
  ),
  new_status TEXT NOT NULL CHECK (new_status IN ('active', 'inactive')),
  actor_account_id UUID REFERENCES identity.accounts (id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX account_role_changes_account_time_idx
  ON identity.account_role_changes (account_id, changed_at DESC);

REVOKE ALL ON TABLE identity.account_roles FROM PUBLIC;
REVOKE ALL ON TABLE identity.account_role_changes FROM PUBLIC;

COMMIT;
