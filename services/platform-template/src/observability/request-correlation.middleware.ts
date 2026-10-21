import { randomUUID } from "node:crypto";
import { startHttpServerSpan } from "@cgn/observability";
import type { NextFunction, Request, Response } from "express";
import { StructuredLogger } from "./structured-logger.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export function requestCorrelationMiddleware(logger: StructuredLogger) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const suppliedId = request.header("x-request-id") ?? "";
    const requestId = REQUEST_ID_PATTERN.test(suppliedId)
      ? suppliedId
      : randomUUID();
    const startedAt = performance.now();
    const serverSpan = startHttpServerSpan(request.headers, request.method);

    response.setHeader("x-request-id", requestId);
    response.once("finish", () => {
      const method = /^[A-Z]{1,12}$/.test(request.method)
        ? request.method
        : "OTHER";
      logger.request({
        requestId,
        method,
        statusCode: response.statusCode,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        ...(serverSpan.traceId ? { traceId: serverSpan.traceId } : {}),
      });
      serverSpan.end(response.statusCode);
    });
    serverSpan.run(next);
  };
}
