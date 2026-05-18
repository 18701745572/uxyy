import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../services/audit-log.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class OperationAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    if (!MUTATING.has(req.method)) {
      return next.handle();
    }

    const path = (req.originalUrl?.split('?')[0] ?? req.path) || '';
    const lower = path.toLowerCase();
    if (lower.includes('/docs') || lower.includes('/health')) {
      return next.handle();
    }

    const start = Date.now();
    const user = req.user as { userId?: number; enterpriseId?: number } | undefined;

    return next.handle().pipe(
      tap({
        finalize: () => {
          void this.audit.safeRecord({
            enterpriseId: user?.enterpriseId ?? null,
            userId: user?.userId ?? null,
            method: req.method,
            path: path.slice(0, 500),
            ip: this.clientIp(req),
            userAgent: this.pickUa(req),
            requestBody: this.safeBody(req, lower),
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
          });
        },
      }),
    );
  }

  private clientIp(req: Request): string | null {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      return xff.split(',')[0]?.trim() ?? null;
    }
    if (Array.isArray(xff) && xff[0]) return xff[0];
    return req.ip ?? null;
  }

  private pickUa(req: Request): string | null {
    const ua = req.headers['user-agent'];
    if (typeof ua !== 'string') return null;
    return ua.length > 2000 ? ua.slice(0, 2000) : ua;
  }

  private safeBody(req: Request, pathLower: string): string | null {
    if (
      pathLower.includes('/auth/login') ||
      pathLower.includes('/auth/register') ||
      pathLower.includes('/auth/refresh') ||
      pathLower.includes('/auth/reset-password')
    ) {
      return null;
    }
    const body = req.body;
    if (body == null || typeof body !== 'object' || Array.isArray(body)) {
      return null;
    }
    try {
      const redactKeys = new Set([
        'password',
        'oldpassword',
        'newpassword',
        'refresh_token',
      ]);
      const clone: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(body)) {
        clone[k] = redactKeys.has(k.toLowerCase()) ? '[redacted]' : v;
      }
      let s = JSON.stringify(clone);
      if (s.length > 4000) s = `${s.slice(0, 4000)}…`;
      return s;
    } catch {
      return null;
    }
  }
}
