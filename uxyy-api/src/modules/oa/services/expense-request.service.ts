import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import { ApprovalFlowService } from './approval-flow.service';
import type {
  CreateExpenseRequestDto,
  UpdateExpenseRequestDto,
  ExpenseRequestQueryDto,
} from '../dtos/expense-request.dto';

@Injectable()
export class ExpenseRequestService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly approvalFlowService: ApprovalFlowService
  ) {}

  async create(enterpriseId: number, userId: number, dto: CreateExpenseRequestDto) {
    // 查找报销审批流程
    const flow = await this.approvalFlowService.findFlowByType('reimbursement', enterpriseId);

    // 创建报销申请
    const [expense] = await this.db
      .insert(schema.expenseRequests)
      .values({
        enterpriseId,
        userId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        attachments: dto.attachments || [],
        status: flow ? 'pending' : 'approved', // 无流程则自动通过
      })
      .returning();

    if (!expense) throw new NotFoundException('创建报销申请失败');

    // 如果有审批流程，创建审批记录
    if (flow) {
      const record = await this.approvalFlowService.createApprovalRecord(
        flow.id,
        'expense',
        expense.id,
        `${dto.type}报销 - ¥${dto.amount}`,
        userId,
        dto.description
      );

      // 更新报销记录的审批记录ID
      await this.db
        .update(schema.expenseRequests)
        .set({ approvalRecordId: record.id })
        .where(eq(schema.expenseRequests.id, expense.id));

      return { ...expense, approvalRecordId: record.id };
    }

    return expense;
  }

  async findAll(enterpriseId: number, query: ExpenseRequestQueryDto) {
    let conditions = eq(schema.expenseRequests.enterpriseId, enterpriseId) as any;

    if (query.status) {
      conditions = and(conditions, eq(schema.expenseRequests.status, query.status));
    }
    if (query.type) {
      conditions = and(conditions, eq(schema.expenseRequests.type, query.type));
    }
    if (query.startDate) {
      conditions = and(conditions, gte(schema.expenseRequests.createdAt, new Date(query.startDate)));
    }
    if (query.endDate) {
      conditions = and(conditions, lte(schema.expenseRequests.createdAt, new Date(query.endDate)));
    }

    return this.db
      .select()
      .from(schema.expenseRequests)
      .where(conditions)
      .orderBy(desc(schema.expenseRequests.createdAt));
  }

  async findById(id: number, enterpriseId: number) {
    const [expense] = await this.db
      .select()
      .from(schema.expenseRequests)
      .where(and(eq(schema.expenseRequests.id, id), eq(schema.expenseRequests.enterpriseId, enterpriseId)));

    if (!expense) throw new NotFoundException('报销申请不存在');
    return expense;
  }

  async findMyExpenses(userId: number, enterpriseId: number) {
    return this.db
      .select()
      .from(schema.expenseRequests)
      .where(and(eq(schema.expenseRequests.userId, userId), eq(schema.expenseRequests.enterpriseId, enterpriseId)))
      .orderBy(desc(schema.expenseRequests.createdAt));
  }

  async update(id: number, enterpriseId: number, userId: number, dto: UpdateExpenseRequestDto) {
    const expense = await this.findById(id, enterpriseId);

    // 只能修改自己的待审批申请
    if (expense.userId !== userId) {
      throw new ForbiddenException('无权修改此申请');
    }
    if (expense.status !== 'pending') {
      throw new BadRequestException('已审批的申请不能修改');
    }

    const [updated] = await this.db
      .update(schema.expenseRequests)
      .set({
        ...(dto.type && { type: dto.type }),
        ...(dto.amount && { amount: dto.amount }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.attachments && { attachments: dto.attachments }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.expenseRequests.id, id), eq(schema.expenseRequests.enterpriseId, enterpriseId)))
      .returning();

    return updated;
  }

  async cancel(id: number, enterpriseId: number, userId: number) {
    const expense = await this.findById(id, enterpriseId);

    if (expense.userId !== userId) {
      throw new ForbiddenException('无权取消此申请');
    }
    if (expense.status !== 'pending') {
      throw new BadRequestException('已审批的申请不能取消');
    }

    const [updated] = await this.db
      .update(schema.expenseRequests)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(schema.expenseRequests.id, id), eq(schema.expenseRequests.enterpriseId, enterpriseId)))
      .returning();

    // 同时取消关联的审批记录
    if (expense.approvalRecordId) {
      await this.db
        .update(schema.approvalRecords)
        .set({ status: 'cancelled' })
        .where(eq(schema.approvalRecords.id, expense.approvalRecordId));
    }

    return updated;
  }

  // 更新OCR数据
  async updateOcrData(id: number, enterpriseId: number, ocrData: Record<string, unknown>) {
    const [updated] = await this.db
      .update(schema.expenseRequests)
      .set({ ocrData, updatedAt: new Date() })
      .where(and(eq(schema.expenseRequests.id, id), eq(schema.expenseRequests.enterpriseId, enterpriseId)))
      .returning();

    return updated;
  }

  // 审批回调 - 更新报销状态
  async updateStatusByApprovalRecord(recordId: number, status: 'approved' | 'rejected') {
    const [expense] = await this.db
      .select()
      .from(schema.expenseRequests)
      .where(eq(schema.expenseRequests.approvalRecordId, recordId));

    if (expense) {
      await this.db
        .update(schema.expenseRequests)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.expenseRequests.id, expense.id));
    }

    return expense;
  }
}
