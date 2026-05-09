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
import { ExpenseRequestService } from '../services/expense-request.service';
import {
  CreateExpenseRequestDto,
  UpdateExpenseRequestDto,
  ExpenseRequestQueryDto,
} from '../dtos/expense-request.dto';

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

@Controller('oa/expense-requests')
@UseGuards(JwtAuthGuard)
export class ExpenseRequestController {
  constructor(private readonly service: ExpenseRequestService) {}

  @Post()
  create(
    @Body() dto: CreateExpenseRequestDto,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.create(eid, req.user.userId, dto);
  }

  @Get()
  findAll(
    @Query() query: ExpenseRequestQueryDto,
    @Req() req: Request & { user: UserContext },
  ) {
    const eid = requireEnterprise(req);
    return this.service.findAll(eid, query);
  }

  @Get('my')
  findMyExpenses(@Req() req: Request & { user: UserContext }) {
    const eid = requireEnterprise(req);
    return this.service.findMyExpenses(req.user.userId, eid);
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
    @Body() dto: UpdateExpenseRequestDto,
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
