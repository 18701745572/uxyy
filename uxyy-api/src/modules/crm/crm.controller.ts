import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../modules/auth/permissions.guard';
import { Permission } from '../../modules/auth/role-permissions';
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
import {
  CreateOpportunityDto,
  OpportunityListQueryDto,
  UpdateOpportunityDto,
} from './dto/opportunity.dto';
import {
  CreateCustomerCategoryDto,
  CustomerCategoryListQueryDto,
  UpdateCustomerCategoryDto,
} from './dto/customer-category.dto';

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
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
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
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post('customers')
  @ApiOperation({ summary: '创建客户（含重复检测，传 force=true 可跳过）' })
  async createCustomer(
    @Req() req: Express.Request,
    @Body() body: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.crm.create(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post('customers/import')
  @ApiOperation({
    summary:
      'Excel/CSV 导入客户（与导出列对齐；mode=skip 跳过重复，mode=force 强制写入）',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async importCustomers(
    @Req() req: Express.Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('mode') modeRaw?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传表格文件（xlsx / xls / csv）');
    }
    const mode = modeRaw === 'force' ? 'force' : 'skip';
    return this.crm.importCustomersFromSpreadsheet(
      enterpriseIdFromRequest(req),
      file.buffer,
      mode,
    );
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('customers/:id')
  @ApiOperation({ summary: '客户详情' })
  async getCustomer(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CustomerResponseDto> {
    return this.crm.findOne(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
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
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_DELETE)
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
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
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
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
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
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
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
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_DELETE)
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
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('customers/:id/stats')
  @ApiOperation({ summary: '客户行为统计（跟进次数、最近跟进等）' })
  async getCustomerStats(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.crm.getCustomerStats(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('stats')
  @ApiOperation({ summary: '企业客户概览统计（总数、本月新增、分布）' })
  async getOverviewStats(@Req() req: Express.Request) {
    return this.crm.getOverviewStats(enterpriseIdFromRequest(req));
  }

  // ─── Opportunities ──────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('opportunities')
  @ApiOperation({ summary: '商机分页列表（支持筛选与搜索）' })
  async listOpportunities(
    @Req() req: Express.Request,
    @Query() query: OpportunityListQueryDto,
  ) {
    const page =
      typeof query.page === 'number' && query.page >= 1 ? query.page : 1;
    const pageSize =
      typeof query.pageSize === 'number' &&
      query.pageSize >= 1 &&
      query.pageSize <= 100
        ? query.pageSize
        : 20;
    return this.crm.findOpportunities({
      enterpriseId: enterpriseIdFromRequest(req),
      page,
      pageSize,
      customerId: query.customerId,
      status: query.status,
      assignedTo: query.assignedTo,
      search: query.search,
    });
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post('opportunities')
  @ApiOperation({ summary: '创建商机' })
  async createOpportunity(
    @Req() req: Express.Request,
    @Body() body: CreateOpportunityDto,
  ) {
    return this.crm.createOpportunity(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('opportunities/:id')
  @ApiOperation({ summary: '商机详情' })
  async getOpportunity(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.crm.findOneOpportunity(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Patch('opportunities/:id')
  @ApiOperation({ summary: '更新商机' })
  async patchOpportunity(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOpportunityDto,
  ) {
    return this.crm.updateOpportunity(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_DELETE)
  @Delete('opportunities/:id')
  @ApiOperation({ summary: '删除商机（软删除）' })
  async deleteOpportunity(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.crm.removeOpportunity(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post('opportunities/import')
  @ApiOperation({
    summary:
      'Excel/CSV 导入商机（与导出列对齐；mode=skip 跳过重复，mode=force 强制写入）',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async importOpportunities(
    @Req() req: Express.Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('mode') modeRaw?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传表格文件（xlsx / xls / csv）');
    }
    const mode = modeRaw === 'force' ? 'force' : 'skip';
    return this.crm.importOpportunitiesFromSpreadsheet(
      enterpriseIdFromRequest(req),
      file.buffer,
      mode,
    );
  }

  // ─── Customer Categories ────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('categories')
  @ApiOperation({ summary: '客户分类列表' })
  async listCategories(
    @Req() req: Express.Request,
    @Query() query: CustomerCategoryListQueryDto,
  ) {
    return this.crm.findCategories({
      enterpriseId: enterpriseIdFromRequest(req),
      type: query.type,
    });
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post('categories')
  @ApiOperation({ summary: '创建客户分类' })
  async createCategory(
    @Req() req: Express.Request,
    @Body() body: CreateCustomerCategoryDto,
  ) {
    return this.crm.createCategory(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('categories/:id')
  @ApiOperation({ summary: '客户分类详情' })
  async getCategory(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.crm.findOneCategory(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Patch('categories/:id')
  @ApiOperation({ summary: '更新客户分类' })
  async patchCategory(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCustomerCategoryDto,
  ) {
    return this.crm.updateCategory(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_DELETE)
  @Delete('categories/:id')
  @ApiOperation({ summary: '删除客户分类' })
  async deleteCategory(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.crm.removeCategory(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post('categories/import')
  @ApiOperation({
    summary:
      'Excel/CSV 导入客户分类（与导出列对齐；mode=skip 跳过重复，mode=force 强制写入）',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async importCategories(
    @Req() req: Express.Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('mode') modeRaw?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传表格文件（xlsx / xls / csv）');
    }
    const mode = modeRaw === 'force' ? 'force' : 'skip';
    return this.crm.importCategoriesFromSpreadsheet(
      enterpriseIdFromRequest(req),
      file.buffer,
      mode,
    );
  }

  // ─── Customer Category Relations ────────────────────────────────

  @ApiBearerAuth()
  @Get('customers/:id/categories')
  @ApiOperation({ summary: '获取客户的分类列表' })
  async getCustomerCategories(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.crm.getCustomerCategories(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Post('customers/:id/categories/:categoryId')
  @ApiOperation({ summary: '将客户分配到分类' })
  async assignCustomerToCategory(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.crm.assignCustomerToCategory(
      id,
      categoryId,
      enterpriseIdFromRequest(req),
    );
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Delete('customers/:id/categories/:categoryId')
  @ApiOperation({ summary: '从分类中移除客户' })
  async removeCustomerFromCategory(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.crm.removeCustomerFromCategory(
      id,
      categoryId,
      enterpriseIdFromRequest(req),
    );
  }
}
