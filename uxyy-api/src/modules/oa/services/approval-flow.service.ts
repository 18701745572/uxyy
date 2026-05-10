import {
  BadRequestException,
  ForbiddenException,
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
import {
  isBossRole,
  normalizeEnterpriseRole,
  UxyyRole,
} from '../../auth/role-permissions';

@Injectable()
export class ApprovalFlowService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb
  ) {}

  async createFlow(enterpriseId: number, dto: CreateApprovalFlowDto) {
    const [flow] = await this.db
      .insert(schema.approvalFlows)
      .values({
        enterpriseId,
        name: dto.name,
        type: dto.type,
        steps: dto.steps as ApprovalStep[],
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

  /**
   * 保证存在一条可用的「请假」或「报销」类审批定义；若企业从未配置，
   * 则自动写入单级默认流程（与「无流程自动通过」相比，产品与补卡等行为一致：**须审批后才通过**）。
   */
  async ensureActiveFlowOrDefault(
    enterpriseId: number,
    type: 'leave' | 'reimbursement',
  ): Promise<typeof schema.approvalFlows.$inferSelect> {
    const existing = await this.findFlowByType(type, enterpriseId);
    if (existing) return existing;

    const steps: ApprovalStep[] = [{ step: 1, role: UxyyRole.BOSS }];
    const name =
      type === 'leave'
        ? '系统默认 · 请假审批（单级·可改）'
        : '系统默认 · 报销审批（单级·可改）';

    const [flow] = await this.db
      .insert(schema.approvalFlows)
      .values({
        enterpriseId,
        name,
        type,
        steps,
        status: 'active',
      })
      .returning();

    if (!flow) {
      throw new NotFoundException(
        type === 'leave'
          ? '无法创建默认请假审批流'
          : '无法创建默认报销审批流',
      );
    }
    return flow;
  }

  async updateFlow(id: number, enterpriseId: number, dto: UpdateApprovalFlowDto) {
    await this.findFlowById(id, enterpriseId);
    const [flow] = await this.db
      .update(schema.approvalFlows)
      .set({
        ...(dto.name && { name: dto.name }),
        ...(dto.steps && { steps: dto.steps as ApprovalStep[] }),
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

  /** 终态审批（通过/驳回）后同步请假、报销等业务单状态 */
  private async syncBusinessDocumentAfterTerminalApproval(
    record: typeof schema.approvalRecords.$inferSelect,
    outcome: 'approved' | 'rejected',
  ) {
    const bid = record.businessId;
    if (bid == null) return;

    switch (record.businessType) {
      case 'leave':
        await this.db
          .update(schema.leaveRequests)
          .set({ status: outcome, updatedAt: new Date() })
          .where(eq(schema.leaveRequests.id, bid));
        break;
      case 'expense':
      case 'reimbursement':
        await this.db
          .update(schema.expenseRequests)
          .set({ status: outcome, updatedAt: new Date() })
          .where(eq(schema.expenseRequests.id, bid));
        break;
      default:
        break;
    }
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
    if (record.status !== 'pending') {
      throw new BadRequestException('该审批已处理');
    }

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
        await this.syncBusinessDocumentAfterTerminalApproval(record, 'approved');
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
      await this.syncBusinessDocumentAfterTerminalApproval(record, 'rejected');
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

  private assertLegacyActorMatchesStep(
    record: typeof schema.approvalRecords.$inferSelect,
    flow: typeof schema.approvalFlows.$inferSelect,
    userRole: string,
  ): void {
    const steps = (flow.steps as ApprovalStep[]) || [];
    const currentStepDef = steps.find((s) => s.step === record.currentStep);
    if (!currentStepDef) {
      throw new BadRequestException('审批流程步骤异常');
    }

    const userCanonical = normalizeEnterpriseRole(userRole);
    const stepCanonical = normalizeEnterpriseRole(currentStepDef.role);
    const stepMatches =
      userCanonical != null &&
      stepCanonical != null &&
      userCanonical === stepCanonical;
    const bossOverride = isBossRole(userRole);
    if (!stepMatches && !bossOverride) {
      throw new ForbiddenException(
        '当前审批步骤需要角色: ' + currentStepDef.role,
      );
    }
  }

  /**
   * 旧 `/auth/approvals/:id/action`：**同意/驳回** 与 OA `records/:id/action` 一致走 {@link processApproval}（同步请假/报销等）。
   * **取消**：仅了结审批实例，与 OA 惯例一致，不反向同步请假/报销业务单。
   */
  async processLegacyAuthAction(
    recordId: number,
    userId: number,
    userRole: string,
    dto: { action: string; comment?: string },
  ): Promise<{
    approvalId: number;
    status: string;
    approvedBy: number;
    approvedAt: string;
    nextStep: number | null;
  }> {
    const actionNorm = dto.action?.trim().toLowerCase();
    if (!actionNorm || !['approve', 'reject', 'cancel'].includes(actionNorm)) {
      throw new BadRequestException('不支持的操作类型');
    }

    const [record] = await this.db
      .select()
      .from(schema.approvalRecords)
      .where(eq(schema.approvalRecords.id, recordId))
      .limit(1);

    if (!record) throw new NotFoundException('审批单不存在');
    if (record.status !== 'pending') {
      throw new BadRequestException('审批单状态不允许操作');
    }

    const [flow] = await this.db
      .select()
      .from(schema.approvalFlows)
      .where(eq(schema.approvalFlows.id, record.flowId))
      .limit(1);

    if (!flow || flow.status !== 'active') {
      throw new NotFoundException('审批流程不存在或已停用');
    }

    this.assertLegacyActorMatchesStep(record, flow, userRole);

    const respondedAt = new Date().toISOString();

    if (actionNorm === 'cancel') {
      await this.db
        .update(schema.approvalRecords)
        .set({
          status: 'cancelled',
          approvedBy: userId,
          comment: dto.comment ?? null,
          approvedAt: new Date(),
        })
        .where(eq(schema.approvalRecords.id, recordId));

      return {
        approvalId: recordId,
        status: 'cancelled',
        approvedBy: userId,
        approvedAt: respondedAt,
        nextStep: null,
      };
    }

    if (actionNorm === 'reject') {
      await this.processApproval(recordId, userId, {
        action: 'reject',
        comment: dto.comment,
      });
      return {
        approvalId: recordId,
        status: 'rejected',
        approvedBy: userId,
        approvedAt: respondedAt,
        nextStep: null,
      };
    }

    const pr = await this.processApproval(recordId, userId, {
      action: 'approve',
      comment: dto.comment,
    });

    const out = pr as Record<string, unknown>;
    const completed = out.completed === true;
    const status =
      typeof out.status === 'string' ? out.status : String(out.status ?? 'pending');
    const nextStepNum = out.currentStep;
    const nextStep =
      completed || typeof nextStepNum !== 'number' ? null : nextStepNum;

    return {
      approvalId: recordId,
      status,
      approvedBy: userId,
      approvedAt: respondedAt,
      nextStep,
    };
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
