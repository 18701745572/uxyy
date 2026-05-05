import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class SwitchEnterpriseDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  enterpriseId!: number;
}
