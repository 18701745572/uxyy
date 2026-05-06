import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AI_TASK_TYPES } from './ai.constants';

export class SubmitTaskDto {
  @ApiProperty({
    enum: AI_TASK_TYPES,
    description: '任务类型',
    example: 'accounting_suggestion',
  })
  @IsEnum(AI_TASK_TYPES)
  taskType!: string;

  @ApiPropertyOptional({
    description: '幂等键（同一 enterprise 下同类型 + 同 key 不会重复创建）',
    maxLength: 255,
    example: 'invoice-img-abc123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  clientKey?: string;

  @ApiProperty({
    description: '任务入参（由 taskType 决定具体结构）',
    example: { imageUrl: 'https://example.com/invoice.png' },
  })
  @IsObject()
  payload!: Record<string, unknown>;
}

/** 人工核对后写入凭证：字段均可选，未传则使用 AI outputPayload 自动解析结果 */
export class ApplyVoucherFromAiTaskDto {
  @ApiPropertyOptional({ example: '银行存款' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  debitAccount?: string;

  @ApiPropertyOptional({ example: '应收账款' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  creditAccount?: string;

  @ApiPropertyOptional({ example: '50000.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount?: string;

  @ApiPropertyOptional({ example: '收客户货款' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  entryDate?: string;
}

export class AiTaskResponse {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'accounting_suggestion' })
  taskType!: string;

  @ApiProperty({ example: 'pending' })
  status!: string;

  @ApiPropertyOptional({ example: 'invoice-img-abc123' })
  clientKey?: string | null;

  @ApiPropertyOptional()
  inputPayload?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  outputPayload?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  errorMessage?: string | null;

  @ApiProperty({ example: 0 })
  attempts!: number;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  updatedAt!: string;
}

export class ApplyAiTaskVoucherResponse {
  @ApiProperty({
    description: '是否本次新建（false 表示此前已写入过，本次返回已有凭证）',
  })
  created!: boolean;

  @ApiProperty({ description: '财务凭证（与 /finance/vouchers 一致）' })
  voucher!: Record<string, unknown>;
}

export class QueueStatsResponse {
  @ApiProperty({ example: 'ai-default' })
  queue!: string;

  @ApiProperty({
    example: { waiting: 0, active: 1, completed: 10, failed: 2, delayed: 0 },
  })
  counts!: Record<string, number>;

  @ApiProperty({ example: 'ai-default-dlq' })
  dlqQueue!: string;

  @ApiProperty({
    example: { waiting: 1, active: 0, completed: 5, failed: 0, delayed: 0 },
  })
  dlqCounts!: Record<string, number>;
}
