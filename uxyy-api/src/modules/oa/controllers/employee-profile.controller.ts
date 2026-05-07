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
import { EmployeeProfileService } from '../services/employee-profile.service';
import {
  CreateEmployeeProfileDto,
  UpdateEmployeeProfileDto,
  EmployeeProfileQueryDto,
} from '../dtos/employee-profile.dto';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('oa/employee-profiles')
@UseGuards(JwtAuthGuard)
export class EmployeeProfileController {
  constructor(private readonly service: EmployeeProfileService) {}

  @Post()
  create(@Body() dto: CreateEmployeeProfileDto, @Req() req: Request & { user: UserContext }) {
    return this.service.create(req.user.enterpriseId, dto);
  }

  @Get()
  findAll(@Query() query: EmployeeProfileQueryDto, @Req() req: Request & { user: UserContext }) {
    return this.service.findAll(req.user.enterpriseId, query);
  }

  @Get('departments')
  getDepartments(@Req() req: Request & { user: UserContext }) {
    return this.service.getDepartments(req.user.enterpriseId);
  }

  @Get('my')
  findMyProfile(@Req() req: Request & { user: UserContext }) {
    return this.service.findByUserId(req.user.userId, req.user.enterpriseId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: UserContext }) {
    return this.service.findById(id, req.user.enterpriseId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeProfileDto,
    @Req() req: Request & { user: UserContext }
  ) {
    return this.service.update(id, req.user.enterpriseId, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: UserContext }) {
    return this.service.delete(id, req.user.enterpriseId);
  }
}
