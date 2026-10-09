import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorResponse } from '@lead/shared-contracts';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload: ErrorResponse =
        typeof body === 'object' && body !== null
          ? ({
              statusCode: status,
              message:
                (body as { message?: string | string[] }).message ??
                exception.message ??
                'Unexpected error',
              error: (body as { error?: string }).error ?? exception.name
            } satisfies ErrorResponse)
          : ({
              statusCode: status,
              message: String(body),
              error: exception.name
            } satisfies ErrorResponse);

      response.status(status).json(payload);
      return;
    }

    const payload: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError'
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }
}
