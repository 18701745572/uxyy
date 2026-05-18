import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import {
  NotificationService,
  type NotificationType,
} from '../services/notification.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('oa/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  findByUser(
    @Req() req: Request & { user: UserContext },
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('isRead') isRead?: string,
    @Query('type') type?: NotificationType,
  ) {
    return this.service.findByUser({
      userId: req.user.userId,
      page: page ?? 1,
      pageSize: pageSize ?? 10,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      type,
    });
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: Request & { user: UserContext }) {
    return this.service.getUnreadCount(req.user.userId);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.markAsRead(id, req.user.userId);
  }

  @Post('read-all')
  markAllAsRead(@Req() req: Request & { user: UserContext }) {
    return this.service.markAllAsRead(req.user.userId);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.delete(id, req.user.userId);
  }

  /**
   * 生成示例通知数据（用于演示）
   * 仅在开发环境使用
   */
  @Post('seed-demo')
  async seedDemoNotifications(@Req() req: Request & { user: UserContext }) {
    const userId = req.user.userId;

    // 价格预警通知
    await this.service.sendPriceAlertNotification({
      userId,
      productId: 1,
      productName: '示例商品 SKU-001',
      priceChange: 18.5,
      threshold: 15,
    });

    // 系统欢迎通知
    await this.service.sendWelcomeNotification(userId);

    // 经营洞察通知
    await this.service.sendInsightFeatureNotification(userId);

    return { ok: true, message: '示例通知已生成' };
  }
}
