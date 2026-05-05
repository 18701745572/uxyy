import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './common.dto';

export class InventoryListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按分类筛选' })
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ description: '名称/编码搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '仅显示低库存预警' })
  @IsOptional()
  lowStock?: boolean;
}

export class AdjustInventoryDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId!: number;

  @ApiProperty({ example: '10' })
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional({ example: '盘点调整' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventoryResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  productId!: number;

  @ApiProperty({ description: '商品名称' })
  productName!: string;

  @ApiProperty({ description: '商品编码' })
  productCode!: string;

  @ApiProperty({ description: '规格' })
  productSpec!: string | null;

  @ApiProperty({ description: '单位' })
  productUnit!: string | null;

  @ApiProperty({ description: '分类名称' })
  categoryName!: string | null;

  @ApiProperty({ description: '当前库存量' })
  quantity!: string;

  @ApiProperty({ description: '库存下限' })
  minStock!: string | null;

  @ApiProperty({ description: '库存上限' })
  maxStock!: string | null;

  @ApiProperty({ description: '是否低于库存下限' })
  lowStockAlert!: boolean;

  @ApiProperty()
  warehouseId!: number;

  @ApiPropertyOptional({ nullable: true })
  batchNo!: string | null;

  @ApiPropertyOptional({ nullable: true })
  expiryDate!: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class InventoryListResponseDto {
  @ApiProperty({ type: [InventoryResponseDto] })
  items!: InventoryResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class InventoryLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按商品筛选' })
  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({ enum: ['in', 'out', 'adjust'] })
  @IsOptional()
  @IsString()
  @IsIn(['in', 'out', 'adjust'])
  type?: string;

  @ApiPropertyOptional({ description: '开始日期 (ISO)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (ISO)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['sales_order', 'purchase_order', 'adjust'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['sales_order', 'purchase_order', 'adjust'])
  sourceType?: string;
}

export class InventoryLogResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  productId!: number;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  quantity!: string;

  @ApiProperty()
  beforeQty!: string;

  @ApiProperty()
  afterQty!: string;

  @ApiPropertyOptional({ nullable: true })
  sourceType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sourceId!: number | null;

  @ApiPropertyOptional({ nullable: true })
  productName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdBy!: number | null;

  @ApiProperty()
  createdAt!: string;
}

export class InventoryLogListResponseDto {
  @ApiProperty({ type: [InventoryLogResponseDto] })
  items!: InventoryLogResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class StockAlertResponseDto {
  @ApiProperty({ type: [InventoryResponseDto] })
  items!: InventoryResponseDto[];

  @ApiProperty()
  alertCount!: number;
}
