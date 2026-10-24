/**
 * Versioned internal AI prompt metadata. Prompt text and variable values are
 * private application data and must not be written to logs or telemetry.
 */
export interface AiPromptModelConfigurationV1 {
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiPromptProvenanceV1 {
  source: string;
  revision: string;
}

export interface AiPromptVersionMetadataV1 {
  promptId: string;
  promptVersion: number;
  modelConfig: AiPromptModelConfigurationV1;
  responseSchema: Readonly<Record<string, unknown>>;
  provenance: AiPromptProvenanceV1;
}

/** A complete versioned prompt definition supplied to the stateless resolver. */
export interface AiPromptTemplateVersionV1 extends AiPromptVersionMetadataV1 {
  template: string;
  variables: readonly string[];
}

export type AiPromptResolutionErrorCodeV1 =
  | "AI_PROMPT_VERSION_NOT_FOUND"
  | "AI_PROMPT_CONFIGURATION_INVALID"
  | "AI_PROMPT_VARIABLES_INVALID";
