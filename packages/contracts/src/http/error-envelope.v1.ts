export interface ErrorEnvelopeV1 {
  error: {
    /** Stable machine-readable identifier; clients must tolerate unknown values. */
    code: string;
    /** Safe, user-facing summary. Never include exception or infrastructure details. */
    message: string;
    /** Correlates the response with the x-request-id response header. */
    requestId?: string;
    /** Optional allow-listed, non-sensitive context; raw exception data is forbidden. */
    details?: Record<string, unknown>;
  };
}
