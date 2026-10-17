import type { LoggerService } from "@nestjs/common";

type LogLevel = "debug" | "info" | "warn" | "error";

export class StructuredLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write("info", message, context);
  }

  error(_message: unknown, _stack?: string, context?: string): void {
    this.write("error", "framework_error", context);
  }

  warn(message: unknown, context?: string): void {
    this.write("warn", message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write("debug", message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write("debug", message, context);
  }

  fatal(_message: unknown, context?: string): void {
    this.write("error", "framework_fatal", context);
  }

  request(details: {
    requestId: string;
    method: string;
    statusCode: number;
    durationMs: number;
  }): void {
    this.emit({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "http_request_completed",
      ...details,
    });
  }

  private write(level: LogLevel, message: unknown, context?: string): void {
    const safeMessage =
      level === "error" ? "framework_error" : this.safeStaticText(message);
    this.emit({
      timestamp: new Date().toISOString(),
      level,
      message: safeMessage,
      ...(context ? { context: this.safeContext(context) } : {}),
    });
  }

  private safeStaticText(message: unknown): string {
    if (typeof message !== "string") return "runtime_event";
    // Framework log messages may include user supplied values or exception
    // details. Accept only stable event identifiers; callers should never
    // pass request data or free-form text to this logger.
    return /^[a-z][a-z0-9_]{1,63}$/.test(message) ? message : "runtime_event";
  }

  private safeContext(context: string): string {
    return /^[A-Za-z0-9_.-]{1,80}$/.test(context) ? context : "service";
  }

  private emit(entry: Record<string, string | number>): void {
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }
}
