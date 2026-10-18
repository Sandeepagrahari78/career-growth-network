import type { DomainEventEnvelopeV1 } from "@cgn/contracts";

export interface OutboxQueryResult<Row> {
  rows: Row[];
}

export interface OutboxSqlClient {
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<OutboxQueryResult<Row>>;
}

export interface OutboxTransactionRunner {
  transaction<T>(work: (client: OutboxSqlClient) => Promise<T>): Promise<T>;
}

export interface OutboxPublisher {
  publish(event: DomainEventEnvelopeV1): Promise<void>;
}

interface ClaimedEvent {
  envelope: DomainEventEnvelopeV1;
  attempt_count: number;
}

export interface DispatchSummary {
  claimed: number;
  published: number;
  retried: number;
  deadLettered: number;
}

export const OUTBOX_MAX_BATCH_SIZE = 100;
export const OUTBOX_MAX_ATTEMPTS = 8;
export const OUTBOX_DEFAULT_LEASE_MS = 30_000;
const OUTBOX_MAX_LEASE_MS = 15 * 60_000;
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 5 * 60_000;

const INSERT_EVENT_SQL = `
  INSERT INTO cgn_outbox_events (event_id, envelope)
  VALUES ($1, $2::jsonb)
`;

const CLAIM_EVENTS_SQL = `
  WITH due_events AS (
    SELECT event_id
    FROM cgn_outbox_events
    WHERE published_at IS NULL
      AND dead_lettered_at IS NULL
      AND available_at <= clock_timestamp()
      AND (lease_expires_at IS NULL OR lease_expires_at <= clock_timestamp())
      AND attempt_count < $3
    ORDER BY created_at, event_id
    FOR UPDATE SKIP LOCKED
    LIMIT $1
  )
  UPDATE cgn_outbox_events AS outbox
  SET lease_expires_at = clock_timestamp() + ($2 * INTERVAL '1 millisecond'),
      attempt_count = outbox.attempt_count + 1
  FROM due_events
  WHERE outbox.event_id = due_events.event_id
  RETURNING outbox.envelope, outbox.attempt_count
`;

const MARK_PUBLISHED_SQL = `
  UPDATE cgn_outbox_events
  SET published_at = clock_timestamp(),
      lease_expires_at = NULL,
      last_error_code = NULL
  WHERE event_id = $1
    AND published_at IS NULL
    AND dead_lettered_at IS NULL
  RETURNING event_id
`;

const RETRY_EVENT_SQL = `
  UPDATE cgn_outbox_events
  SET available_at = $2,
      lease_expires_at = NULL,
      last_error_code = $3
  WHERE event_id = $1
    AND published_at IS NULL
    AND dead_lettered_at IS NULL
  RETURNING event_id
`;

const DEAD_LETTER_EVENT_SQL = `
  UPDATE cgn_outbox_events
  SET dead_lettered_at = clock_timestamp(),
      lease_expires_at = NULL,
      last_error_code = $2
  WHERE event_id = $1
    AND published_at IS NULL
    AND dead_lettered_at IS NULL
  RETURNING event_id
`;

function assertEnvelope(
  value: DomainEventEnvelopeV1,
): asserts value is DomainEventEnvelopeV1 {
  if (
    !value ||
    typeof value.eventId !== "string" ||
    value.eventId.length === 0 ||
    typeof value.eventType !== "string" ||
    value.eventType.length === 0 ||
    value.eventVersion !== 1 ||
    typeof value.occurredAt !== "string" ||
    typeof value.producer !== "string" ||
    value.producer.length === 0 ||
    !value.payload ||
    typeof value.payload !== "object" ||
    Array.isArray(value.payload)
  ) {
    throw new TypeError("A valid domain.event.envelope.v1 event is required.");
  }

  if (!Number.isFinite(Date.parse(value.occurredAt))) {
    throw new TypeError("The event occurredAt must be a valid date-time.");
  }
}

function safeErrorCode(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z0-9_]{1,64}$/.test(error.code)
  ) {
    return error.code;
  }

  return "PUBLISH_FAILED";
}

function retryDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1), RETRY_MAX_MS);
}

export class TransactionalOutbox {
  constructor(
    private readonly transactions: OutboxTransactionRunner,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Call with the owning service's transaction client alongside its domain write. */
  async enqueue(
    transaction: OutboxSqlClient,
    event: DomainEventEnvelopeV1,
  ): Promise<void> {
    assertEnvelope(event);
    await transaction.query(INSERT_EVENT_SQL, [event.eventId, event]);
  }

  async claimBatch(
    limit: number,
    leaseMs = OUTBOX_DEFAULT_LEASE_MS,
  ): Promise<Array<{ event: DomainEventEnvelopeV1; attempt: number }>> {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > OUTBOX_MAX_BATCH_SIZE
    ) {
      throw new RangeError(
        `Outbox batch size must be between 1 and ${OUTBOX_MAX_BATCH_SIZE}.`,
      );
    }
    if (
      !Number.isInteger(leaseMs) ||
      leaseMs < 1 ||
      leaseMs > OUTBOX_MAX_LEASE_MS
    ) {
      throw new RangeError(
        "Outbox lease must be between 1 millisecond and 15 minutes.",
      );
    }

    return this.transactions.transaction(async (client) => {
      const result = await client.query<ClaimedEvent>(CLAIM_EVENTS_SQL, [
        limit,
        leaseMs,
        OUTBOX_MAX_ATTEMPTS,
      ]);
      return result.rows.map((row) => ({
        event: row.envelope,
        attempt: row.attempt_count,
      }));
    });
  }

  async markPublished(eventId: string): Promise<void> {
    await this.transactions.transaction((client) =>
      client.query(MARK_PUBLISHED_SQL, [eventId]).then(() => undefined),
    );
  }

  async dispatchBatch(
    publisher: OutboxPublisher,
    limit: number,
    leaseMs = OUTBOX_DEFAULT_LEASE_MS,
  ): Promise<DispatchSummary> {
    const claimed = await this.claimBatch(limit, leaseMs);
    const summary: DispatchSummary = {
      claimed: claimed.length,
      published: 0,
      retried: 0,
      deadLettered: 0,
    };

    for (const item of claimed) {
      try {
        await publisher.publish(item.event);
        await this.markPublished(item.event.eventId);
        summary.published += 1;
      } catch (error) {
        const code = safeErrorCode(error);
        await this.transactions.transaction(async (client) => {
          if (item.attempt >= OUTBOX_MAX_ATTEMPTS) {
            await client.query(DEAD_LETTER_EVENT_SQL, [
              item.event.eventId,
              code,
            ]);
            summary.deadLettered += 1;
            return;
          }

          const availableAt = new Date(
            this.now().getTime() + retryDelayMs(item.attempt),
          ).toISOString();
          await client.query(RETRY_EVENT_SQL, [
            item.event.eventId,
            availableAt,
            code,
          ]);
          summary.retried += 1;
        });
      }
    }

    return summary;
  }
}
