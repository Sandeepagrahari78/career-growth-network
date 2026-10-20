import type {
  AiGenerationRequestV1,
  AiGenerationResultV1,
  AiOrchestrationErrorCodeV1,
  AiProviderV1,
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
