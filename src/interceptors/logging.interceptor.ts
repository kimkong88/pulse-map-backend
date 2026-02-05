import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Log incoming request immediately (before guards/pipes)
    this.logger.log(
      `→ ${request.method} ${request.url} ${request.headers['authorization'] ? '[Auth]' : '[No Auth]'}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          this.logger.log(
            `✅ ${request.method} ${request.url} - ${
              response.statusCode
            } - ${duration}ms`,
          );
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          this.logger.error(
            `❌ ${request.method} ${request.url} - ${
              error.status || 500
            } - ${duration}ms - ${error.message}`,
          );
          this.logger.error(error);
          this.logger.error(error.stack);
        },
      }),
    );
  }
}
