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
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryDto,
} from '../dtos/leave-request.dto';
import { isBossRole } from '../../auth/role-permissions';

@Injectable()
export class LeaveRequestService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly approvalFlowService: ApprovalFlowService
  ) {}

  async create(enterpriseId: number, userId: number, userRole: string, dto: CreateLeaveRequestDto) {
    // 老板的请假申请自动通过，无需审批
    const isBoss = isBossRole(userRole);
    const status = isBoss ? 'approved' : 'pending';

    const [leave] = await this.db
      .insert(schema.leaveRequests)
      .values({
        enterpriseId,
        userId,
        type: dto.type,
        startDate: dto.startDate,
        endDate: dto.endDate,
        days: dto.days,
        reason: dto.reason,
        status,
      })
      .returning();

    if (!leave) throw new NotFoundException('创建请假申请失败');

    // 非老板用户需要创建审批记录
    if (!isBoss) {
      const flow = await this.approvalFlowService.ensureActiveFlowOrDefault(
        enterpriseId,
        'leave',
      );

      const record = await this.approvalFlowService.createApprovalRecord(
        flow.id,
        'leave',
        leave.id,
        `${dto.type}申请 - ${dto.days}天`,
        userId,
        dto.reason,
      );

      await this.db
        .update(schema.leaveRequests)
        .set({ approvalRecordId: record.id })
        .where(eq(schema.leaveRequests.id, leave.id));

      return { ...leave, approvalRecordId: record.id };
    }

    return leave;
  }

  async findAll(enterpriseId: number, query: LeaveRequestQueryDto) {
    let conditions = eq(schema.leaveRequests.enterpriseId, enterpriseId) as any;

    if (query.status) {
      conditions = and(conditions, eq(schema.leaveRequests.status, query.status));
    }
    if (query.type) {
      conditions = and(conditions, eq(schema.leaveRequests.type, query.type));
    }
    if (query.startDate) {
      conditions = and(conditions, gte(schema.leaveRequests.startDate, query.startDate));
    }
    if (query.endDate) {
      conditions = and(conditions, lte(schema.leaveRequests.endDate, query.endDate));
    }

    return this.db
      .select()
      .from(schema.leaveRequests)
      .where(conditions)
      .orderBy(desc(schema.leaveRequests.createdAt));
  }

  async findById(id: number, enterpriseId: number) {
    const [leave] = await this.db
      .select()
      .from(schema.leaveRequests)
      .where(and(eq(schema.leaveRequests.id, id), eq(schema.leaveRequests.enterpriseId, enterpriseId)));

    if (!leave) throw new NotFoundException('请假申请不存在');
    return leave;
  }

  async findMyLeaves(userId: number, enterpriseId: number) {
    return this.db
      .select()
      .from(schema.leaveRequests)
      .where(and(eq(schema.leaveRequests.userId, userId), eq(schema.leaveRequests.enterpriseId, enterpriseId)))
      .orderBy(desc(schema.leaveRequests.createdAt));
  }

  async update(id: number, enterpriseId: number, userId: number, dto: UpdateLeaveRequestDto) {
    const leave = await this.findById(id, enterpriseId);

    // 只能修改自己的待审批申请
    if (leave.userId !== userId) {
      throw new ForbiddenException('无权修改此申请');
    }
    if (leave.status !== 'pending') {
      throw new BadRequestException('已审批的申请不能修改');
    }

    const [updated] = await this.db
      .update(schema.leaveRequests)
      .set({
        ...(dto.type && { type: dto.type }),
        ...(dto.startDate && { startDate: dto.startDate }),
        ...(dto.endDate && { endDate: dto.endDate }),
        ...(dto.days && { days: dto.days }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.leaveRequests.id, id), eq(schema.leaveRequests.enterpriseId, enterpriseId)))
      .returning();

    return updated;
  }

  async cancel(id: number, enterpriseId: number, userId: number) {
    const leave = await this.findById(id, enterpriseId);

    if (leave.userId !== userId) {
      throw new ForbiddenException('无权取消此申请');
    }
    if (leave.status !== 'pending') {
      throw new BadRequestException('已审批的申请不能取消');
    }

    const [updated] = await this.db
      .update(schema.leaveRequests)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(schema.leaveRequests.id, id), eq(schema.leaveRequests.enterpriseId, enterpriseId)))
      .returning();

    // 同时取消关联的审批记录
    if (leave.approvalRecordId) {
      await this.db
        .update(schema.approvalRecords)
        .set({ status: 'cancelled' })
        .where(eq(schema.approvalRecords.id, leave.approvalRecordId));
    }

    return updated;
  }

  // 审批回调 - 更新请假状态
  async updateStatusByApprovalRecord(recordId: number, status: 'approved' | 'rejected') {
    const [leave] = await this.db
      .select()
      .from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.approvalRecordId, recordId));

    if (leave) {
      await this.db
        .update(schema.leaveRequests)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.leaveRequests.id, leave.id));
    }

    return leave;
  }
}
