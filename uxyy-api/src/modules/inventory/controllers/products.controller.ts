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
import { ProductsService } from '../services/products.service';
import {
  CategoryListResponseDto,
  CategoryResponseDto,
  CreateCategoryDto,
  CreateProductDto,
  ProductListQueryDto,
  ProductListResponseDto,
  ProductResponseDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from '../dto/product.dto';

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

@ApiTags('inventory')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: '未登录或未绑定企业上下文' })
  @Get()
  @ApiOperation({ summary: '商品分页列表' })
  async list(
    @Req() req: Express.Request,
    @Query() query: ProductListQueryDto,
  ): Promise<ProductListResponseDto> {
    return this.service.findPage({
      enterpriseId: enterpriseIdFromRequest(req),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      categoryId: query.categoryId,
      keyword: query.keyword,
    });
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: '创建商品' })
  async create(
    @Req() req: Express.Request,
    @Body() body: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.service.create(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: '商品详情（含当前库存）' })
  async get(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductResponseDto> {
    return this.service.findOne(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: '更新商品' })
  async patch(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.service.update(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: '删除商品' })
  async remove(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Get('categories')
  @ApiOperation({ summary: '商品分类树' })
  async listCategories(
    @Req() req: Express.Request,
  ): Promise<CategoryListResponseDto> {
    return this.service.findCategories(enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post('categories')
  @ApiOperation({ summary: '创建分类' })
  async createCategory(
    @Req() req: Express.Request,
    @Body() body: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.service.createCategory(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Patch('categories/:id')
  @ApiOperation({ summary: '更新分类' })
  async patchCategory(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.service.updateCategory(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Delete('categories/:id')
  @ApiOperation({ summary: '删除分类' })
  async removeCategory(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.removeCategory(id, enterpriseIdFromRequest(req));
  }
}
