import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

export type NotificationType = 'approval' | 'system' | 'reminder';
export type NotificationPriority = 'low' | 'normal' | 'high';

export interface CreateNotificationDto {
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  priority?: NotificationPriority;
  sourceType?: string;
  sourceId?: number;
  actionUrl?: string;
}

@Injectable()
export class NotificationService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /**
   * 创建通知
   */
  async create(dto: CreateNotificationDto) {
    const [notification] = await this.db
      .insert(schema.notifications)
      .values({
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        priority: dto.priority ?? 'normal',
        sourceType: dto.sourceType ?? null,
        sourceId: dto.sourceId ?? null,
        actionUrl: dto.actionUrl ?? null,
        isRead: false,
      })
      .returning();

    return this.mapNotification(notification);
  }

  /**
   * 批量创建通知
   */
  async createMany(dtos: CreateNotificationDto[]) {
    if (dtos.length === 0) return [];

    const notifications = await this.db
      .insert(schema.notifications)
      .values(
        dtos.map((dto) => ({
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          content: dto.content,
          priority: dto.priority ?? 'normal',
          sourceType: dto.sourceType ?? null,
          sourceId: dto.sourceId ?? null,
          actionUrl: dto.actionUrl ?? null,
          isRead: false,
        })),
      )
      .returning();

    return notifications.map((n) => this.mapNotification(n));
  }

  /**
   * 获取用户的通知列表
   */
  async findByUser(params: {
    userId: number;
    page: number;
    pageSize: number;
    isRead?: boolean;
    type?: NotificationType;
  }) {
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.notifications.userId, params.userId),
    ];

    if (params.isRead !== undefined) {
      conditions.push(eq(schema.notifications.isRead, params.isRead));
    }
    if (params.type) {
      conditions.push(eq(schema.notifications.type, params.type));
    }

    const whereClause = and(...conditions);

    const [data, totalResult, unreadCountResult] = await Promise.all([
      this.db
        .select()
        .from(schema.notifications)
        .where(whereClause)
        .orderBy(desc(schema.notifications.createdAt))
        .limit(params.pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(schema.notifications)
        .where(whereClause),
      this.db
        .select({ count: count() })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userId, params.userId),
            eq(schema.notifications.isRead, false),
          ),
        ),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);
    const unreadCount = Number(unreadCountResult[0]?.count ?? 0);

    return {
      data: data.map((n) => this.mapNotification(n)),
      total,
      unreadCount,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    };
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(id: number, userId: number) {
    const [updated] = await this.db
      .update(schema.notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, userId),
        ),
      )
      .returning();

    if (!updated) return null;
    return this.mapNotification(updated);
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: number) {
    await this.db
      .update(schema.notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
        ),
      );

    return { ok: true };
  }

  /**
   * 删除通知
   */
  async delete(id: number, userId: number) {
    await this.db
      .delete(schema.notifications)
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, userId),
        ),
      );

    return { ok: true };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: number) {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
        ),
      );

    return { count: Number(result?.count ?? 0) };
  }

  /**
   * 发送审批通知
   */
  async sendApprovalNotification(params: {
    userId: number;
    recordId: number;
    recordTitle: string;
    action: 'submit' | 'approve' | 'reject' | 'transfer';
    actorName?: string;
  }) {
    const { userId, recordId, recordTitle, action, actorName } = params;

    let title: string;
    let content: string;
    let priority: NotificationPriority = 'normal';

    switch (action) {
      case 'submit':
        title = '新的审批待处理';
        content = `您有一条新的审批申请需要处理：${recordTitle}`;
        priority = 'high';
        break;
      case 'approve':
        title = '审批已通过';
        content = `您的申请「${recordTitle}」已被${actorName || '审批人'}通过`;
        break;
      case 'reject':
        title = '审批已驳回';
        content = `您的申请「${recordTitle}」已被${actorName || '审批人'}驳回`;
        priority = 'high';
        break;
      case 'transfer':
        title = '审批已转交';
        content = `您的申请「${recordTitle}」已被转交给其他审批人`;
        break;
      default:
        title = '审批状态更新';
        content = `您的申请「${recordTitle}」状态已更新`;
    }

    return this.create({
      userId,
      type: 'approval',
      title,
      content,
      priority,
      sourceType: 'approval_record',
      sourceId: recordId,
      actionUrl: `/dashboard/oa/approval-records/${recordId}`,
    });
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(params: {
    userId: number;
    title: string;
    content: string;
    priority?: NotificationPriority;
  }) {
    return this.create({
      userId: params.userId,
      type: 'system',
      title: params.title,
      content: params.content,
      priority: params.priority ?? 'normal',
    });
  }

  private mapNotification(row: typeof schema.notifications.$inferSelect) {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      content: row.content,
      priority: row.priority,
      isRead: row.isRead,
      sourceType: row.sourceType ?? null,
      sourceId: row.sourceId ?? null,
      actionUrl: row.actionUrl ?? null,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
