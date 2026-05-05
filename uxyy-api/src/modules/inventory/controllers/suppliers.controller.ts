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
import { SuppliersService } from '../services/suppliers.service';
import {
  CreateSupplierDto,
  SupplierListQueryDto,
  SupplierListResponseDto,
  SupplierResponseDto,
  UpdateSupplierDto,
} from '../dto/supplier.dto';

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

@ApiTags('inventory')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: '未登录或未绑定企业上下文' })
  @Get()
  @ApiOperation({ summary: '供应商分页列表' })
  async list(
    @Req() req: Express.Request,
    @Query() query: SupplierListQueryDto,
  ): Promise<SupplierListResponseDto> {
    return this.service.findPage({
      enterpriseId: enterpriseIdFromRequest(req),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: '创建供应商' })
  async create(
    @Req() req: Express.Request,
    @Body() body: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.service.create(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: '供应商详情' })
  async get(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SupplierResponseDto> {
    return this.service.findOne(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: '更新供应商' })
  async patch(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.service.update(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: '删除供应商' })
  async remove(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(id, enterpriseIdFromRequest(req));
  }
}
