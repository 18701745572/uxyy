import {
  Inject,
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

export type VoucherStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'posted'
  | 'void';

export interface VoucherAuditAction {
  action: 'submit' | 'approve' | 'reject' | 'post' | 'void';
  userId: number;
  comment?: string;
}

export interface VoucherDetail {
  id: number;
  voucherNo: string;
  voucherDate: Date;
  totalAmount: string;
  summary: string;
  sourceType?: string;
  sourceId?: number;
  status: VoucherStatus;
  entries: {
    id: number;
    accountId: number;
    accountCode: string;
    accountName: string;
    debitAmount: string;
    creditAmount: string;
    summary: string;
  }[];
  audits: {
    id: number;
    action: string;
    fromStatus?: string;
    toStatus: string;
    comment?: string;
    performedBy: number;
    performedByName?: string;
    performedAt: Date;
  }[];
  createdBy?: number;
  createdByName?: string;
  createdAt: Date;
  submittedBy?: number;
  submittedAt?: Date;
  approvedBy?: number;
  approvedAt?: Date;
  postedBy?: number;
  postedAt?: Date;
}

@Injectable()
export class VoucherAuditService {
  private readonly logger = new Logger(VoucherAuditService.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /**
   * 获取凭证详情
   */
  async getVoucherDetail(
    voucherId: number,
    enterpriseId: number,
  ): Promise<VoucherDetail> {
    // 查询凭证主表
    const [voucher] = await this.db
      .select()
      .from(schema.vouchers)
      .where(
        and(
          eq(schema.vouchers.id, voucherId),
          eq(schema.vouchers.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!voucher) {
      throw new NotFoundException('凭证不存在');
    }

    // 查询凭证明细
    const entries = await this.db
      .select({
        item: schema.voucherItems,
        account: schema.accounts,
      })
      .from(schema.voucherItems)
      .leftJoin(
        schema.accounts,
        eq(schema.voucherItems.accountId, schema.accounts.id),
      )
      .where(eq(schema.voucherItems.voucherId, voucherId));

    // 查询审核记录
    const audits = await this.db
      .select({
        audit: schema.voucherAudits,
        user: schema.users,
      })
      .from(schema.voucherAudits)
      .leftJoin(
        schema.users,
        eq(schema.voucherAudits.performedBy, schema.users.id),
      )
      .where(eq(schema.voucherAudits.voucherId, voucherId))
      .orderBy(desc(schema.voucherAudits.performedAt));

    // 查询创建人信息
    let createdByName: string | undefined;
    if (voucher.createdBy) {
      const [creator] = await this.db
        .select({ nickname: schema.users.nickname })
        .from(schema.users)
        .where(eq(schema.users.id, voucher.createdBy))
        .limit(1);
      createdByName = creator?.nickname || undefined;
    }

    return {
      id: voucher.id,
      voucherNo: voucher.voucherNo,
      voucherDate: voucher.voucherDate,
      totalAmount: voucher.totalAmount,
      summary: voucher.summary || '',
      sourceType: voucher.sourceType || undefined,
      sourceId: voucher.sourceId || undefined,
      status: voucher.status,
      entries: entries.map(({ item, account }) => ({
        id: item.id,
        accountId: item.accountId,
        accountCode: account?.code || '',
        accountName: account?.name || '',
        debitAmount: item.debitAmount || '0',
        creditAmount: item.creditAmount || '0',
        summary: item.summary || '',
      })),
      audits: audits.map(({ audit, user }) => ({
        id: audit.id,
        action: audit.action,
        fromStatus: audit.fromStatus || undefined,
        toStatus: audit.toStatus,
        comment: audit.comment || undefined,
        performedBy: audit.performedBy,
        performedByName: user?.nickname || undefined,
        performedAt: audit.performedAt,
      })),
      createdBy: voucher.createdBy || undefined,
      createdByName,
      createdAt: voucher.createdAt,
      submittedBy: voucher.submittedBy || undefined,
      submittedAt: voucher.submittedAt || undefined,
      approvedBy: voucher.approvedBy || undefined,
      approvedAt: voucher.approvedAt || undefined,
      postedBy: voucher.postedBy || undefined,
      postedAt: voucher.postedAt || undefined,
    };
  }

  /**
   * 提交凭证审核
   */
  async submitForAudit(
    voucherId: number,
    enterpriseId: number,
    userId: number,
    comment?: string,
  ): Promise<VoucherDetail> {
    const voucher = await this.getVoucherDetail(voucherId, enterpriseId);

    // 验证状态转换
    if (voucher.status !== 'draft' && voucher.status !== 'rejected') {
      throw new BadRequestException(`当前状态${voucher.status}不允许提交审核`);
    }

    // 验证借贷平衡
    const totalDebit = voucher.entries.reduce(
      (sum, e) => sum + parseFloat(e.debitAmount),
      0,
    );
    const totalCredit = voucher.entries.reduce(
      (sum, e) => sum + parseFloat(e.creditAmount),
      0,
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('借贷不平衡，无法提交审核');
    }

    // 更新凭证状态
    await this.db
      .update(schema.vouchers)
      .set({
        status: 'pending',
        submittedBy: userId,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.vouchers.id, voucherId));

    // 记录审核历史
    await this.db.insert(schema.voucherAudits).values({
      voucherId,
      action: 'submit',
      fromStatus: voucher.status,
      toStatus: 'pending',
      comment,
      performedBy: userId,
    });

    return this.getVoucherDetail(voucherId, enterpriseId);
  }

  /**
   * 审核通过
   */
  async approve(
    voucherId: number,
    enterpriseId: number,
    userId: number,
    comment?: string,
  ): Promise<VoucherDetail> {
    const voucher = await this.getVoucherDetail(voucherId, enterpriseId);

    if (voucher.status !== 'pending') {
      throw new BadRequestException(`当前状态${voucher.status}不允许审核`);
    }

    // 不能审核自己提交的凭证（可选的内控规则）
    if (voucher.submittedBy === userId) {
      // 可以抛出异常或记录警告，这里选择记录警告
      this.logger.warn(`用户${userId}审核了自己提交的凭证${voucherId}`);
    }

    // 更新凭证状态
    await this.db
      .update(schema.vouchers)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.vouchers.id, voucherId));

    // 记录审核历史
    await this.db.insert(schema.voucherAudits).values({
      voucherId,
      action: 'approve',
      fromStatus: voucher.status,
      toStatus: 'approved',
      comment,
      performedBy: userId,
    });

    return this.getVoucherDetail(voucherId, enterpriseId);
  }

  /**
   * 驳回凭证
   */
  async reject(
    voucherId: number,
    enterpriseId: number,
    userId: number,
    reason: string,
  ): Promise<VoucherDetail> {
    const voucher = await this.getVoucherDetail(voucherId, enterpriseId);

    if (voucher.status !== 'pending') {
      throw new BadRequestException(`当前状态${voucher.status}不允许驳回`);
    }

    // 更新凭证状态
    await this.db
      .update(schema.vouchers)
      .set({
        status: 'rejected',
        rejectReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(schema.vouchers.id, voucherId));

    // 记录审核历史
    await this.db.insert(schema.voucherAudits).values({
      voucherId,
      action: 'reject',
      fromStatus: voucher.status,
      toStatus: 'rejected',
      comment: reason,
      performedBy: userId,
    });

    return this.getVoucherDetail(voucherId, enterpriseId);
  }

  /**
   * 过账（记账）
   * 只有已审核的凭证可以过账
   */
  async post(
    voucherId: number,
    enterpriseId: number,
    userId: number,
    comment?: string,
  ): Promise<VoucherDetail> {
    const voucher = await this.getVoucherDetail(voucherId, enterpriseId);

    if (voucher.status !== 'approved') {
      throw new BadRequestException(
        `当前状态${voucher.status}不允许过账，请先审核`,
      );
    }

    // 更新凭证状态
    await this.db
      .update(schema.vouchers)
      .set({
        status: 'posted',
        postedBy: userId,
        postedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.vouchers.id, voucherId));

    // 记录审核历史
    await this.db.insert(schema.voucherAudits).values({
      voucherId,
      action: 'post',
      fromStatus: voucher.status,
      toStatus: 'posted',
      comment,
      performedBy: userId,
    });

    return this.getVoucherDetail(voucherId, enterpriseId);
  }

  /**
   * 作废凭证
   */
  async void(
    voucherId: number,
    enterpriseId: number,
    userId: number,
    reason: string,
  ): Promise<VoucherDetail> {
    const voucher = await this.getVoucherDetail(voucherId, enterpriseId);

    // 已过账的凭证不能直接作废，需要先冲销
    if (voucher.status === 'posted') {
      throw new BadRequestException('已过账凭证不能直接作废，请先冲销');
    }

    // 已作废的凭证不能再作废
    if (voucher.status === 'void') {
      throw new BadRequestException('凭证已作废');
    }

    // 更新凭证状态
    await this.db
      .update(schema.vouchers)
      .set({
        status: 'void',
        updatedAt: new Date(),
      })
      .where(eq(schema.vouchers.id, voucherId));

    // 记录审核历史
    await this.db.insert(schema.voucherAudits).values({
      voucherId,
      action: 'void',
      fromStatus: voucher.status,
      toStatus: 'void',
      comment: reason,
      performedBy: userId,
    });

    return this.getVoucherDetail(voucherId, enterpriseId);
  }

  /**
   * 批量提交审核
   */
  async batchSubmit(
    voucherIds: number[],
    enterpriseId: number,
    userId: number,
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: number; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: number; error: string }>,
    };

    for (const id of voucherIds) {
      try {
        await this.submitForAudit(id, enterpriseId, userId);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          id,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return result;
  }

  /**
   * 批量审核
   */
  async batchApprove(
    voucherIds: number[],
    enterpriseId: number,
    userId: number,
    comment?: string,
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: number; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: number; error: string }>,
    };

    for (const id of voucherIds) {
      try {
        await this.approve(id, enterpriseId, userId, comment);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          id,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return result;
  }

  /**
   * 获取待审核凭证列表
   */
  async getPendingVouchers(
    enterpriseId: number,
    options?: {
      page?: number;
      pageSize?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ list: VoucherDetail[]; total: number }> {
    const { page = 1, pageSize = 20, startDate, endDate } = options || {};

    const conditions = [
      eq(schema.vouchers.enterpriseId, enterpriseId),
      eq(schema.vouchers.status, 'pending'),
    ];

    if (startDate) {
      conditions.push(gte(schema.vouchers.voucherDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(schema.vouchers.voucherDate, endDate));
    }

    // 查询总数
    const [countResult] = await this.db
      .select({ count: schema.vouchers.id })
      .from(schema.vouchers)
      .where(and(...conditions));

    // 查询列表
    const vouchers = await this.db
      .select()
      .from(schema.vouchers)
      .where(and(...conditions))
      .orderBy(desc(schema.vouchers.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 获取详情
    const list = await Promise.all(
      vouchers.map((v) => this.getVoucherDetail(v.id, enterpriseId)),
    );

    return { list, total: countResult?.count || 0 };
  }

  /**
   * 获取凭证列表
   */
  async getVoucherList(
    enterpriseId: number,
    options?: {
      status?: VoucherStatus;
      page?: number;
      pageSize?: number;
      startDate?: Date;
      endDate?: Date;
      sourceType?: string;
    },
  ): Promise<{ list: VoucherDetail[]; total: number }> {
    const {
      status,
      page = 1,
      pageSize = 20,
      startDate,
      endDate,
      sourceType,
    } = options || {};

    const conditions = [eq(schema.vouchers.enterpriseId, enterpriseId)];

    if (status) {
      conditions.push(eq(schema.vouchers.status, status));
    }
    if (sourceType) {
      conditions.push(eq(schema.vouchers.sourceType, sourceType));
    }
    if (startDate) {
      conditions.push(gte(schema.vouchers.voucherDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(schema.vouchers.voucherDate, endDate));
    }

    // 查询总数
    const countResult = await this.db
      .select({ count: schema.vouchers.id })
      .from(schema.vouchers)
      .where(and(...conditions));

    // 查询列表
    const vouchers = await this.db
      .select()
      .from(schema.vouchers)
      .where(and(...conditions))
      .orderBy(desc(schema.vouchers.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 获取详情
    const list = await Promise.all(
      vouchers.map((v) => this.getVoucherDetail(v.id, enterpriseId)),
    );

    return { list, total: countResult[0]?.count || 0 };
  }

  /**
   * 检查用户是否有审核权限
   * 这里简化处理，实际应该根据角色权限判断
   */
  async checkAuditPermission(
    userId: number,
    enterpriseId: number,
  ): Promise<boolean> {
    // 这里可以实现更复杂的权限检查
    // 例如：只有财务主管或管理员可以审核
    return true;
  }

  /**
   * 获取凭证状态流转图
   */
  getStatusFlow(): Record<VoucherStatus, VoucherStatus[]> {
    return {
      draft: ['pending', 'void'],
      pending: ['approved', 'rejected', 'void'],
      approved: ['posted', 'void'],
      rejected: ['pending', 'void'],
      posted: [], // 已过账的凭证需要通过冲销来反转
      void: [], // 已作废的凭证不能再流转
    };
  }
}
