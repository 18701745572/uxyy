import {
  Body,
  Controller,
  Delete,
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
  enterpriseId: number;
  role?: string;
}

@Controller('oa/leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestController {
  constructor(private readonly service: LeaveRequestService) {}

  @Post()
  create(@Body() dto: CreateLeaveRequestDto, @Req() req: Request & { user: UserContext }) {
    return this.service.create(req.user.enterpriseId, req.user.userId, dto);
  }

  @Get()
  findAll(@Query() query: LeaveRequestQueryDto, @Req() req: Request & { user: UserContext }) {
    return this.service.findAll(req.user.enterpriseId, query);
  }

  @Get('my')
  findMyLeaves(@Req() req: Request & { user: UserContext }) {
    return this.service.findMyLeaves(req.user.userId, req.user.enterpriseId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: UserContext }) {
    return this.service.findById(id, req.user.enterpriseId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeaveRequestDto,
    @Req() req: Request & { user: UserContext }
  ) {
    return this.service.update(id, req.user.enterpriseId, req.user.userId, dto);
  }

  @Delete(':id')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: UserContext }) {
    return this.service.cancel(id, req.user.enterpriseId, req.user.userId);
  }
}
