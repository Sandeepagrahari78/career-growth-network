/**
 * Internal provider boundary for AI orchestration. Prompt and result content
 * are private application data and must not be written to logs or telemetry.
 */
export interface AiGenerationRequestV1 {
  prompt: string;
}

export interface AiGenerationResultV1 {
  text: string;
}

export interface AiProviderV1 {
  generate(
    request: AiGenerationRequestV1,
    options: { signal: AbortSignal },
  ): Promise<AiGenerationResultV1>;
}

export type AiOrchestrationErrorCodeV1 =
  | 'AI_REQUEST_TIMEOUT'
  | 'AI_REQUEST_CANCELLED'
  | 'AI_PROVIDER_FAILURE';
