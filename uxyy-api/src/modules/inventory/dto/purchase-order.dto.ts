import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './common.dto';

export class PurchaseOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['draft', 'pending', 'approved', 'completed', 'cancelled'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'pending', 'approved', 'completed', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: '开始日期 (ISO)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (ISO)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: '按供应商筛选' })
  @IsOptional()
  @IsInt()
  @Min(1)
  supplierId?: number;
}

class PurchaseOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId!: number;

  @ApiProperty({ example: '100' })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: '8.50' })
  @IsNumber()
  unitPrice!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  supplierId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}

export class ApprovePurchaseOrderDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsString()
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

class InboundItemDto {
  @ApiProperty({ example: 1, description: '采购明细ID' })
  @IsInt()
  itemId!: number;

  @ApiProperty({ example: '100', description: '本次入库数量' })
  @IsNumber()
  inboundQty!: number;
}

export class InboundDto {
  @ApiProperty({ type: [InboundItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InboundItemDto)
  items!: InboundItemDto[];
}

export class PurchaseOrderItemResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  orderId!: number;

  @ApiProperty()
  productId!: number;

  @ApiProperty()
  quantity!: string;

  @ApiProperty()
  unitPrice!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  receivedQty!: string;
}

export class PurchaseOrderResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  supplierId!: number;

  @ApiProperty()
  orderNo!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  remark!: string | null;

  @ApiProperty()
  createdBy!: number;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cancelledAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [PurchaseOrderItemResponseDto] })
  items!: PurchaseOrderItemResponseDto[];
}

export class PurchaseOrderListResponseDto {
  @ApiProperty({ type: [PurchaseOrderResponseDto] })
  items!: PurchaseOrderResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
