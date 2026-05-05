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
import type { Express } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CrmService } from './crm.service';
import {
  CreateCustomerDto,
  CustomerListQueryDto,
  CustomerListResponseDto,
  CustomerResponseDto,
  UpdateCustomerDto,
} from './dto/customer.dto';
import {
  CreateFollowUpDto,
  FollowUpListQueryDto,
  FollowUpListResponseDto,
  FollowUpResponseDto,
  UpdateFollowUpDto,
} from './dto/follow-up.dto';

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

function userIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { userId?: unknown }).userId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

@ApiTags('crm')
@Controller('crm')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'CRM 模块健康检查（无需鉴权）' })
  ping() {
    return { ok: true, module: 'crm' };
  }

  // ─── Customers ──────────────────────────────────────────────────

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: '未登录或未绑定企业上下文' })
  @Get('customers')
  @ApiOperation({ summary: '客户分页列表（支持筛选与搜索）' })
  async listCustomers(
    @Req() req: Express.Request,
    @Query() query: CustomerListQueryDto,
  ): Promise<CustomerListResponseDto> {
    const page =
      typeof query.page === 'number' && query.page >= 1 ? query.page : 1;
    const pageSize =
      typeof query.pageSize === 'number' &&
      query.pageSize >= 1 &&
      query.pageSize <= 100
        ? query.pageSize
        : 20;
    return this.crm.findPage({
      enterpriseId: enterpriseIdFromRequest(req),
      page,
      pageSize,
      type: query.type,
      level: query.level,
      industry: query.industry,
      search: query.search,
      isDeleted: query.isDeleted,
    });
  }

  @ApiBearerAuth()
  @Post('customers')
  @ApiOperation({ summary: '创建客户（含重复检测，传 force=true 可跳过）' })
  async createCustomer(
    @Req() req: Express.Request,
    @Body() body: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.crm.create(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Get('customers/:id')
  @ApiOperation({ summary: '客户详情' })
  async getCustomer(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CustomerResponseDto> {
    return this.crm.findOne(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Patch('customers/:id')
  @ApiOperation({ summary: '更新客户（部分字段）' })
  async patchCustomer(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.crm.update(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Delete('customers/:id')
  @ApiOperation({ summary: '删除客户（软删除，标记 isDeleted）' })
  async deleteCustomer(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.crm.remove(id, enterpriseIdFromRequest(req));
  }

  // ─── Follow-up records ──────────────────────────────────────────

  @ApiBearerAuth()
  @Get('customers/:id/follow-ups')
  @ApiOperation({ summary: '客户跟进记录分页列表' })
  async listFollowUps(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: FollowUpListQueryDto,
  ): Promise<FollowUpListResponseDto> {
    const page =
      typeof query.page === 'number' && query.page >= 1 ? query.page : 1;
    const pageSize =
      typeof query.pageSize === 'number' &&
      query.pageSize >= 1 &&
      query.pageSize <= 100
        ? query.pageSize
        : 20;
    return this.crm.findFollowUps({
      customerId: id,
      enterpriseId: enterpriseIdFromRequest(req),
      page,
      pageSize,
    });
  }

  @ApiBearerAuth()
  @Post('customers/:id/follow-ups')
  @ApiOperation({ summary: '创建跟进记录' })
  async createFollowUp(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateFollowUpDto,
  ): Promise<FollowUpResponseDto> {
    return this.crm.createFollowUp(
      id,
      enterpriseIdFromRequest(req),
      userIdFromRequest(req),
      body,
    );
  }

  @ApiBearerAuth()
  @Patch('customers/:id/follow-ups/:fid')
  @ApiOperation({ summary: '更新跟进记录' })
  async patchFollowUp(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('fid', ParseIntPipe) fid: number,
    @Body() body: UpdateFollowUpDto,
  ): Promise<FollowUpResponseDto> {
    return this.crm.updateFollowUp(fid, id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Delete('customers/:id/follow-ups/:fid')
  @ApiOperation({ summary: '删除跟进记录' })
  async deleteFollowUp(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('fid', ParseIntPipe) fid: number,
  ) {
    return this.crm.removeFollowUp(fid, id, enterpriseIdFromRequest(req));
  }

  // ─── Stats ──────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('customers/:id/stats')
  @ApiOperation({ summary: '客户行为统计（跟进次数、最近跟进等）' })
  async getCustomerStats(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.crm.getCustomerStats(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Get('stats')
  @ApiOperation({ summary: '企业客户概览统计（总数、本月新增、分布）' })
  async getOverviewStats(@Req() req: Express.Request) {
    return this.crm.getOverviewStats(enterpriseIdFromRequest(req));
  }
}
