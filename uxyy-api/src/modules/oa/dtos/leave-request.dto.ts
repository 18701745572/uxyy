import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDecimal,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  type: string; // 事假、病假、年假

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsNumberString()
  @IsNotEmpty()
  days: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  type?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumberString()
  days?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class LeaveRequestQueryDto {
  @IsOptional()
  @IsString()
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
