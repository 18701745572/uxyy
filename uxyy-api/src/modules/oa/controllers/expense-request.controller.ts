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
import { ExpenseRequestService } from '../services/expense-request.service';
import {
  CreateExpenseRequestDto,
  UpdateExpenseRequestDto,
  ExpenseRequestQueryDto,
} from '../dtos/expense-request.dto';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('oa/expense-requests')
@UseGuards(JwtAuthGuard)
export class ExpenseRequestController {
  constructor(private readonly service: ExpenseRequestService) {}

  @Post()
  create(@Body() dto: CreateExpenseRequestDto, @Req() req: Request & { user: UserContext }) {
    return this.service.create(req.user.enterpriseId, req.user.userId, dto);
  }

  @Get()
  findAll(@Query() query: ExpenseRequestQueryDto, @Req() req: Request & { user: UserContext }) {
    return this.service.findAll(req.user.enterpriseId, query);
  }

  @Get('my')
  findMyExpenses(@Req() req: Request & { user: UserContext }) {
    return this.service.findMyExpenses(req.user.userId, req.user.enterpriseId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: UserContext }) {
    return this.service.findById(id, req.user.enterpriseId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseRequestDto,
    @Req() req: Request & { user: UserContext }
  ) {
    return this.service.update(id, req.user.enterpriseId, req.user.userId, dto);
  }

  @Delete(':id')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: UserContext }) {
    return this.service.cancel(id, req.user.enterpriseId, req.user.userId);
  }
}
