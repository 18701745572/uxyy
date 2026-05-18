import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { and, eq, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

/**
 * 通知推送服务
 * 使用 WebSocket 实现实时通知推送
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
@Injectable()
export class NotificationPushService {
  private readonly logger = new Logger(NotificationPushService.name);

  @WebSocketServer()
  server: Server;

  // 用户ID到Socket的映射
  private userSockets: Map<number, Socket> = new Map();

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /**
   * 客户端连接时
   */
  handleConnection(client: Socket) {
    this.logger.log(`客户端连接: ${client.id}`);
  }

  /**
   * 客户端断开时
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`客户端断开: ${client.id}`);
    // 从映射中移除
    for (const [userId, socket] of this.userSockets.entries()) {
      if (socket.id === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  /**
   * 用户加入通知房间
   */
  @SubscribeMessage('join')
  async handleJoin(client: Socket, payload: { userId: number; token: string }) {
    try {
      // 验证用户身份（简化版，实际应该验证JWT）
      const user = await this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, payload.userId))
        .limit(1);

      if (user.length === 0) {
        client.emit('error', { message: '用户不存在' });
        return;
      }

      // 保存用户Socket映射
      this.userSockets.set(payload.userId, client);

      // 加入用户专属房间
      client.join(`user:${payload.userId}`);

      client.emit('joined', { userId: payload.userId });
      this.logger.log(`用户 ${payload.userId} 加入通知房间`);

      // 发送未读通知数量
      const unreadCount = await this.getUnreadCount(payload.userId);
      client.emit('unread_count', { count: unreadCount });
    } catch (error) {
      this.logger.error('加入通知房间失败', error);
      client.emit('error', { message: '加入失败' });
    }
  }

  /**
   * 向指定用户推送通知
   */
  async pushNotificationToUser(
    userId: number,
    notification: {
      id: number;
      type: string;
      title: string;
      content: string;
      priority: string;
      createdAt: string;
    },
  ) {
    const socket = this.userSockets.get(userId);

    if (socket) {
      socket.emit('new_notification', notification);
      this.logger.log(`实时推送通知给用户 ${userId}: ${notification.title}`);
    }

    // 同时通过房间广播（确保多端同步）
    this.server.to(`user:${userId}`).emit('new_notification', notification);

    // 更新未读数量
    const unreadCount = await this.getUnreadCount(userId);
    this.server
      .to(`user:${userId}`)
      .emit('unread_count', { count: unreadCount });
  }

  /**
   * 向企业所有管理员推送通知
   */
  async pushNotificationToEnterpriseAdmins(
    enterpriseId: number,
    notification: {
      id: number;
      type: string;
      title: string;
      content: string;
      priority: string;
      createdAt: string;
    },
  ) {
    const admins = await this.db
      .select({ userId: schema.userEnterprises.userId })
      .from(schema.userEnterprises)
      .where(
        and(
          eq(schema.userEnterprises.enterpriseId, enterpriseId),
          eq(schema.userEnterprises.role, 'admin'),
        ),
      );

    for (const admin of admins) {
      await this.pushNotificationToUser(admin.userId, notification);
    }
  }

  /**
   * 获取用户未读通知数量
   */
  private async getUnreadCount(userId: number): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
        ),
      );

    return Number(result[0]?.count ?? 0);
  }

  /**
   * 广播系统通知给所有在线用户
   */
  broadcastSystemNotification(notification: {
    title: string;
    content: string;
    priority: string;
  }) {
    this.server.emit('system_notification', notification);
    this.logger.log('广播系统通知');
  }
}
