import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import type { ApprovalStep } from '../../../db/schema/oa';
import type {
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
  ApprovalActionDto,
} from '../dtos/approval-flow.dto';

function cleanThreshold(t?: { gte?: number; lte?: number }) {
  if (!t) return undefined;
  const out: { gte?: number; lte?: number } = {};
  if (typeof t.gte === 'number' && Number.isFinite(t.gte)) out.gte = t.gte;
  if (typeof t.lte === 'number' && Number.isFinite(t.lte)) out.lte = t.lte;
  return Object.keys(out).length ? out : undefined;
}

function cleanCondition(c?: ApprovalStep['condition']): ApprovalStep['condition'] | undefined {
  if (!c) return undefined;
  const amount = cleanThreshold(c.amount);
  const days = cleanThreshold(c.days);
  if (!amount && !days) return undefined;
  return {
    ...(amount ? { amount } : {}),
    ...(days ? { days } : {}),
  };
}

function normalizeSteps(raw: ApprovalStep[]): ApprovalStep[] {
  if (!raw?.length) {
    throw new BadRequestException('审批流程至少包含一个步骤');
  }
  const sorted = [...raw].sort((a, b) => a.step - b.step);
  return sorted.map((s, i) => {
    const step: ApprovalStep = {
      role: s.role,
      step: i + 1,
    };
    if (typeof s.userId === 'number' && Number.isInteger(s.userId) && s.userId > 0) {
      step.userId = s.userId;
    }
    const cond = cleanCondition(s.condition);
    if (cond) step.condition = cond;
    return step;
  });
}

@Injectable()
export class ApprovalFlowService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb
  ) {}

  async createFlow(enterpriseId: number, dto: CreateApprovalFlowDto) {
    const steps = normalizeSteps(dto.steps as ApprovalStep[]);
    const [flow] = await this.db
      .insert(schema.approvalFlows)
      .values({
        enterpriseId,
        name: dto.name,
        type: dto.type,
        steps,
      })
      .returning();
    return flow;
  }

  async findAllFlows(enterpriseId: number) {
    return this.db
      .select()
      .from(schema.approvalFlows)
      .where(eq(schema.approvalFlows.enterpriseId, enterpriseId))
      .orderBy(desc(schema.approvalFlows.createdAt));
  }

  async findFlowById(id: number, enterpriseId: number) {
    const [flow] = await this.db
      .select()
      .from(schema.approvalFlows)
      .where(and(eq(schema.approvalFlows.id, id), eq(schema.approvalFlows.enterpriseId, enterpriseId)));
    if (!flow) throw new NotFoundException('审批流程不存在');
    return flow;
  }

  async findFlowByType(type: string, enterpriseId: number) {
    const [flow] = await this.db
      .select()
      .from(schema.approvalFlows)
      .where(
        and(
          eq(schema.approvalFlows.type, type as 'purchase' | 'sales' | 'reimbursement' | 'leave'),
          eq(schema.approvalFlows.enterpriseId, enterpriseId),
          eq(schema.approvalFlows.status, 'active')
        )
      );
    return flow;
  }

  async updateFlow(id: number, enterpriseId: number, dto: UpdateApprovalFlowDto) {
    await this.findFlowById(id, enterpriseId);
    const stepsPatch = dto.steps
      ? normalizeSteps(dto.steps as ApprovalStep[])
      : undefined;
    const [flow] = await this.db
      .update(schema.approvalFlows)
      .set({
        ...(dto.name && { name: dto.name }),
        ...(stepsPatch && { steps: stepsPatch }),
        ...(dto.status && { status: dto.status }),
      })
      .where(and(eq(schema.approvalFlows.id, id), eq(schema.approvalFlows.enterpriseId, enterpriseId)))
      .returning();
    return flow;
  }

  async deleteFlow(id: number, enterpriseId: number) {
    await this.findFlowById(id, enterpriseId);
    await this.db
      .delete(schema.approvalFlows)
      .where(and(eq(schema.approvalFlows.id, id), eq(schema.approvalFlows.enterpriseId, enterpriseId)));
    return { success: true };
  }

  // 创建审批记录
  async createApprovalRecord(
    flowId: number,
    businessType: string,
    businessId: number,
    title: string,
    submittedBy: number,
    remark?: string
  ) {
    const [record] = await this.db
      .insert(schema.approvalRecords)
      .values({
        flowId,
        businessType,
        businessId,
        title,
        submittedBy,
        remark,
        status: 'pending',
        currentStep: 1,
      })
      .returning();
    return record;
  }

  // 处理审批动作
  async processApproval(
    recordId: number,
    userId: number,
    dto: ApprovalActionDto
  ) {
    const [record] = await this.db
      .select()
      .from(schema.approvalRecords)
      .where(eq(schema.approvalRecords.id, recordId));

    if (!record) throw new NotFoundException('审批记录不存在');
    if (record.status !== 'pending') throw new Error('该审批已处理');

    const { action, comment, transferToUserId } = dto;

    if (action === 'approve') {
      // 获取流程定义
      const [flow] = await this.db
        .select()
        .from(schema.approvalFlows)
        .where(eq(schema.approvalFlows.id, record.flowId));

      const steps = (flow?.steps as ApprovalStep[]) || [];
      const nextStep = record.currentStep + 1;

      if (nextStep > steps.length) {
        // 审批完成
        const [updated] = await this.db
          .update(schema.approvalRecords)
          .set({
            status: 'approved',
            approvedBy: userId,
            comment,
            approvedAt: new Date(),
          })
          .where(eq(schema.approvalRecords.id, recordId))
          .returning();
        return { ...updated, completed: true };
      } else {
        // 进入下一步
        const [updated] = await this.db
          .update(schema.approvalRecords)
          .set({ currentStep: nextStep })
          .where(eq(schema.approvalRecords.id, recordId))
          .returning();
        return { ...updated, completed: false };
      }
    } else if (action === 'reject') {
      const [updated] = await this.db
        .update(schema.approvalRecords)
        .set({
          status: 'rejected',
          approvedBy: userId,
          comment,
          approvedAt: new Date(),
        })
        .where(eq(schema.approvalRecords.id, recordId))
        .returning();
      return { ...updated, completed: true };
    } else if (action === 'transfer') {
      // 转签逻辑 - 更新当前步骤的审批人
      const [flow] = await this.db
        .select()
        .from(schema.approvalFlows)
        .where(eq(schema.approvalFlows.id, record.flowId));

      const steps = [...((flow?.steps as ApprovalStep[]) || [])];
      const currentStepIndex = record.currentStep - 1;

      if (steps[currentStepIndex] && transferToUserId) {
        steps[currentStepIndex] = {
          ...steps[currentStepIndex],
          userId: transferToUserId,
        };

        await this.db
          .update(schema.approvalFlows)
          .set({ steps })
          .where(eq(schema.approvalFlows.id, record.flowId));
      }

      return { ...record, transferred: true };
    }

    return record;
  }

  // 获取待审批列表
  async getPendingApprovals(userRole: string, enterpriseId: number) {
    // 这里简化处理，实际应该根据角色和步骤匹配
    return this.db
      .select({
        record: schema.approvalRecords,
        flow: schema.approvalFlows,
      })
      .from(schema.approvalRecords)
      .innerJoin(schema.approvalFlows, eq(schema.approvalRecords.flowId, schema.approvalFlows.id))
      .where(
        and(
          eq(schema.approvalRecords.status, 'pending'),
          eq(schema.approvalFlows.enterpriseId, enterpriseId)
        )
      )
      .orderBy(desc(schema.approvalRecords.createdAt));
  }

  // 获取我的审批记录
  async getMyApprovals(userId: number) {
    return this.db
      .select({
        record: schema.approvalRecords,
        flow: schema.approvalFlows,
      })
      .from(schema.approvalRecords)
      .innerJoin(schema.approvalFlows, eq(schema.approvalRecords.flowId, schema.approvalFlows.id))
      .where(eq(schema.approvalRecords.submittedBy, userId))
      .orderBy(desc(schema.approvalRecords.createdAt));
  }
}
