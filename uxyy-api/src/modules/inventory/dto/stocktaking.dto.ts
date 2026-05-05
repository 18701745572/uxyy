import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from './common.dto';

export class StocktakingListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'draft | confirmed' })
  @IsOptional()
  @IsIn(['draft', 'confirmed'])
  status?: string;
}

export class CreateStocktakingDto {
  @ApiPropertyOptional({ description: '仓库ID，默认1' })
  @IsOptional()
  @IsInt()
  warehouseId?: number;

  @ApiPropertyOptional({
    description: '指定盘点商品ID列表，为空则盘点全部商品',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  productIds?: number[];

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateStocktakingItemDto {
  @ApiProperty({ description: '实盘数量' })
  @IsNumber()
  @Min(0)
  actualQty: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
