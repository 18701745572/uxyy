import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LeaveRequestService } from '../services/leave-request.service';
import {
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryDto,
} from '../dtos/leave-request.dto';

interface UserContext {
  userId: number;
  enterpriseId?: number;
  role?: string;
}

function requireEnterprise(req: Request & { user: UserContext }): number {
  const e = req.user.enterpriseId;
  if (e == null || Number.isNaN(Number(e))) {
    throw new ForbiddenException('当前会话未绑定企业');
  }
  return e;
}

@Controller('oa/leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestController {
  constructor(private readonly service: LeaveRequestService) {}

  @Post()
  create(
    @Body() dto: CreateLeaveRequestDto,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.create(eid, req.user.userId, dto);
  }

  @Get()
  findAll(
    @Query() query: LeaveRequestQueryDto,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.findAll(eid, query);
  }

  @Get('my')
  findMyLeaves(@Req() req: Request & { user: UserContext }) {
    const eid = requireEnterprise(req);
    return this.service.findMyLeaves(req.user.userId, eid);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.findById(id, eid);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeaveRequestDto,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.update(id, eid, req.user.userId, dto);
  }

  @Delete(':id')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.cancel(id, eid, req.user.userId);
  }
}
