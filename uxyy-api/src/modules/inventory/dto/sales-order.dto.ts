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

export class SalesOrderQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ description: '按客户筛选' })
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;
}

class SalesOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId!: number;

  @ApiProperty({ example: '10' })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: '99.99' })
  @IsNumber()
  unitPrice!: number;
}

export class CreateSalesOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  customerId!: number;

  @ApiPropertyOptional({ example: 'self', default: 'self' })
  @IsOptional()
  @IsString()
  @IsIn(['self', 'delivery'])
  deliveryType?: string;

  @ApiPropertyOptional({ example: '客户自提' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ type: [SalesOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items!: SalesOrderItemDto[];
}

export class UpdateSalesOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['self', 'delivery'])
  deliveryType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}

export class ApproveOrderDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsString()
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @ApiPropertyOptional({ example: '同意出库' })
  @IsOptional()
  @IsString()
  comment?: string;
}

class OutboundItemDto {
  @ApiProperty({ example: 1, description: '订单明细ID' })
  @IsInt()
  itemId!: number;

  @ApiProperty({ example: '10', description: '本次出库数量' })
  @IsNumber()
  outboundQty!: number;
}

export class OutboundDto {
  @ApiProperty({ type: [OutboundItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutboundItemDto)
  items!: OutboundItemDto[];
}

export class SalesOrderItemResponseDto {
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
  deliveredQty!: string;
}

export class SalesOrderResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  customerId!: number;

  @ApiProperty()
  orderNo!: string;

  @ApiProperty()
  totalAmount!: string;

  @ApiProperty()
  discountAmount!: string;

  @ApiProperty()
  payableAmount!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  deliveryType!: string;

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

  @ApiProperty({ type: [SalesOrderItemResponseDto] })
  items!: SalesOrderItemResponseDto[];
}

export class SalesOrderListResponseDto {
  @ApiProperty({ type: [SalesOrderResponseDto] })
  items!: SalesOrderResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
