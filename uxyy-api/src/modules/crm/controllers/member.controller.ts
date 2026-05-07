import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MemberService, type CreateMemberLevelDto, type CreateCustomerMemberDto, type PointsOperationDto } from '../services/member.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('crm/members')
@UseGuards(JwtAuthGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  // ==================== 会员等级管理 ====================

  @Get('levels')
  findAllLevels(@Req() req: Request & { user: UserContext }) {
    return this.memberService.findAllLevels(req.user.enterpriseId);
  }

  @Get('levels/:id')
  findLevelById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberService.findLevelById(id, req.user.enterpriseId);
  }

  @Post('levels')
  createLevel(
    @Req() req: Request & { user: UserContext },
    @Body() dto: CreateMemberLevelDto,
  ) {
    return this.memberService.createLevel(req.user.enterpriseId, dto);
  }

  @Put('levels/:id')
  updateLevel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body() dto: Partial<CreateMemberLevelDto>,
  ) {
    return this.memberService.updateLevel(id, req.user.enterpriseId, dto);
  }

  @Delete('levels/:id')
  deleteLevel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberService.deleteLevel(id, req.user.enterpriseId);
  }

  // ==================== 会员管理 ====================

  @Get()
  findAllMembers(
    @Req() req: Request & { user: UserContext },
    @Query('levelId', new ParseIntPipe({ optional: true })) levelId?: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.memberService.findAllMembers(req.user.enterpriseId, { levelId, keyword });
  }

  @Get('customer/:customerId')
  findMemberByCustomerId(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberService.findMemberByCustomerId(customerId, req.user.enterpriseId);
  }

  @Post()
  createMember(
    @Req() req: Request & { user: UserContext },
    @Body() dto: CreateCustomerMemberDto,
  ) {
    return this.memberService.createMember(req.user.enterpriseId, dto);
  }

  @Put('customer/:customerId')
  updateMember(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
    @Body() dto: Partial<CreateCustomerMemberDto>,
  ) {
    return this.memberService.updateMember(customerId, req.user.enterpriseId, dto);
  }

  @Delete('customer/:customerId')
  deleteMember(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberService.deleteMember(customerId, req.user.enterpriseId);
  }

  // ==================== 积分管理 ====================

  @Post('points/add')
  addPoints(
    @Req() req: Request & { user: UserContext },
    @Body() dto: PointsOperationDto,
  ) {
    return this.memberService.addPoints(req.user.enterpriseId, {
      ...dto,
      createdBy: req.user.userId,
    });
  }

  @Get('points/records/:customerId')
  getPointsRecords(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
    @Query('type') type?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.memberService.getPointsRecords(customerId, req.user.enterpriseId, { type, limit });
  }
}
