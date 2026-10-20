CREATE TABLE identity.oidc_login_transactions (
  state_hash text PRIMARY KEY CHECK (state_hash ~ '^[0-9a-f]{64}$'),
  browser_binding_hash text NOT NULL CHECK (browser_binding_hash ~ '^[0-9a-f]{64}$'),
  nonce_ciphertext text NOT NULL,
  code_verifier_ciphertext text NOT NULL,
  login_method text NOT NULL CHECK (login_method IN ('email_password', 'google')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX oidc_login_transactions_expiry_idx
  ON identity.oidc_login_transactions (expires_at);

CREATE TABLE identity.auth_sessions (
  session_id_hash text PRIMARY KEY CHECK (session_id_hash ~ '^[0-9a-f]{64}$'),
  account_id uuid NOT NULL REFERENCES identity.accounts (id) ON DELETE CASCADE,
  refresh_token_ciphertext text,
  id_token_ciphertext text NOT NULL,
  authenticated_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > authenticated_at)
);

CREATE INDEX auth_sessions_account_expiry_idx
  ON identity.auth_sessions (account_id, expires_at);
