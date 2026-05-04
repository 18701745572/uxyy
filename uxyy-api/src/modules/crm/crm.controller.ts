import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CrmService } from './crm.service';
import type { CreateCustomerDto, UpdateCustomerDto } from './crm.service';

@ApiTags('crm')
@ApiBearerAuth()
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('customers')
  @ApiOperation({ summary: '获取客户列表' })
  async getCustomers(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('keyword') keyword?: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.crmService.findCustomersPage({
      enterpriseId,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      keyword,
    });
  }

  @Get('customers/:id')
  @ApiOperation({ summary: '获取客户详情' })
  async getCustomerById(@Req() req: Request, @Param('id') id: string) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.crmService.getCustomerById(enterpriseId, parseInt(id, 10));
  }

  @Post('customers')
  @ApiOperation({ summary: '创建客户' })
  async createCustomer(@Req() req: Request, @Body() dto: CreateCustomerDto) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.crmService.createCustomer(enterpriseId, dto);
  }

  @Put('customers/:id')
  @ApiOperation({ summary: '更新客户' })
  async updateCustomer(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.crmService.updateCustomer(enterpriseId, parseInt(id, 10), dto);
  }

  @Delete('customers/:id')
  @ApiOperation({ summary: '删除客户' })
  async deleteCustomer(@Req() req: Request, @Param('id') id: string) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.crmService.deleteCustomer(enterpriseId, parseInt(id, 10));
  }

  @Get('ping')
  @ApiOperation({ summary: 'CRM模块健康检查' })
  ping() {
    return { ok: true, module: 'crm' };
  }
}
