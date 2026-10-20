import assert from "node:assert/strict";
import test from "node:test";
import {
  forceFlushTracing,
  initializeTracing,
  initializeTracingFromEnvironment,
  injectTraceContext,
  runWithDatabaseSpan,
  runWithKafkaSpan,
  startHttpServerSpan,
  shutdownTracing,
  withTraceContext,
} from "../dist/index.js";

const remoteTraceId = "4bf92f3577b34da6a3ce929d0e0e4736";
const remoteSpanId = "00f067aa0ba902b7";

test.after(async () => shutdownTracing());

class FailingExporter {
  spans = [];

  export(spans, callback) {
    this.spans.push(...spans);
    callback({ code: 1, error: new Error("private exporter response") });
  }

  async shutdown() {}

  async forceFlush() {}
}

test("propagates one trace and keeps exporter failures out of request work", async () => {
  const exporter = new FailingExporter();
  for (const endpoint of [
    "https://collector.example/v1/traces?token=private-value",
    "https://private-user:private-password@collector.example/v1/traces",
  ]) {
    assert.throws(
      () =>
        initializeTracingFromEnvironment({
          OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: endpoint,
        }),
      { message: "OpenTelemetry traces endpoint is invalid." },
    );
  }
  assert.throws(
    () =>
      initializeTracingFromEnvironment({ OTEL_SERVICE_NAME: "private name" }),
    { message: "OpenTelemetry service name is invalid." },
  );
  initializeTracing({ serviceName: "cgn-observability-test", exporter });

  const server = startHttpServerSpan(
    {
      traceparent: `00-${remoteTraceId}-${remoteSpanId}-01`,
      authorization: "Bearer private-value",
    },
    "GET",
  );
  assert.equal(server.traceId, remoteTraceId);

  let propagatedCarrier;
  let unknownDirectionCallbackRan = false;
  const requestResult = await server.run(async () => {
    propagatedCarrier = injectTraceContext();
    await withTraceContext(propagatedCarrier, async () => {
      assert.equal(
        await runWithDatabaseSpan("query", async () => "database-ok"),
        "database-ok",
      );
      await runWithKafkaSpan("produce", async () => {
        await Promise.resolve();
      });
      await runWithKafkaSpan("authorization-header-secret", async () => {
        unknownDirectionCallbackRan = true;
      });
    });
    return "request-ok";
  });
  server.end(200);

  assert.equal(requestResult, "request-ok");
  assert.equal(unknownDirectionCallbackRan, true);
  assert.match(
    propagatedCarrier.traceparent,
    /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
  );
  assert.equal(propagatedCarrier.traceparent.split("-")[1], remoteTraceId);
  assert.equal("baggage" in propagatedCarrier, false);

  await forceFlushTracing();
  assert.ok(exporter.spans.length >= 3);
  assert.ok(
    exporter.spans.every(
      (span) => span.spanContext().traceId === remoteTraceId,
    ),
  );

  const serverSpan = exporter.spans.find((span) => span.kind === 1);
  const databaseSpan = exporter.spans.find((span) => span.name === "db.query");
  const eventSpan = exporter.spans.find(
    (span) => span.name === "kafka.produce",
  );
  const unknownKafkaSpan = exporter.spans.find(
    (span) => span.name === "kafka.unknown",
  );
  assert.ok(serverSpan);
  assert.ok(databaseSpan);
  assert.ok(eventSpan);
  assert.ok(unknownKafkaSpan);
  assert.equal(unknownKafkaSpan.kind, 0);
  assert.equal(
    exporter.spans.some((span) =>
      span.name.includes("authorization-header-secret"),
    ),
    false,
  );
  assert.equal(serverSpan.parentSpanContext.spanId, remoteSpanId);
  assert.equal(
    databaseSpan.parentSpanContext.spanId,
    serverSpan.spanContext().spanId,
  );
  assert.equal(
    eventSpan.parentSpanContext.spanId,
    serverSpan.spanContext().spanId,
  );
  assert.equal(
    unknownKafkaSpan.parentSpanContext.spanId,
    serverSpan.spanContext().spanId,
  );

  const attributeNames = exporter.spans.flatMap((span) =>
    Object.keys(span.attributes),
  );
  assert.ok(
    attributeNames.every(
      (name) =>
        !/authorization|email|header|payload|statement|url|user/i.test(name),
    ),
  );
  assert.equal(serverSpan.attributes["http.request.method"], "GET");
  assert.equal(serverSpan.attributes["http.response.status_code"], 200);
});
