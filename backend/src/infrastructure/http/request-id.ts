import { randomUUID } from 'crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export const REQUEST_ID_HEADER = 'x-request-id';

const SAFE_REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

export function registerRequestIdHook(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', (request, reply, done) => {
    const requestId = resolveRequestId(request.headers[REQUEST_ID_HEADER]);

    request.headers[REQUEST_ID_HEADER] = requestId;
    reply.header(REQUEST_ID_HEADER, requestId);
    done();
  });
}

export function getRequestId(request: FastifyRequest): string | undefined {
  const value = request.headers[REQUEST_ID_HEADER];

  return Array.isArray(value) ? value[0] : value;
}

export function resolveRequestId(value: unknown): string {
  const candidate = Array.isArray(value)
    ? value.find((item): item is string => typeof item === 'string')
    : value;

  if (
    typeof candidate === 'string' &&
    SAFE_REQUEST_ID_PATTERN.test(candidate)
  ) {
    return candidate;
  }

  return randomUUID();
}
