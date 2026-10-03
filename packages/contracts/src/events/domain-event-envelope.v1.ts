export interface DomainEventEnvelopeV1<TPayload = unknown> {
  eventId: string;
  eventType: string;
  eventVersion: 1;
  occurredAt: string;
  producer: string;
  subjectId?: string;
  correlationId?: string;
  payload: TPayload;
}
