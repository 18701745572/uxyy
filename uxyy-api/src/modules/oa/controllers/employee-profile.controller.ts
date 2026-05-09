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
import { EmployeeProfileService } from '../services/employee-profile.service';
import {
  CreateEmployeeProfileDto,
  UpdateEmployeeProfileDto,
  EmployeeProfileQueryDto,
} from '../dtos/employee-profile.dto';

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

@Controller('oa/employee-profiles')
@UseGuards(JwtAuthGuard)
export class EmployeeProfileController {
  constructor(private readonly service: EmployeeProfileService) {}

  @Post()
  create(
    @Body() dto: CreateEmployeeProfileDto,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.create(eid, dto);
  }

  @Get()
  findAll(
    @Query() query: EmployeeProfileQueryDto,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.findAll(eid, query);
  }

  @Get('departments')
  getDepartments(@Req() req: Request & { user: UserContext }) {
    const eid = requireEnterprise(req);
    return this.service.getDepartments(eid);
  }

  @Get('my')
  findMyProfile(@Req() req: Request & { user: UserContext }) {
    const eid = requireEnterprise(req);
    return this.service.findByUserId(req.user.userId, eid);
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
    @Body() dto: UpdateEmployeeProfileDto,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.update(id, eid, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.delete(id, eid);
  }
}
