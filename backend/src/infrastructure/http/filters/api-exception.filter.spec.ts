import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  it('preserves safe client errors and includes the request id', () => {
    const reply = makeReply();
    const filter = new ApiExceptionFilter();

    filter.catch(
      new BadRequestException('Invalid quantity'),
      makeHost(reply, 'req-12345678'),
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid quantity',
        path: '/api/inventory-lots',
        requestId: 'req-12345678',
        statusCode: 400,
      }),
    );
  });

  it('maps known domain validation errors to 400', () => {
    const reply = makeReply();
    const filter = new ApiExceptionFilter();

    filter.catch(
      new Error('Consume amount exceeds lot quantity'),
      makeHost(reply, 'req-12345678'),
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Consume amount exceeds lot quantity',
        statusCode: 400,
      }),
    );
  });

  it('sanitizes unexpected errors', () => {
    const reply = makeReply();
    const filter = new ApiExceptionFilter();

    filter.catch(new Error('database password leaked'), makeHost(reply));

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal server error',
        statusCode: 500,
      }),
    );
  });
});

function makeReply(): {
  status: jest.Mock;
  send: jest.Mock;
} {
  const reply = {
    status: jest.fn(),
    send: jest.fn(),
  };
  reply.status.mockReturnValue(reply);
  return reply;
}

function makeHost(
  reply: ReturnType<typeof makeReply>,
  requestId?: string,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: requestId ? { 'x-request-id': requestId } : {},
        method: 'POST',
        url: '/api/inventory-lots',
      }),
      getResponse: () => reply,
    }),
  } as unknown as ArgumentsHost;
}
