import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getRequestId } from '../request-id';

interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  path: string;
  requestId?: string;
  timestamp: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const requestId = getRequestId(request);
    const statusCode = getStatusCode(exception);
    const message =
      statusCode >= 500 ? 'Internal server error' : getClientMessage(exception);
    const body: ApiErrorBody = {
      statusCode,
      message,
      path: request.url,
      requestId,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      this.logger.error(
        `Unhandled request error ${request.method} ${request.url} requestId=${requestId ?? 'none'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `Request rejected ${statusCode} ${request.method} ${request.url} requestId=${requestId ?? 'none'}`,
      );
    }

    reply.status(statusCode).send(body);
  }
}

function getStatusCode(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  if (exception instanceof Error && isDomainValidationError(exception)) {
    return HttpStatus.BAD_REQUEST;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function getClientMessage(exception: unknown): string | string[] {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (isRecord(response)) {
      const message = response['message'];

      if (typeof message === 'string') {
        return message;
      }

      if (
        Array.isArray(message) &&
        message.every((item) => typeof item === 'string')
      ) {
        return message;
      }
    }
  }

  if (exception instanceof Error && isDomainValidationError(exception)) {
    return exception.message;
  }

  return 'Request failed';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDomainValidationError(error: Error): boolean {
  return [
    /cannot be empty/i,
    /must be/i,
    /must match/i,
    /exceeds/i,
    /^unsupported /i,
    /^quantity /i,
    /^title /i,
    /^email /i,
    /^username /i,
  ].some((pattern) => pattern.test(error.message));
}
