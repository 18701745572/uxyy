import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq, gte, like, lte, type SQL } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../../modules/database/database.constants';
import type { AppDrizzleDb } from '../../modules/database/database.module';

export type AuditLogRecordInput = {
  enterpriseId?: number | null;
  userId?: number | null;
  method: string;
  path: string;
  ip?: string | null;
  userAgent?: string | null;
  requestBody?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /** 异步落库失败不影响主流程 */
  async safeRecord(input: AuditLogRecordInput): Promise<void> {
    try {
      await this.db.insert(schema.operationAuditLogs).values({
        enterpriseId: input.enterpriseId ?? null,
        userId: input.userId ?? null,
        method: input.method,
        path: input.path.slice(0, 500),
        ip: input.ip?.slice(0, 45) ?? null,
        userAgent: input.userAgent ?? null,
        requestBody: input.requestBody ?? null,
        statusCode: input.statusCode ?? null,
        durationMs: input.durationMs ?? null,
      });
    } catch (e) {
      this.logger.warn(`audit insert failed: ${(e as Error).message}`);
    }
  }

  private buildWhere(params: {
    enterpriseId: number;
    startDate?: Date;
    endDate?: Date;
    method?: string;
    pathPrefix?: string;
    userId?: number;
  }): SQL | undefined {
    const conds: SQL[] = [
      eq(schema.operationAuditLogs.enterpriseId, params.enterpriseId),
    ];
    if (params.startDate) {
      conds.push(gte(schema.operationAuditLogs.createdAt, params.startDate));
    }
    if (params.endDate) {
      conds.push(lte(schema.operationAuditLogs.createdAt, params.endDate));
    }
    if (params.method) {
      conds.push(eq(schema.operationAuditLogs.method, params.method));
    }
    if (params.pathPrefix?.trim()) {
      const pref = params.pathPrefix.trim().slice(0, 400);
      conds.push(like(schema.operationAuditLogs.path, `${pref}%`));
    }
    if (params.userId != null) {
      conds.push(eq(schema.operationAuditLogs.userId, params.userId));
    }
    return and(...conds);
  }

  async listForEnterprise(params: {
    enterpriseId: number;
    page: number;
    pageSize: number;
    startDate?: Date;
    endDate?: Date;
    method?: string;
    pathPrefix?: string;
    userId?: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;
    const where = this.buildWhere({
      enterpriseId: params.enterpriseId,
      startDate: params.startDate,
      endDate: params.endDate,
      method: params.method,
      pathPrefix: params.pathPrefix,
      userId: params.userId,
    });

    const [totalRow] = await this.db
      .select({ c: count() })
      .from(schema.operationAuditLogs)
      .where(where);

    const rows = await this.db
      .select()
      .from(schema.operationAuditLogs)
      .where(where)
      .orderBy(desc(schema.operationAuditLogs.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map((r) => ({
        id: r.id,
        enterpriseId: r.enterpriseId,
        userId: r.userId,
        method: r.method,
        path: r.path,
        ip: r.ip,
        userAgent: r.userAgent,
        requestBody: r.requestBody,
        statusCode: r.statusCode,
        durationMs: r.durationMs,
        createdAt: r.createdAt.toISOString(),
      })),
      total: Number(totalRow?.c ?? 0),
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async listAllForExport(params: {
    enterpriseId: number;
    startDate?: Date;
    endDate?: Date;
    method?: string;
    pathPrefix?: string;
    userId?: number;
    maxRows: number;
  }) {
    const where = this.buildWhere({
      enterpriseId: params.enterpriseId,
      startDate: params.startDate,
      endDate: params.endDate,
      method: params.method,
      pathPrefix: params.pathPrefix,
      userId: params.userId,
    });

    return this.db
      .select()
      .from(schema.operationAuditLogs)
      .where(where)
      .orderBy(desc(schema.operationAuditLogs.createdAt))
      .limit(params.maxRows);
  }
}
