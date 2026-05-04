import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import type { RegisterDto, RefreshTokenDto, ResetPasswordDto } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '登录',
  })
  login(@Body() dto: { phone: string; password: string }) {
    return this.auth.login(dto.phone, dto.password);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '注册',
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新 Token',
  })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshToken(dto.refresh_token);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '重置密码',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  profile(@Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.auth.getProfile(userId);
  }

  @ApiBearerAuth()
  @Put('switch-enterprise/:id')
  @ApiOperation({ summary: '切换默认企业' })
  switchEnterprise(@Req() req: Request, @Param('id') enterpriseId: string) {
    const userId = (req as any).user?.userId;
    return this.auth.switchEnterprise(userId, parseInt(enterpriseId, 10));
  }
}
