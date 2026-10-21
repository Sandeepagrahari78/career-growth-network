import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
  type Context,
  type Span,
  type TextMapGetter,
  type TextMapSetter,
} from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import type { ExportResult } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { TracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

export type TraceCarrier = Record<string, string | string[] | undefined>;

export interface TracingOptions {
  serviceName: string;
  exporter?: SpanExporter;
}

export interface HttpServerSpan {
  readonly traceId?: string;
  run<T>(callback: () => T): T;
  end(statusCode: number): void;
}

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/i;
const SERVICE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const TRACE_KEYS = new Set(["traceparent", "tracestate"]);
const DATABASE_OPERATIONS = new Set([
  "connect",
  "execute",
  "query",
  "transaction",
]);
const KAFKA_DIRECTIONS = new Set(["produce", "consume"]);

export type DatabaseOperation = "connect" | "execute" | "query" | "transaction";

const traceGetter: TextMapGetter<TraceCarrier> = {
  get(carrier, key) {
    const normalizedKey = key.toLowerCase();
    if (!TRACE_KEYS.has(normalizedKey)) return undefined;
    const entry = Object.entries(carrier).find(
      ([candidate]) => candidate.toLowerCase() === normalizedKey,
    );
    return entry?.[1];
  },
  keys(carrier) {
    return Object.keys(carrier).filter((key) =>
      TRACE_KEYS.has(key.toLowerCase()),
    );
  },
};

const traceSetter: TextMapSetter<Record<string, string>> = {
  set(carrier, key, value) {
    const normalizedKey = key.toLowerCase();
    if (TRACE_KEYS.has(normalizedKey)) carrier[normalizedKey] = value;
  },
};

let activeProvider: TracerProvider | undefined;
let activeContextManager: AsyncLocalStorageContextManager | undefined;

export function initializeTracing(options: TracingOptions): void {
  if (activeProvider) return;

  const serviceName = safeServiceName(options.serviceName);
  const processors = options.exporter
    ? [
        new BatchSpanProcessor({
          exporter: new SafeSpanExporter(options.exporter),
        }),
      ]
    : [];
  const provider = new TracerProvider({
    resource: resourceFromAttributes({ "service.name": serviceName }),
    spanProcessors: processors,
  });
  const contextManager = new AsyncLocalStorageContextManager().enable();

  const contextRegistered = context.setGlobalContextManager(contextManager);
  const propagatorRegistered = propagation.setGlobalPropagator(
    new W3CTraceContextPropagator(),
  );
  const providerRegistered = trace.setGlobalTracerProvider(provider);

  if (!contextRegistered || !propagatorRegistered || !providerRegistered) {
    contextManager.disable();
    void provider.shutdown();
    throw new Error("OpenTelemetry global state is already configured.");
  }

  activeProvider = provider;
  activeContextManager = contextManager;
}

export function initializeTracingFromEnvironment(
  environment: Record<string, string | undefined> = process.env,
): void {
  const serviceName = safeServiceName(environment.OTEL_SERVICE_NAME);
  const endpoint = readExporterEndpoint(
    environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  );

  initializeTracing({
    serviceName,
    ...(endpoint ? { exporter: new OTLPTraceExporter({ url: endpoint }) } : {}),
  });
}

export function startHttpServerSpan(
  headers: TraceCarrier,
  method: string,
): HttpServerSpan {
  const parentContext = propagation.extract(
    context.active(),
    headers,
    traceGetter,
  );
  const safeMethod = /^[A-Z]{1,12}$/.test(method) ? method : "OTHER";
  const span = trace.getTracer("@cgn/observability").startSpan(
    `HTTP ${safeMethod}`,
    {
      kind: SpanKind.SERVER,
      attributes: { "http.request.method": safeMethod },
    },
    parentContext,
  );
  const spanContext = trace.setSpan(parentContext, span);
  const spanTraceId = span.spanContext().traceId;

  return {
    ...(TRACE_ID_PATTERN.test(spanTraceId) && !/^0+$/.test(spanTraceId)
      ? { traceId: spanTraceId }
      : {}),
    run<T>(callback: () => T): T {
      return context.with(spanContext, callback);
    },
    end(statusCode: number): void {
      if (
        Number.isInteger(statusCode) &&
        statusCode >= 100 &&
        statusCode <= 599
      ) {
        span.setAttribute("http.response.status_code", statusCode);
        if (statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.end();
    },
  };
}

export function injectTraceContext(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier, traceSetter);
  return carrier;
}

export function withTraceContext<T>(
  carrier: TraceCarrier,
  callback: () => T,
): T {
  const extracted = propagation.extract(context.active(), carrier, traceGetter);
  return context.with(extracted, callback);
}

export function runWithDatabaseSpan<T>(
  operation: DatabaseOperation,
  work: () => T | Promise<T>,
): Promise<T> {
  const safeOperation = DATABASE_OPERATIONS.has(operation)
    ? operation
    : "query";
  return runWithSpan(`db.${safeOperation}`, SpanKind.CLIENT, work);
}

export function runWithKafkaSpan<T>(
  direction: "produce" | "consume",
  work: () => T | Promise<T>,
): Promise<T> {
  const safeDirection = KAFKA_DIRECTIONS.has(direction) ? direction : "unknown";
  const kind =
    safeDirection === "produce"
      ? SpanKind.PRODUCER
      : safeDirection === "consume"
        ? SpanKind.CONSUMER
        : SpanKind.INTERNAL;
  return runWithSpan(`kafka.${safeDirection}`, kind, work);
}

async function runWithSpan<T>(
  name: string,
  kind: SpanKind,
  work: () => T | Promise<T>,
): Promise<T> {
  const parentContext = context.active();
  const span = trace
    .getTracer("@cgn/observability")
    .startSpan(name, { kind }, parentContext);
  const spanContext: Context = trace.setSpan(parentContext, span);

  return context.with(spanContext, async () => {
    try {
      return await work();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function forceFlushTracing(): Promise<void> {
  if (!activeProvider) return;
  try {
    await activeProvider.forceFlush();
  } catch {
    emitSafeFailure("otel_flush_failed");
  }
}

export async function shutdownTracing(): Promise<void> {
  const provider = activeProvider;
  const contextManager = activeContextManager;
  activeProvider = undefined;
  activeContextManager = undefined;
  if (!provider) return;

  try {
    await provider.shutdown();
  } catch {
    emitSafeFailure("otel_shutdown_failed");
  } finally {
    contextManager?.disable();
  }
}

class SafeSpanExporter implements SpanExporter {
  constructor(private readonly delegate: SpanExporter) {}

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    try {
      this.delegate.export(spans, (result) => {
        if (result.code !== 0) {
          emitSafeFailure("otel_export_failed");
          resultCallback({ code: result.code });
          return;
        }
        resultCallback(result);
      });
    } catch {
      emitSafeFailure("otel_export_failed");
      resultCallback({ code: 1 });
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.delegate.shutdown();
    } catch {
      emitSafeFailure("otel_shutdown_failed");
    }
  }

  async forceFlush(): Promise<void> {
    try {
      await this.delegate.forceFlush?.();
    } catch {
      emitSafeFailure("otel_flush_failed");
    }
  }
}

function safeServiceName(value: string | undefined): string {
  const normalized = value?.trim() || "cgn-service";
  if (!SERVICE_NAME_PATTERN.test(normalized)) {
    throw new Error("OpenTelemetry service name is invalid.");
  }
  return normalized;
}

function emitSafeFailure(event: string): void {
  try {
    process.stdout.write(
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        event,
      })}\n`,
    );
  } catch {
    // Logging failure is isolated from exporter and request paths.
  }
}

function readExporterEndpoint(value: string | undefined): string | undefined {
  const endpoint = value?.trim();
  if (!endpoint) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error("OpenTelemetry traces endpoint is invalid.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("OpenTelemetry traces endpoint is invalid.");
  }
  return endpoint;
}
