import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Express } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { requireJwtUserId } from '../../common/utils/jwt-request-context';
import { InvitationAcceptDto } from './dto/invitations.dto';
import { EnterpriseInvitationsService } from './enterprise-invitations.service';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: EnterpriseInvitationsService) {}

  @Public()
  @Get('preview')
  @ApiOperation({ summary: '邀请预览（脱敏）；用于 /join?t=…' })
  preview(@Query('t') token: string) {
    return this.invitations.preview(token);
  }

  @ApiBearerAuth()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '已登录接受邀请并入会（JWT 手机号须与邀请一致）' })
  async accept(@Req() req: Express.Request, @Body() dto: InvitationAcceptDto) {
    const uid = requireJwtUserId(req);
    return this.invitations.acceptInvitation(uid, dto.invitationToken);
  }
}
