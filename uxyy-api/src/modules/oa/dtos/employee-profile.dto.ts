import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEmployeeProfileDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  department?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  position?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  employeeNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  email?: string;

  @IsDateString()
  @IsOptional()
  joinDate?: string;
}

export class UpdateEmployeeProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  employeeNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsDateString()
  joinDate?: string;
}

export class EmployeeProfileQueryDto {
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
