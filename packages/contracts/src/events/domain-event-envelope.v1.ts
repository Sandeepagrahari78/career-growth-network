/**
 * Stable metadata shared by domain events across CGN bounded contexts.
 *
 * Version 1 requires all fields below except subjectId and correlationId.
 * Producers must encode occurredAt as an RFC 3339 date-time. Consumers must
 * reject unsupported eventVersion values and ignore unknown additive envelope
 * fields so optional metadata can be added without changing the major version.
 * Domain-specific payload shape remains owned by each producer contract.
 */
export interface DomainEventEnvelopeV1<TPayload = unknown> {
  eventId: string;
  eventType: string;
  /** Envelope schema version. A new breaking envelope shape requires a new version. */
  eventVersion: 1;
  /** RFC 3339 date-time at which the producer says the event occurred. */
  occurredAt: string;
  producer: string;
  /** Optional identifier of the subject resource, as defined by its owner. */
  subjectId?: string;
  /** Optional cross-service request or workflow correlation identifier. */
  correlationId?: string;
  payload: TPayload;
}
