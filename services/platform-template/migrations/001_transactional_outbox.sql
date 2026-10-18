-- Reference migration. Each service applies this to its own database through
-- its service-owned migration job; never share a database across services.
CREATE TABLE cgn_outbox_events (
  event_id text PRIMARY KEY CHECK (length(event_id) > 0),
  envelope jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_expires_at timestamptz,
  published_at timestamptz,
  dead_lettered_at timestamptz,
  last_error_code text,
  CHECK (envelope ->> 'eventId' = event_id),
  CHECK (envelope ->> 'eventVersion' = '1')
);

CREATE INDEX cgn_outbox_events_ready_idx
  ON cgn_outbox_events (available_at, created_at, event_id)
  WHERE published_at IS NULL AND dead_lettered_at IS NULL;
