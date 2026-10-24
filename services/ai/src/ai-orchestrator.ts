import type {
  AiGenerationRequestV1,
  AiGenerationResultV1,
  AiOrchestrationErrorCodeV1,
  AiProviderV1,
  AiPromptModelConfigurationV1,
  AiPromptProvenanceV1,
  AiPromptResolutionErrorCodeV1,
  AiPromptTemplateVersionV1,
} from "@cgn/contracts";

export type AiOrchestrationOutcome =
  | "success"
  | "timeout"
  | "cancelled"
  | "provider_failure";

export interface AiOrchestrationLogEntry {
  event: "ai.orchestration.completed";
  outcome: AiOrchestrationOutcome;
  durationMs: number;
  errorCode?: AiOrchestrationErrorCodeV1;
}

export interface AiOrchestratorOptions {
  timeoutMs?: number;
  record?: (entry: AiOrchestrationLogEntry) => void;
}

const DEFAULT_TIMEOUT_MS = 10_000;

const SAFE_PROMPT_RESOLUTION_MESSAGES: Record<
  AiPromptResolutionErrorCodeV1,
  string
> = {
  AI_PROMPT_VERSION_NOT_FOUND:
    "The requested AI prompt version is unavailable.",
  AI_PROMPT_CONFIGURATION_INVALID: "The AI prompt configuration is invalid.",
  AI_PROMPT_VARIABLES_INVALID: "The AI prompt variables are invalid.",
};

export class AiPromptResolutionError extends Error {
  constructor(readonly code: AiPromptResolutionErrorCodeV1) {
    super(SAFE_PROMPT_RESOLUTION_MESSAGES[code]);
    this.name = "AiPromptResolutionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isJsonValue(value: unknown, ancestors = new Set<object>()): boolean {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value !== "object" || value === null || ancestors.has(value)) {
    return false;
  }

  ancestors.add(value);
  const valid = Array.isArray(value)
    ? value.every((entry) => isJsonValue(entry, ancestors))
    : isRecord(value) &&
      Object.values(value).every((entry) => isJsonValue(entry, ancestors));
  ancestors.delete(value);
  return valid;
}

function invalidPromptConfiguration(): never {
  throw new AiPromptResolutionError("AI_PROMPT_CONFIGURATION_INVALID");
}

/**
 * Resolves only the exact prompt ID/version requested. Definitions are passed
 * by the caller, so resolution does not depend on process-local registry state.
 */
export function resolveAiPrompt(
  definitions: readonly AiPromptTemplateVersionV1[],
  promptId: string,
  promptVersion: number,
  variables: Readonly<Record<string, string>>,
): AiGenerationRequestV1 {
  if (!Array.isArray(definitions)) {
    return invalidPromptConfiguration();
  }

  const matches = definitions.filter(
    (definition) =>
      isRecord(definition) &&
      definition.promptId === promptId &&
      definition.promptVersion === promptVersion,
  );
  if (matches.length === 0) {
    throw new AiPromptResolutionError("AI_PROMPT_VERSION_NOT_FOUND");
  }
  if (matches.length !== 1) {
    return invalidPromptConfiguration();
  }

  const definition = matches[0];
  if (
    typeof definition.promptId !== "string" ||
    !/^[a-z][a-z0-9._-]{0,63}$/.test(definition.promptId) ||
    !Number.isSafeInteger(definition.promptVersion) ||
    definition.promptVersion <= 0 ||
    typeof definition.template !== "string" ||
    definition.template.trim().length === 0 ||
    !Array.isArray(definition.variables) ||
    !isRecord(definition.modelConfig) ||
    !isRecord(definition.responseSchema) ||
    !isJsonValue(definition.responseSchema) ||
    !isRecord(definition.provenance)
  ) {
    return invalidPromptConfiguration();
  }

  const { modelConfig, provenance } = definition;
  if (
    Object.keys(modelConfig).some(
      (key) => !["model", "temperature", "maxOutputTokens"].includes(key),
    ) ||
    typeof modelConfig.model !== "string" ||
    modelConfig.model.trim().length === 0 ||
    (modelConfig.temperature !== undefined &&
      (typeof modelConfig.temperature !== "number" ||
        !Number.isFinite(modelConfig.temperature) ||
        modelConfig.temperature < 0 ||
        modelConfig.temperature > 2)) ||
    (modelConfig.maxOutputTokens !== undefined &&
      (typeof modelConfig.maxOutputTokens !== "number" ||
        !Number.isSafeInteger(modelConfig.maxOutputTokens) ||
        modelConfig.maxOutputTokens <= 0)) ||
    typeof provenance.source !== "string" ||
    provenance.source.trim().length === 0 ||
    typeof provenance.revision !== "string" ||
    provenance.revision.trim().length === 0
  ) {
    return invalidPromptConfiguration();
  }

  const declaredVariables = new Set<string>();
  for (const variable of definition.variables) {
    if (
      typeof variable !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(variable) ||
      declaredVariables.has(variable)
    ) {
      return invalidPromptConfiguration();
    }
    declaredVariables.add(variable);
  }

  const placeholders = [
    ...definition.template.matchAll(/\{\{([^{}]+)\}\}/g),
  ].map((match) => match[1]);
  const templateWithoutPlaceholders = definition.template.replace(
    /\{\{[^{}]+\}\}/g,
    "",
  );
  const templateVariables = new Set(placeholders);
  if (
    templateWithoutPlaceholders.includes("{{") ||
    templateWithoutPlaceholders.includes("}}") ||
    placeholders.some(
      (variable) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(variable),
    ) ||
    templateVariables.size !== declaredVariables.size ||
    [...templateVariables].some((variable) => !declaredVariables.has(variable))
  ) {
    return invalidPromptConfiguration();
  }

  if (!isRecord(variables)) {
    throw new AiPromptResolutionError("AI_PROMPT_VARIABLES_INVALID");
  }
  const suppliedVariables = Object.keys(variables);
  if (
    suppliedVariables.length !== declaredVariables.size ||
    suppliedVariables.some(
      (variable) =>
        !declaredVariables.has(variable) ||
        typeof variables[variable] !== "string",
    )
  ) {
    throw new AiPromptResolutionError("AI_PROMPT_VARIABLES_INVALID");
  }

  const serializedSchema = JSON.stringify(definition.responseSchema);
  if (serializedSchema === undefined) {
    return invalidPromptConfiguration();
  }
  const responseSchema = JSON.parse(serializedSchema) as Record<
    string,
    unknown
  > | null;
  if (!isRecord(responseSchema)) {
    return invalidPromptConfiguration();
  }

  const prompt = definition.template.replace(
    /\{\{([^{}]+)\}\}/g,
    (_placeholder: string, variable: string) => variables[variable],
  );

  return {
    prompt,
    promptMetadata: {
      promptId: definition.promptId,
      promptVersion: definition.promptVersion,
      modelConfig: { ...modelConfig } as AiPromptModelConfigurationV1,
      responseSchema,
      provenance: { ...provenance } as AiPromptProvenanceV1,
    },
  };
}

const SAFE_ERROR_MESSAGES: Record<AiOrchestrationErrorCodeV1, string> = {
  AI_REQUEST_TIMEOUT: "The AI request timed out.",
  AI_REQUEST_CANCELLED: "The AI request was cancelled.",
  AI_PROVIDER_FAILURE: "The AI provider request failed.",
};

export class AiOrchestrationError extends Error {
  constructor(readonly code: AiOrchestrationErrorCodeV1) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = "AiOrchestrationError";
  }
}

/** Internal orchestration boundary; it does not own product-domain truth. */
export class AiOrchestrator {
  private readonly timeoutMs: number;
  private readonly record: (entry: AiOrchestrationLogEntry) => void;

  constructor(
    private readonly provider: AiProviderV1,
    options: AiOrchestratorOptions = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.record = options.record ?? (() => undefined);

    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new RangeError("timeoutMs must be a positive finite number");
    }
  }

  async generate(
    request: AiGenerationRequestV1,
    callerSignal?: AbortSignal,
  ): Promise<AiGenerationResultV1> {
    const startedAt = Date.now();
    const controller = new AbortController();
    let outcome: AiOrchestrationOutcome = "provider_failure";
    let errorCode: AiOrchestrationErrorCodeV1 | undefined;
    let abortRequest: (() => void) | undefined;

    const aborted = new Promise<never>((_resolve, reject) => {
      abortRequest = () => {
        reject(new AiOrchestrationError(errorCode ?? "AI_REQUEST_CANCELLED"));
      };
      controller.signal.addEventListener("abort", abortRequest, { once: true });
    });

    const abortWith = (code: AiOrchestrationErrorCodeV1) => {
      if (controller.signal.aborted) {
        return;
      }

      errorCode = code;
      outcome = code === "AI_REQUEST_TIMEOUT" ? "timeout" : "cancelled";
      controller.abort();
    };

    const onCallerAbort = () => abortWith("AI_REQUEST_CANCELLED");
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      if (callerSignal?.aborted) {
        abortWith("AI_REQUEST_CANCELLED");
      } else {
        callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
        timer = setTimeout(
          () => abortWith("AI_REQUEST_TIMEOUT"),
          this.timeoutMs,
        );
      }

      if (controller.signal.aborted) {
        await aborted;
      }

      const providerRequest = Promise.resolve().then(() =>
        this.provider.generate(request, { signal: controller.signal }),
      );
      const result = await Promise.race([providerRequest, aborted]);

      if (
        typeof result !== "object" ||
        result === null ||
        typeof result.text !== "string"
      ) {
        throw new TypeError("Provider returned an invalid response");
      }

      outcome = "success";
      return result;
    } catch {
      if (controller.signal.aborted) {
        errorCode ??= "AI_REQUEST_CANCELLED";
        outcome = errorCode === "AI_REQUEST_TIMEOUT" ? "timeout" : "cancelled";
        throw new AiOrchestrationError(errorCode);
      }

      outcome = "provider_failure";
      errorCode = "AI_PROVIDER_FAILURE";
      throw new AiOrchestrationError(errorCode);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      callerSignal?.removeEventListener("abort", onCallerAbort);
      if (abortRequest) {
        controller.signal.removeEventListener("abort", abortRequest);
      }

      try {
        this.record({
          event: "ai.orchestration.completed",
          outcome,
          durationMs: Math.max(0, Date.now() - startedAt),
          ...(errorCode ? { errorCode } : {}),
        });
      } catch {
        // A telemetry failure must not alter the provider request outcome.
      }
    }
  }
}
