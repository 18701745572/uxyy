import { ApiProperty } from '@nestjs/swagger';

export class EnterpriseBriefDto {
  @ApiProperty({ example: 1 })
  enterpriseId!: number;

  @ApiProperty({ example: '某某商贸有限公司' })
  name!: string;

  @ApiProperty({ example: 'boss' })
  role!: string;

  @ApiProperty({ example: true })
  isDefault!: boolean;
}

export class LoginResponseDto {
  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({ example: '张三' })
  nickname!: string;

  @ApiProperty({ type: [EnterpriseBriefDto] })
  enterprises!: EnterpriseBriefDto[];

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken!: string;

  @ApiProperty({ example: 7200 })
  expiresIn!: number;
}
