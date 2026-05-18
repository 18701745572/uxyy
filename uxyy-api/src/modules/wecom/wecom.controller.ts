import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { WeComService } from './wecom.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('wecom')
@Controller('wecom')
export class WeComController {
  constructor(private readonly weComService: WeComService) {}

  @ApiOperation({ summary: '获取企业微信部门列表' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('departments')
  async getDepartments() {
    return this.weComService.getDepartmentList();
  }

  @ApiOperation({ summary: '获取企业微信用户列表' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('users')
  async getUsers(@Query('departmentId') departmentId?: string) {
    const deptId = departmentId ? parseInt(departmentId) : undefined;
    return this.weComService.getUserList(deptId);
  }

  @ApiOperation({ summary: '获取企业微信用户信息' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getUserInfo(@Query('userId') userId: string) {
    return this.weComService.getUserInfo(userId);
  }

  @ApiOperation({ summary: '发送文本消息' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('send-text')
  async sendText(
    @Body('toUser') toUser: string,
    @Body('content') content: string,
  ) {
    return this.weComService.sendTextMessage(toUser, content);
  }

  @ApiOperation({ summary: '发送卡片消息' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('send-textcard')
  async sendTextCard(
    @Body('toUser') toUser: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('url') url: string,
    @Body('btnText') btnText?: string,
  ) {
    return this.weComService.sendTextCardMessage(
      toUser,
      title,
      description,
      url,
      btnText,
    );
  }

  @ApiOperation({ summary: '发送审批通知' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('send-approval')
  async sendApproval(
    @Body('toUser') toUser: string,
    @Body('title') title: string,
    @Body('content') content: string,
    @Body('approveUrl') approveUrl: string,
  ) {
    return this.weComService.sendApprovalNotification(
      toUser,
      title,
      content,
      approveUrl,
    );
  }

  @ApiOperation({ summary: '发送库存预警' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('send-stock-alert')
  async sendStockAlert(
    @Body('toUser') toUser: string,
    @Body('productName') productName: string,
    @Body('stock') stock: number,
    @Body('minStock') minStock: number,
  ) {
    return this.weComService.sendStockAlert(
      toUser,
      productName,
      stock,
      minStock,
    );
  }

  @ApiOperation({ summary: '发送价格异常告警' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('send-price-anomaly')
  async sendPriceAnomaly(
    @Body('toUser') toUser: string,
    @Body('productName') productName: string,
    @Body('orderType') orderType: string,
    @Body('price') price: number,
    @Body('normalPrice') normalPrice: number,
  ) {
    return this.weComService.sendPriceAnomalyAlert(
      toUser,
      productName,
      orderType,
      price,
      normalPrice,
    );
  }

  @ApiOperation({ summary: '获取企业微信OAuth授权URL' })
  @Get('oauth-url')
  async getOauthUrl(
    @Query('redirectUri') redirectUri: string,
    @Query('state') state?: string,
  ) {
    const url = this.weComService.getOAuthUrl(redirectUri, state);
    return { url };
  }

  @ApiOperation({ summary: '企业微信OAuth回调' })
  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state?: string) {
    const userId = await this.weComService.getUserIdByCode(code);
    if (userId) {
      return { success: true, userId, state };
    }
    return { success: false, message: '获取用户信息失败' };
  }
}
