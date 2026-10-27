import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  PipeTransform,
  ValidationPipe,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'express';
import { configuration } from './config';

export function fail(status: number, code: string, message: string): never {
  throw new HttpException({ statusCode: status, code, message }, status);
}
@Injectable()
export class IdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(value))
      fail(400, 'VALIDATION_ERROR', 'Invalid resource identifier');
    return value;
  }
}
@Catch()
export class ApiErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Request could not be completed';
    if (error instanceof HttpException) {
      status = error.getStatus();
      const body = error.getResponse();
      if (typeof body === 'object' && body !== null) {
        if ('code' in body && typeof body.code === 'string') code = body.code;
        if ('message' in body && typeof body.message === 'string')
          message = body.message;
      }
      if (code === 'INTERNAL_ERROR') {
        code =
          status === 401
            ? 'UNAUTHENTICATED'
            : status === 404
              ? 'NOT_FOUND'
              : 'VALIDATION_ERROR';
        message =
          status === 401
            ? 'Authentication required'
            : status === 404
              ? 'Resource not found'
              : 'Invalid request';
      }
    } else if (typeof error === 'object' && error !== null) {
      if ('type' in error && error.type === 'entity.too.large') {
        status = 413;
        code = 'PAYLOAD_TOO_LARGE';
        message = 'JSON body exceeds 16 KiB';
      } else if ('type' in error && error.type === 'entity.parse.failed') {
        status = 400;
        code = 'VALIDATION_ERROR';
        message = 'Invalid JSON';
      } else if ('code' in error && error.code === '23505') {
        status = 409;
        code = 'RESOURCE_ACTIVE';
        message = 'Resource conflicts with an existing record';
      }
    }
    if (status === 429) response.setHeader('Retry-After', '60');
    response.status(status).json({ statusCode: status, code, message });
  }
}
export function configureApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');
  app.useBodyParser('json', { limit: '16kb' });
  // Empty command DTOs have no validation metadata; strict field whitelisting still applies.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
      exceptionFactory: () =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request fields',
        }),
    }),
  );
  app.useGlobalFilters(new ApiErrors());
  app.enableCors({
    origin: configuration().corsOrigins,
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
    exposedHeaders: ['Content-Disposition'],
  });
  app.enableShutdownHooks();
}
