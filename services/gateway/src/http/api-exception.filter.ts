import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { ErrorEnvelopeV1 } from "@cgn/contracts";
import type { Response } from "express";

type PublicError = Pick<ErrorEnvelopeV1["error"], "code" | "message">;

function publicError(status: number): PublicError {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return { code: "VALIDATION_ERROR", message: "Request validation failed." };
    case HttpStatus.UNAUTHORIZED:
      return { code: "UNAUTHENTICATED", message: "Authentication is required." };
    case HttpStatus.FORBIDDEN:
      return {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this request.",
      };
    case HttpStatus.NOT_FOUND:
      return { code: "NOT_FOUND", message: "The requested resource was not found." };
    default:
      return status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred." }
        : { code: "REQUEST_ERROR", message: "The request could not be completed." };
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = response.getHeader("x-request-id");
    const body: ErrorEnvelopeV1 = {
      error: {
        ...publicError(status),
        ...(typeof requestId === "string" ? { requestId } : {}),
      },
    };
    response.status(status).json(body);
  }
}
