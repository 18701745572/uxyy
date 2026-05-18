import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { getCurrentContext } from '../middleware/request-context.middleware';

/**
 * 请求日志拦截器
 * 记录所有 HTTP 请求的详细信息和响应
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const requestId = (request as Request & { id?: string }).id || 'unknown';
    const contextData = getCurrentContext();

    const { method, url, body, query, params } = request;
    const startTime = Date.now();

    // 构建请求日志
    const logData = {
      requestId,
      method,
      url,
      query: Object.keys(query).length > 0 ? query : undefined,
      params: Object.keys(params).length > 0 ? params : undefined,
      userId: contextData?.userId,
      enterpriseId: contextData?.enterpriseId,
      ip: contextData?.ip,
      userAgent: contextData?.userAgent,
    };

    // 记录请求体（排除敏感信息）
    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = this.sanitizeBody(body);
      if (sanitizedBody) {
        Object.assign(logData, { body: sanitizedBody });
      }
    }

    this.logger.log(`Request: ${method} ${url}`, logData);

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        this.logger.log(
          `Response: ${method} ${url} ${statusCode} ${duration}ms`,
          {
            requestId,
            method,
            url,
            statusCode,
            duration,
            responseSize: data ? JSON.stringify(data).length : 0,
          },
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.logger.error(
          `Error: ${method} ${url} ${statusCode} ${duration}ms - ${error.message}`,
          error.stack,
          {
            requestId,
            method,
            url,
            statusCode,
            duration,
            errorName: error.name,
            errorMessage: error.message,
          },
        );

        throw error;
      }),
    );
  }

  /**
   * 清理请求体中的敏感信息
   */
  private sanitizeBody(
    body: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'authorization',
      'cookie',
    ];
    const sanitized: Record<string, unknown> = {};
    let hasData = false;

    for (const [key, value] of Object.entries(body)) {
      // 跳过敏感字段
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
        hasData = true;
      } else if (typeof value === 'object' && value !== null) {
        const nested = this.sanitizeBody(value as Record<string, unknown>);
        if (nested) {
          sanitized[key] = nested;
          hasData = true;
        }
      } else {
        sanitized[key] = value;
        hasData = true;
      }
    }

    return hasData ? sanitized : null;
  }
}
