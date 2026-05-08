import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum StockAlertType {
  LOW = 'low',
  HIGH = 'high',
  /** 效期仍在窗口内但已过期前临界 / 临期（与 expiry_expired 区分见 severity） */
  EXPIRY_WARN = 'expiry_warn',
  /** 已过期且仍有结存 */
  EXPIRY_EXPIRED = 'expiry_expired',
}

export enum StockAlertStatus {
  PENDING = 'pending',
  READ = 'read',
  RESOLVED = 'resolved',
}

export class StockAlertListQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: '预警类型（含效期类）' })
  @IsOptional()
  @IsEnum(StockAlertType)
  type?: StockAlertType;

  @ApiPropertyOptional({
    description: '状态: pending-待处理, read-已读, resolved-已解决',
  })
  @IsOptional()
  @IsEnum(StockAlertStatus)
  status?: StockAlertStatus;

  @ApiPropertyOptional({ description: '商品ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;
}

export class CreateStockAlertDto {
  @ApiProperty({ description: '商品ID' })
  @IsInt()
  @Type(() => Number)
  productId: number;

  @ApiProperty({
    description:
      '预警类型: low / high / expiry_warn（临期）/ expiry_expired（已过期有结存）',
    enum: StockAlertType,
  })
  @IsEnum(StockAlertType)
  type: StockAlertType;

  @ApiProperty({ description: '当前库存' })
  @IsNumber()
  @Type(() => Number)
  currentStock: number;

  @ApiProperty({ description: '阈值' })
  @IsNumber()
  @Type(() => Number)
  threshold: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateStockAlertDto {
  @ApiPropertyOptional({
    description: '状态: pending-待处理, read-已读, resolved-已解决',
    enum: StockAlertStatus,
  })
  @IsOptional()
  @IsEnum(StockAlertStatus)
  status?: StockAlertStatus;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class StockAlertResponseDto {
  @ApiProperty({ description: '预警ID' })
  id: number;

  @ApiProperty({ description: '企业ID' })
  enterpriseId: number;

  @ApiProperty({ description: '商品ID' })
  productId: number;

  @ApiProperty({ description: '商品名称' })
  productName: string;

  @ApiProperty({ description: '商品编码' })
  productCode: string;

  @ApiProperty({ description: '预警类型' })
  type: string;

  @ApiProperty({ description: '当前库存' })
  currentStock: number;

  @ApiProperty({ description: '阈值' })
  threshold: number;

  @ApiProperty({
    description: '状态: pending-待处理, read-已读, resolved-已解决',
  })
  status: string;

  @ApiPropertyOptional({ description: '备注' })
  remark?: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt: string;
}

export class StockAlertListResponseDto {
  @ApiProperty({ description: '预警列表', type: [StockAlertResponseDto] })
  items: StockAlertResponseDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;
}

export class StockAlertStatsDto {
  @ApiProperty({ description: '待处理预警数量' })
  pendingCount: number;

  @ApiProperty({ description: '今日新增预警数量' })
  todayCount: number;

  @ApiProperty({ description: '低于下限预警数量' })
  lowCount: number;

  @ApiProperty({ description: '高于上限预警数量' })
  highCount: number;

  @ApiProperty({ description: '临期（未过期）效期预警记录数' })
  expiryWarnCount: number;

  @ApiProperty({ description: '已过期仍有结存的效期预警记录数' })
  expiryExpiredCount: number;
}
