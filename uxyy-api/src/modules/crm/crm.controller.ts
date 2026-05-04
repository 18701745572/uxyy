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

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

@ApiTags('crm')
@Controller('crm')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Public()
  @Get('ping')
  @ApiOperation({
    summary: 'CRM 模块占位（无需鉴权；业务路由演进后按需改为 Bearer）',
  })
  ping() {
    return { ok: true, module: 'crm' };
  }

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: '未登录或未绑定企业上下文' })
  @Get('customers')
  @ApiOperation({ summary: '客户分页列表（按 JWT 中 enterpriseId 过滤）' })
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
    });
  }

  @ApiBearerAuth()
  @Post('customers')
  @ApiOperation({ summary: '创建客户' })
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
  @ApiOperation({ summary: '删除客户' })
  async deleteCustomer(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.crm.remove(id, enterpriseIdFromRequest(req));
  }
}
